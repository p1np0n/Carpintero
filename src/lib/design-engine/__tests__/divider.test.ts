import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithModules(modules: Design["columns"][number]["modules"]): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [{ id: "c1", widthM: 0.6, modules }],
  };
}

describe("physical dividers between stacked modules", () => {
  it("adds a board between two hanging-rod modules that would otherwise share an invisible seam", () => {
    const design = designWithModules([
      { id: "m1", type: "hanging-rod", heightM: 0.9 },
      { id: "m2", type: "hanging-rod", heightM: 0.9 },
    ]);
    const panels = computePanels(design);
    const dividers = panels.filter((p) => p.moduleId === "__carcass__" && p.role === "shelf");
    // 2 fixed caps (top/bottom) + 1 divider between the two rod modules.
    expect(dividers).toHaveLength(3);
  });

  it("does not double up a board where a 'shelf' module already provides one at the boundary", () => {
    const design = designWithModules([
      { id: "m1", type: "shelf", heightM: 0.35 },
      { id: "m2", type: "hanging-rod", heightM: 0.9 },
    ]);
    const panels = computePanels(design);
    const boardsAtBoundary = panels.filter(
      (p) => p.role === "shelf" && Math.abs(p.centerY - 0.35 + 0.009) < 1e-6
    );
    // Only the shelf module's own board sits there, not a duplicate carcass divider.
    expect(boardsAtBoundary).toHaveLength(1);
  });

  it("a single-module column gets no divider (nothing to separate)", () => {
    const design = designWithModules([{ id: "m1", type: "hanging-rod", heightM: 0.9 }]);
    const panels = computePanels(design);
    const carcassShelves = panels.filter((p) => p.moduleId === "__carcass__" && p.role === "shelf");
    expect(carcassShelves).toHaveLength(2); // just the top/bottom caps
  });
});
