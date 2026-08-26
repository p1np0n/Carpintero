import type { PanelPiece } from "./panels";
import type { Material, MaterialAssignment } from "./materials";
import { pricePerSqm, resolveMaterialId } from "./materials";
import { pieceIdToCutlistId } from "./geometry3d";
import type { CutlistRow } from "./cutlist";

export interface BudgetLine {
  cutlistId: string;
  role: string;
  materialId: string | null;
  materialName: string;
  qty: number;
  areaSqm: number;
  unitPricePerSqm: number;
  totalCost: number;
}

export interface Budget {
  currency: string;
  lines: BudgetLine[];
  materialsCostTotal: number;
  extraCost: number;
  grandTotal: number;
  totalAreaSqm: number;
}

export function computeBudget(
  panels: PanelPiece[],
  cutlist: CutlistRow[],
  materials: Material[],
  assignments: MaterialAssignment[],
  options: { extraCost?: number; currency?: string } = {}
): Budget {
  const { extraCost = 0, currency = "CLP" } = options;
  const cutlistIdByPieceId = pieceIdToCutlistId(cutlist);
  const materialById = new Map(materials.map((m) => [m.id, m]));

  const lineByKey = new Map<string, BudgetLine>();

  for (const p of panels) {
    if (p.isHardware) continue;
    const cutlistId = cutlistIdByPieceId.get(p.id) ?? "?";
    const materialId = resolveMaterialId(assignments, p.moduleId, p.columnId) ?? null;
    const material = materialId ? materialById.get(materialId) : undefined;
    const unitPrice = material ? pricePerSqm(material) : 0;
    const areaSqm = p.widthM * p.heightM;

    const key = `${cutlistId}|${materialId ?? "none"}`;
    const existing = lineByKey.get(key);
    if (existing) {
      existing.qty += 1;
      existing.areaSqm += areaSqm;
      existing.totalCost += areaSqm * unitPrice;
      continue;
    }
    lineByKey.set(key, {
      cutlistId,
      role: p.role,
      materialId,
      materialName: material?.name ?? "Sin asignar",
      qty: 1,
      areaSqm,
      unitPricePerSqm: unitPrice,
      totalCost: areaSqm * unitPrice,
    });
  }

  const lines = Array.from(lineByKey.values()).sort((a, b) => a.cutlistId.localeCompare(b.cutlistId));
  const materialsCostTotal = lines.reduce((sum, l) => sum + l.totalCost, 0);
  const totalAreaSqm = lines.reduce((sum, l) => sum + l.areaSqm, 0);

  return {
    currency,
    lines,
    materialsCostTotal,
    extraCost,
    grandTotal: materialsCostTotal + extraCost,
    totalAreaSqm,
  };
}
