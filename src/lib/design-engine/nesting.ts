import type { CutlistRow } from "./cutlist";

export interface SheetSize {
  widthM: number;
  heightM: number;
}

export interface NestingPlacement {
  cutlistId: string;
  sheetIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface NestingResult {
  sheetCount: number;
  placements: NestingPlacement[];
  usedAreaSqm: number;
  totalSheetAreaSqm: number;
  wastePct: number;
  unplaced: { cutlistId: string; width: number; height: number }[];
}

/** A free (still-cuttable) rectangle on a sheet, in meters from its bottom-left corner. */
interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const EPS = 1e-6;

function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Splits `free` after placing a `placedWidth`×`placedHeight` piece in its bottom-left
 * corner, using the "shorter leftover axis" guillotine rule: whichever leftover strip
 * (the vertical sliver to the right, or the horizontal strip above) is narrower gets cut
 * off first as its own free rectangle, leaving the other leftover as one large piece
 * instead of two mediocre ones — this is what keeps guillotine packing (real panel-saw
 * cuts, unlike arbitrary L-shaped nesting) close to the waste a non-guillotine packer
 * would get. */
function splitFreeRect(free: FreeRect, placedWidth: number, placedHeight: number): FreeRect[] {
  const leftoverW = free.width - placedWidth;
  const leftoverH = free.height - placedHeight;
  const result: FreeRect[] = [];

  if (leftoverW <= leftoverH) {
    if (leftoverW > EPS) {
      result.push({ x: free.x + placedWidth, y: free.y, width: leftoverW, height: placedHeight });
    }
    if (leftoverH > EPS) {
      result.push({ x: free.x, y: free.y + placedHeight, width: free.width, height: leftoverH });
    }
  } else {
    if (leftoverH > EPS) {
      result.push({ x: free.x, y: free.y + placedHeight, width: placedWidth, height: leftoverH });
    }
    if (leftoverW > EPS) {
      result.push({ x: free.x + placedWidth, y: free.y, width: leftoverW, height: free.height });
    }
  }

  return result;
}

interface BestPlacement {
  sheetIndex: number;
  freeIndex: number;
  width: number;
  height: number;
  rotated: boolean;
}

/** Best Short Side Fit: among every free rectangle on every open sheet (and both
 * orientations, if rotation is allowed), pick the one that leaves the smallest leftover
 * on its tighter side — a well-established heuristic (Jylänki, "A Thousand Ways to Pack
 * the Bin") that keeps large usable rectangles intact for later, bigger pieces instead of
 * scattering them into narrow offcuts. */
function findBestPlacement(freeRectsPerSheet: FreeRect[][], width: number, height: number): BestPlacement | null {
  let best: (BestPlacement & { score: number }) | null = null;

  for (let sheetIndex = 0; sheetIndex < freeRectsPerSheet.length; sheetIndex += 1) {
    const frees = freeRectsPerSheet[sheetIndex];
    for (let freeIndex = 0; freeIndex < frees.length; freeIndex += 1) {
      const free = frees[freeIndex];
      const orientations: [number, number, boolean][] = [
        [width, height, false],
        [height, width, true],
      ];
      for (const [w, h, rotated] of orientations) {
        if (w > free.width + EPS || h > free.height + EPS) continue;
        const score = Math.min(free.width - w, free.height - h);
        if (!best || score < best.score - EPS) {
          best = { sheetIndex, freeIndex, width: w, height: h, rotated, score };
        }
      }
    }
  }

  return best;
}

type Rect = { cutlistId: string; width: number; height: number };

/** Placement orders worth trying — which piece a guillotine packer seats first can change
 * how many sheets the whole batch needs, so instead of committing to one heuristic, every
 * run below is tried and the one that opens the fewest sheets (ties broken by lower waste)
 * wins. This costs nothing but a few more passes over a cutlist that's at most a few dozen
 * pieces long, and it's what closes the gap between "a reasonable packer" and one that
 * reliably lands within a few points of the true rounding-to-whole-sheets floor. */
const SORT_ORDERS: { name: string; compare: (a: Rect, b: Rect) => number }[] = [
  { name: "area-desc", compare: (a, b) => b.width * b.height - a.width * a.height },
  { name: "long-side-desc", compare: (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height) },
  { name: "height-desc", compare: (a, b) => b.height - a.height || b.width - a.width },
  { name: "width-desc", compare: (a, b) => b.width - a.width || b.height - a.height },
];

/** Runs the guillotine packer once, for pieces already given in the order to place them. */
function packInOrder(rects: Rect[], sheet: SheetSize, kerfM: number): NestingResult {
  const freeRectsPerSheet: FreeRect[][] = [];
  const placements: NestingPlacement[] = [];
  const unplaced: { cutlistId: string; width: number; height: number }[] = [];

  const fitsSheetInEitherOrientation = (w: number, h: number) =>
    (w <= sheet.widthM + EPS && h <= sheet.heightM + EPS) || (h <= sheet.widthM + EPS && w <= sheet.heightM + EPS);

  for (const rect of rects) {
    // The kerf (saw blade width) is folded into the piece's occupied footprint so the
    // free-rectangle bookkeeping automatically leaves blade clearance on every cut,
    // without placements themselves reporting an inflated size.
    const occupiedWidth = rect.width + kerfM;
    const occupiedHeight = rect.height + kerfM;

    if (!fitsSheetInEitherOrientation(occupiedWidth, occupiedHeight)) {
      unplaced.push(rect);
      continue;
    }

    let best = findBestPlacement(freeRectsPerSheet, occupiedWidth, occupiedHeight);
    if (!best) {
      freeRectsPerSheet.push([{ x: 0, y: 0, width: sheet.widthM, height: sheet.heightM }]);
      best = findBestPlacement(freeRectsPerSheet, occupiedWidth, occupiedHeight);
    }
    if (!best) {
      unplaced.push(rect);
      continue;
    }

    const { sheetIndex, freeIndex, width: placedWidth, height: placedHeight, rotated } = best;
    const chosen = freeRectsPerSheet[sheetIndex][freeIndex];

    placements.push({
      cutlistId: rect.cutlistId,
      sheetIndex,
      x: round(chosen.x),
      y: round(chosen.y),
      width: round(rotated ? rect.height : rect.width),
      height: round(rotated ? rect.width : rect.height),
      rotated,
    });

    const remainder = splitFreeRect(chosen, placedWidth, placedHeight);
    freeRectsPerSheet[sheetIndex].splice(freeIndex, 1, ...remainder);
  }

  const usedAreaSqm = placements.reduce((sum, p) => sum + p.width * p.height, 0);
  const totalSheetAreaSqm = freeRectsPerSheet.length * sheet.widthM * sheet.heightM;
  const wastePct = totalSheetAreaSqm > 0 ? round(((totalSheetAreaSqm - usedAreaSqm) / totalSheetAreaSqm) * 100, 1) : 0;

  return {
    sheetCount: freeRectsPerSheet.length,
    placements,
    usedAreaSqm: round(usedAreaSqm),
    totalSheetAreaSqm: round(totalSheetAreaSqm),
    wastePct,
    unplaced,
  };
}

interface Shelf {
  sheetIndex: number;
  y: number;
  height: number;
  usedWidth: number;
}

type ShelfCandidate =
  | { kind: "reuse"; shelfIndex: number; width: number; height: number; rotated: boolean; waste: number }
  | { kind: "new"; sheetIndex: number; y: number; width: number; height: number; rotated: boolean; waste: number };

/**
 * Shelf Best-Fit Decreasing Height packer: groups pieces into horizontal "shelves" (rows)
 * spanning a sheet's width — the shape real cutlists often take when several boards share
 * a height (a column's side panels, back and door are all cut to that column's own
 * height), which a guillotine cut doesn't specially recognize since it only ever splits
 * off the smaller of two leftover strips, not "keep everything this tall together."
 *
 * For each piece, every already-open shelf it fits AND the option of opening a brand-new
 * shelf sized exactly to it (in any open sheet's remaining height) compete on equal
 * footing, scored by vertical waste — a perfectly fitted new shelf (waste 0) only loses to
 * an existing shelf of the exact same height, never to one merely tall enough. Without
 * that, a "reuse before opening new" rule would cram a short piece into a much taller
 * existing shelf just because it fits, instead of opening a new shelf in another sheet's
 * unused headroom — silently stranding that headroom as waste for the rest of the run.
 */
function packShelfInOrder(rects: Rect[], sheet: SheetSize, kerfM: number): NestingResult {
  const shelves: Shelf[] = [];
  const sheetHeightUsed: number[] = [];
  const placements: NestingPlacement[] = [];
  const unplaced: { cutlistId: string; width: number; height: number }[] = [];

  const fitsSheetInEitherOrientation = (w: number, h: number) =>
    (w <= sheet.widthM + EPS && h <= sheet.heightM + EPS) || (h <= sheet.widthM + EPS && w <= sheet.heightM + EPS);

  for (const rect of rects) {
    const occupiedWidth = rect.width + kerfM;
    const occupiedHeight = rect.height + kerfM;

    if (!fitsSheetInEitherOrientation(occupiedWidth, occupiedHeight)) {
      unplaced.push(rect);
      continue;
    }

    const orientations: [number, number, boolean][] = [
      [occupiedWidth, occupiedHeight, false],
      [occupiedHeight, occupiedWidth, true],
    ];

    let best: ShelfCandidate | null = null;
    for (const [w, h, rotated] of orientations) {
      for (let i = 0; i < shelves.length; i += 1) {
        const shelf = shelves[i];
        if (h <= shelf.height + EPS && shelf.usedWidth + w <= sheet.widthM + EPS) {
          const waste = shelf.height - h;
          if (!best || waste < best.waste - EPS) {
            best = { kind: "reuse", shelfIndex: i, width: w, height: h, rotated, waste };
          }
        }
      }
      for (let s = 0; s < sheetHeightUsed.length; s += 1) {
        const usedHeight = sheetHeightUsed[s];
        if (w <= sheet.widthM + EPS && usedHeight + h <= sheet.heightM + EPS && (!best || best.waste > EPS)) {
          best = { kind: "new", sheetIndex: s, y: usedHeight, width: w, height: h, rotated, waste: 0 };
        }
      }
    }

    if (best) {
      if (best.kind === "reuse") {
        const shelf = shelves[best.shelfIndex];
        placements.push({
          cutlistId: rect.cutlistId,
          sheetIndex: shelf.sheetIndex,
          x: round(shelf.usedWidth),
          y: round(shelf.y),
          width: round(best.rotated ? rect.height : rect.width),
          height: round(best.rotated ? rect.width : rect.height),
          rotated: best.rotated,
        });
        shelf.usedWidth += best.width;
      } else {
        shelves.push({ sheetIndex: best.sheetIndex, y: best.y, height: best.height, usedWidth: best.width });
        sheetHeightUsed[best.sheetIndex] = best.y + best.height;
        placements.push({
          cutlistId: rect.cutlistId,
          sheetIndex: best.sheetIndex,
          x: 0,
          y: round(best.y),
          width: round(best.rotated ? rect.height : rect.width),
          height: round(best.rotated ? rect.width : rect.height),
          rotated: best.rotated,
        });
      }
      continue;
    }

    // No room on any open sheet — start a new one.
    const sheetIndex = sheetHeightUsed.length;
    let placed = false;
    for (const [w, h, rotated] of orientations) {
      if (w <= sheet.widthM + EPS && h <= sheet.heightM + EPS) {
        shelves.push({ sheetIndex, y: 0, height: h, usedWidth: w });
        sheetHeightUsed[sheetIndex] = h;
        placements.push({
          cutlistId: rect.cutlistId,
          sheetIndex,
          x: 0,
          y: 0,
          width: round(rotated ? rect.height : rect.width),
          height: round(rotated ? rect.width : rect.height),
          rotated,
        });
        placed = true;
        break;
      }
    }
    if (!placed) unplaced.push(rect);
  }

  const usedAreaSqm = placements.reduce((sum, p) => sum + p.width * p.height, 0);
  const totalSheetAreaSqm = sheetHeightUsed.length * sheet.widthM * sheet.heightM;
  const wastePct = totalSheetAreaSqm > 0 ? round(((totalSheetAreaSqm - usedAreaSqm) / totalSheetAreaSqm) * 100, 1) : 0;

  return {
    sheetCount: sheetHeightUsed.length,
    placements,
    usedAreaSqm: round(usedAreaSqm),
    totalSheetAreaSqm: round(totalSheetAreaSqm),
    wastePct,
    unplaced,
  };
}

/** Whether `candidate` should replace `current` as the best run found so far: fewer sheets
 * wins outright, and among equal sheet counts the lower-waste run wins. */
function isBetterResult(candidate: NestingResult, current: NestingResult | null): boolean {
  if (!current) return true;
  if (candidate.sheetCount !== current.sheetCount) return candidate.sheetCount < current.sheetCount;
  return candidate.wastePct < current.wastePct;
}

/**
 * Packs a cutlist onto sheets by running two different strategies — a guillotine
 * best-short-side-fit packer (real panel-saw, edge-to-edge cuts) and a shelf
 * best-fit-decreasing-height packer (groups same-height boards into shared rows) — each
 * across every placement order in `SORT_ORDERS`, and keeps whichever single run opens the
 * fewest sheets (ties broken by lower waste). Neither strategy dominates the other: a
 * guillotine cut is better for irregular, varied-size cutlists, while shelf packing wins
 * when a cutlist is dominated by a handful of shared heights (e.g. a design's full-height
 * sides/backs/doors alongside much shorter shelves and drawer parts), which a guillotine
 * cut's local "split off the smaller leftover" rule doesn't specially recognize.
 *
 * Waste still has a hard floor neither strategy can beat: sheets are bought whole, so a
 * cutlist whose total area is, say, 3.2 sheets always leaves a partly-empty 4th sheet —
 * that floor is `1 - totalArea / (sheetCount × sheetArea)`. A second, tighter floor comes
 * from the pieces' own shapes: several pieces that are each almost as tall as the sheet
 * (e.g. 1.9m boards on a 2.44m sheet) can't share a sheet with anything else tall enough
 * to matter, forcing extra sheets no rearranging avoids — the total-area floor alone can
 * understate this real minimum.
 */
export function packSheets(cutlist: CutlistRow[], sheet: SheetSize, kerfM = 0.003): NestingResult {
  const baseRects: Rect[] = [];
  for (const row of cutlist) {
    if (row.isHardware) continue;
    for (let i = 0; i < row.qty; i += 1) {
      baseRects.push({ cutlistId: row.cutlistId, width: row.widthM, height: row.heightM });
    }
  }

  let best: NestingResult | null = null;
  for (const order of SORT_ORDERS) {
    const sorted = [...baseRects].sort(order.compare);
    const guillotine = packInOrder(sorted, sheet, kerfM);
    if (isBetterResult(guillotine, best)) best = guillotine;
    const shelf = packShelfInOrder(sorted, sheet, kerfM);
    if (isBetterResult(shelf, best)) best = shelf;
  }

  return best ?? packInOrder(baseRects, sheet, kerfM);
}
