import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeCutlist } from "../cutlist";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithMultiple(count: number, subtype: "drawer" | "shelf" = "drawer"): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      {
        id: "c1",
        widthM: 0.6,
        modules: [
          { id: "m1", type: "multiple", heightM: 0.9, multipleSubtype: subtype, multipleCount: count },
        ],
      },
    ],
  };
}

describe("module type 'multiple'", () => {
  it("repeats the sub-type N times, splitting the height evenly", () => {
    const design = designWithMultiple(3, "drawer");
    const panels = computePanels(design);
    const fronts = panels.filter((p) => p.role === "drawer-front");
    expect(fronts).toHaveLength(3);
    for (const f of fronts) {
      expect(f.heightM).toBeCloseTo(0.9 / 3 - 0.004, 3);
    }
  });

  it("groups identical repeated pieces into a single cutlist row with qty = N", () => {
    const design = designWithMultiple(4, "drawer");
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const frontRow = cutlist.find((r) => r.role === "drawer-front")!;
    expect(frontRow.qty).toBe(4);
  });

  it("repeating 'shelf' produces one grouped shelf row with the repeated qty plus the fixed caps as a separate row when dimensions differ", () => {
    const design = designWithMultiple(2, "shelf");
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const shelfRows = cutlist.filter((r) => r.role === "shelf");
    // caps (full column height context) vs repeated shelves (half module height) -> same width/depth,
    // grouping is by exact widthM/heightM so they only merge if dimensions match exactly.
    const totalShelfQty = shelfRows.reduce((sum, r) => sum + r.qty, 0);
    expect(totalShelfQty).toBe(4); // 2 caps + 2 repeated shelves
  });

  it("every repeated sub-piece keeps the real module id, not a synthetic per-repetition one", () => {
    const design = designWithMultiple(3, "drawer");
    const panels = computePanels(design);
    const fronts = panels.filter((p) => p.role === "drawer-front");
    // Selecting any repeated drawer in the 3D view must resolve back to module "m1" —
    // a per-repetition id like "m1-0" wouldn't match any real module in the design.
    expect(fronts.every((p) => p.moduleId === "m1")).toBe(true);
  });
});
