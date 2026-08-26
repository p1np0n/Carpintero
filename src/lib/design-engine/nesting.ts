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

interface Shelf {
  y: number;
  height: number;
  usedWidth: number;
}

function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * First-fit-decreasing shelf packer: sorts pieces by area (desc), then packs
 * each into the first shelf (row) that fits, opening a new shelf or a new
 * sheet when needed. Not globally optimal, but simple, fast, and good enough
 * to estimate sheet count and waste for a cut-shop quote.
 */
export function packSheets(cutlist: CutlistRow[], sheet: SheetSize, kerfM = 0.003): NestingResult {
  const rects: { cutlistId: string; width: number; height: number }[] = [];
  for (const row of cutlist) {
    if (row.isHardware) continue;
    for (let i = 0; i < row.qty; i += 1) {
      rects.push({ cutlistId: row.cutlistId, width: row.widthM, height: row.heightM });
    }
  }
  rects.sort((a, b) => b.width * b.height - a.width * a.height);

  const sheets: Shelf[][] = [];
  const placements: NestingPlacement[] = [];
  const unplaced: { cutlistId: string; width: number; height: number }[] = [];

  const tryPlaceOnSheet = (sheetIndex: number, rect: (typeof rects)[number]) => {
    const shelves = sheets[sheetIndex];
    for (const rotated of [false, true]) {
      const w = rotated ? rect.height : rect.width;
      const h = rotated ? rect.width : rect.height;
      if (w > sheet.widthM || h > sheet.heightM) continue;

      for (const shelf of shelves) {
        if (h <= shelf.height && shelf.usedWidth + w <= sheet.widthM + 1e-9) {
          const placement: NestingPlacement = {
            cutlistId: rect.cutlistId,
            sheetIndex,
            x: shelf.usedWidth,
            y: shelf.y,
            width: w,
            height: h,
            rotated,
          };
          shelf.usedWidth = round(shelf.usedWidth + w + kerfM);
          return placement;
        }
      }

      const last = shelves[shelves.length - 1];
      const newY = last ? round(last.y + last.height + kerfM) : 0;
      if (newY + h <= sheet.heightM + 1e-9) {
        shelves.push({ y: newY, height: h, usedWidth: round(w + kerfM) });
        return { cutlistId: rect.cutlistId, sheetIndex, x: 0, y: newY, width: w, height: h, rotated };
      }
    }
    return null;
  };

  for (const rect of rects) {
    if (rect.width > sheet.widthM && rect.height > sheet.widthM && rect.width > sheet.heightM) {
      unplaced.push(rect);
      continue;
    }
    let placement: NestingPlacement | null = null;
    for (let i = 0; i < sheets.length && !placement; i += 1) {
      placement = tryPlaceOnSheet(i, rect);
    }
    if (!placement) {
      sheets.push([]);
      placement = tryPlaceOnSheet(sheets.length - 1, rect);
    }
    if (placement) {
      placements.push(placement);
    } else {
      unplaced.push(rect);
    }
  }

  const usedAreaSqm = placements.reduce((sum, p) => sum + p.width * p.height, 0);
  const totalSheetAreaSqm = sheets.length * sheet.widthM * sheet.heightM;
  const wastePct = totalSheetAreaSqm > 0 ? round(((totalSheetAreaSqm - usedAreaSqm) / totalSheetAreaSqm) * 100, 1) : 0;

  return {
    sheetCount: sheets.length,
    placements,
    usedAreaSqm: round(usedAreaSqm),
    totalSheetAreaSqm: round(totalSheetAreaSqm),
    wastePct,
    unplaced,
  };
}
