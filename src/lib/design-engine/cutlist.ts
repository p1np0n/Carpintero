import type { Orientation, PanelPiece, PanelRole } from "./panels";

const FAMILY_PREFIX: Record<PanelRole, string> = {
  "back-panel": "B",
  "side-panel": "S",
  shelf: "E",
  "door-front": "O",
  "drawer-front": "D",
  "drawer-back": "D",
  "drawer-side": "D",
  "drawer-bottom": "D",
  "top-moulding": "M",
  "bottom-moulding": "M",
  "hanging-rod": "R",
  legs: "L",
};

export interface CutlistRow {
  cutlistId: string;
  role: PanelRole;
  orientation: Orientation;
  widthM: number;
  heightM: number;
  thicknessMm: number;
  qty: number;
  isHardware: boolean;
  /** ids of the underlying PanelPiece instances in this group. */
  pieceIds: string[];
}

function groupKey(p: PanelPiece): string {
  return [p.role, p.orientation, p.widthM.toFixed(4), p.heightM.toFixed(4), p.thicknessMm].join(
    "|"
  );
}

export function computeCutlist(panels: PanelPiece[]): CutlistRow[] {
  const groups = new Map<string, CutlistRow>();
  const familyCounters: Record<string, number> = {};

  for (const p of panels) {
    const key = groupKey(p);
    const existing = groups.get(key);
    if (existing) {
      existing.qty += 1;
      existing.pieceIds.push(p.id);
      continue;
    }
    const prefix = FAMILY_PREFIX[p.role] ?? "X";
    familyCounters[prefix] = (familyCounters[prefix] ?? 0) + 1;
    groups.set(key, {
      cutlistId: `${prefix}${familyCounters[prefix]}`,
      role: p.role,
      orientation: p.orientation,
      widthM: p.widthM,
      heightM: p.heightM,
      thicknessMm: p.thicknessMm,
      qty: 1,
      isHardware: p.isHardware,
      pieceIds: [p.id],
    });
  }

  return Array.from(groups.values());
}

export interface CutlistTotals {
  totalPieces: number;
  totalPanelPieces: number;
  totalHardwarePieces: number;
  totalAreaSqm: number;
}

export function computeCutlistTotals(rows: CutlistRow[]): CutlistTotals {
  let totalPieces = 0;
  let totalPanelPieces = 0;
  let totalHardwarePieces = 0;
  let totalAreaSqm = 0;

  for (const row of rows) {
    totalPieces += row.qty;
    if (row.isHardware) {
      totalHardwarePieces += row.qty;
    } else {
      totalPanelPieces += row.qty;
      totalAreaSqm += row.widthM * row.heightM * row.qty;
    }
  }

  return { totalPieces, totalPanelPieces, totalHardwarePieces, totalAreaSqm };
}
