export interface Material {
  id: string;
  name: string;
  type: string;
  thicknessMm: number;
  pricePerSqm?: number | null;
  pricePerSheet?: number | null;
  sheetWidthM: number;
  sheetHeightM: number;
  currency: string;
}

export interface MaterialAssignment {
  scope: "project" | "column" | "module";
  targetId?: string;
  materialId: string;
}

export function pricePerSqm(material: Material): number {
  if (material.pricePerSqm != null) return material.pricePerSqm;
  if (material.pricePerSheet != null) {
    const sheetArea = material.sheetWidthM * material.sheetHeightM;
    if (sheetArea > 0) return material.pricePerSheet / sheetArea;
  }
  return 0;
}

export function resolveMaterialId(
  assignments: MaterialAssignment[],
  moduleId: string,
  columnId: string
): string | undefined {
  const moduleMatch = assignments.find((a) => a.scope === "module" && a.targetId === moduleId);
  if (moduleMatch) return moduleMatch.materialId;
  const columnMatch = assignments.find((a) => a.scope === "column" && a.targetId === columnId);
  if (columnMatch) return columnMatch.materialId;
  const projectMatch = assignments.find((a) => a.scope === "project");
  return projectMatch?.materialId;
}

export const SEED_MATERIALS: Omit<Material, "id">[] = [
  {
    name: "MDF 18mm crudo",
    type: "MDF",
    thicknessMm: 18,
    pricePerSheet: 38000,
    sheetWidthM: 1.83,
    sheetHeightM: 2.44,
    currency: "CLP",
  },
  {
    name: "Melamina blanca 18mm",
    type: "Melamina",
    thicknessMm: 18,
    pricePerSheet: 45000,
    sheetWidthM: 1.83,
    sheetHeightM: 2.44,
    currency: "CLP",
  },
  {
    name: "Melamina color 18mm",
    type: "Melamina",
    thicknessMm: 18,
    pricePerSheet: 52000,
    sheetWidthM: 1.83,
    sheetHeightM: 2.44,
    currency: "CLP",
  },
  {
    name: "Contrachapado (plywood) 18mm",
    type: "Contrachapado",
    thicknessMm: 18,
    pricePerSheet: 65000,
    sheetWidthM: 1.83,
    sheetHeightM: 2.44,
    currency: "CLP",
  },
  {
    name: "MDF 6mm (fondos/cajones)",
    type: "MDF",
    thicknessMm: 6,
    pricePerSheet: 22000,
    sheetWidthM: 1.83,
    sheetHeightM: 2.44,
    currency: "CLP",
  },
  {
    name: "Madera maciza pino 18mm",
    type: "Madera maciza",
    thicknessMm: 18,
    pricePerSqm: 28000,
    sheetWidthM: 1.83,
    sheetHeightM: 2.44,
    currency: "CLP",
  },
];
