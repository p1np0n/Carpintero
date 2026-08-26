import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeCutlist } from "../cutlist";
import { computeBudget } from "../budget";
import type { Material, MaterialAssignment } from "../materials";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

const design: Design = {
  globalParams: { ...DEFAULT_GLOBAL_PARAMS },
  columns: [{ id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "shelf", heightM: 0.35 }] }],
};

const mdf: Material = {
  id: "mat-mdf",
  name: "MDF 18mm",
  type: "MDF",
  thicknessMm: 18,
  pricePerSqm: 10000,
  sheetWidthM: 1.83,
  sheetHeightM: 2.44,
  currency: "CLP",
};

const melamina: Material = {
  id: "mat-mel",
  name: "Melamina 18mm",
  type: "Melamina",
  thicknessMm: 18,
  pricePerSheet: 1.83 * 2.44 * 20000, // => 20000/sqm
  sheetWidthM: 1.83,
  sheetHeightM: 2.44,
  currency: "CLP",
};

describe("computeBudget", () => {
  it("computes cost as area x price/sqm for a project-level material assignment", () => {
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const assignments: MaterialAssignment[] = [{ scope: "project", materialId: mdf.id }];

    const budget = computeBudget(panels, cutlist, [mdf], assignments);

    expect(budget.materialsCostTotal).toBeGreaterThan(0);
    expect(budget.grandTotal).toBe(budget.materialsCostTotal);
    const expectedArea = panels.filter((p) => !p.isHardware).reduce((s, p) => s + p.widthM * p.heightM, 0);
    expect(budget.materialsCostTotal).toBeCloseTo(expectedArea * 10000, 1);
  });

  it("a column-level override takes priority over the project default", () => {
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const assignments: MaterialAssignment[] = [
      { scope: "project", materialId: mdf.id },
      { scope: "column", targetId: "c1", materialId: melamina.id },
    ];

    const budget = computeBudget(panels, cutlist, [mdf, melamina], assignments);
    // every line should resolve to melamina since the only column overrides it
    expect(budget.lines.every((l) => l.materialId === melamina.id)).toBe(true);
  });

  it("adds a flat extra cost (hardware/misc) to the grand total", () => {
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const assignments: MaterialAssignment[] = [{ scope: "project", materialId: mdf.id }];

    const budget = computeBudget(panels, cutlist, [mdf], assignments, { extraCost: 15000 });
    expect(budget.grandTotal).toBeCloseTo(budget.materialsCostTotal + 15000, 5);
  });

  it("pieces without any resolvable material cost 0 and are labeled unassigned", () => {
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const budget = computeBudget(panels, cutlist, [], []);
    expect(budget.materialsCostTotal).toBe(0);
    expect(budget.lines.every((l) => l.materialName === "Sin asignar")).toBe(true);
  });
});
