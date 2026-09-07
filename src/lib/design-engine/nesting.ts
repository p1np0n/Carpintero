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

/**
 * Guillotine best-short-side-fit packer: places pieces into whichever free rectangle (on
 * any already-open sheet) wastes the least space, then splits that rectangle into the
 * leftover strips a real panel saw could cut out — a straight edge-to-edge cut, never an
 * L-shaped one. Opens a new sheet only once no open sheet has room.
 *
 * Waste has a hard floor this (or any) packer can't beat: sheets are bought whole, so a
 * cutlist whose total area is, say, 3.2 sheets always leaves a partly-empty 4th sheet —
 * that floor is `1 - totalArea / (sheetCount × sheetArea)` and no amount of rearranging
 * changes it. What the packer *can* control is getting as close to that floor as possible
 * within the sheet count it settles on, which is why every placement order in
 * `SORT_ORDERS` is tried and the run with the fewest sheets (ties broken by lower waste)
 * is kept — a single fixed heuristic can strand whole extra sheets that a different
 * starting order would have avoided.
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
    const result = packInOrder([...baseRects].sort(order.compare), sheet, kerfM);
    if (
      !best ||
      result.sheetCount < best.sheetCount ||
      (result.sheetCount === best.sheetCount && result.wastePct < best.wastePct)
    ) {
      best = result;
    }
  }

  return best ?? packInOrder(baseRects, sheet, kerfM);
}
