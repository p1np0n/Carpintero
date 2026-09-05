import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeCutlist, computeCutlistTotals } from "../cutlist";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

const design: Design = {
  globalParams: { ...DEFAULT_GLOBAL_PARAMS },
  columns: [
    {
      id: "c1",
      widthM: 0.6,
      modules: [
        { id: "m1", type: "shelf", heightM: 0.35 },
        { id: "m2", type: "doors", heightM: 1.0 },
      ],
    },
    {
      id: "c2",
      widthM: 0.6,
      modules: [
        { id: "m3", type: "shelf", heightM: 0.35 },
        { id: "m4", type: "doors", heightM: 1.0 },
      ],
    },
  ],
};

describe("computeCutlist", () => {
  it("assigns short family-prefixed ids (B, S, E, O, ...) grouping identical pieces", () => {
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);

    const ids = cutlist.map((r) => r.cutlistId);
    expect(new Set(ids).size).toBe(ids.length); // all unique

    const backRow = cutlist.find((r) => r.role === "back-panel")!;
    expect(backRow.cutlistId).toMatch(/^B\d+$/);
    const doorRow = cutlist.find((r) => r.role === "door-front")!;
    expect(doorRow.cutlistId).toMatch(/^O\d+$/);
  });

  it("two identical columns produce doubled quantities instead of duplicate rows", () => {
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);

    const backRow = cutlist.find((r) => r.role === "back-panel")!;
    expect(backRow.qty).toBe(2); // one back panel per column, both identical size
    const doorRow = cutlist.find((r) => r.role === "door-front")!;
    expect(doorRow.qty).toBe(4); // 2 doors per column x 2 columns
  });

  it("computes totals excluding hardware from panel area", () => {
    const withRod: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [
        {
          id: "c1",
          widthM: 0.6,
          modules: [{ id: "m1", type: "hanging-rod", heightM: 0.1 }],
        },
      ],
    };
    const panels = computePanels(withRod);
    const cutlist = computeCutlist(panels);
    const totals = computeCutlistTotals(cutlist);

    expect(totals.totalHardwarePieces).toBe(3); // the rod plus its two end brackets
    expect(totals.totalPanelPieces).toBeGreaterThan(0); // carcass pieces are still panels
    expect(totals.totalAreaSqm).toBeGreaterThan(0);
  });
});
