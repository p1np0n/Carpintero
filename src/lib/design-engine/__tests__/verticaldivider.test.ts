import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeCutlist } from "../cutlist";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithShelf(verticalDividers?: number): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      {
        id: "c1",
        widthM: 0.9,
        modules: [{ id: "m1", type: "shelf", heightM: 0.4, verticalDividers }],
      },
    ],
  };
}

describe("vertical dividers splitting a module into side-by-side sections", () => {
  it("adds no divider pieces when unset", () => {
    const panels = computePanels(designWithShelf());
    expect(panels.filter((p) => p.role === "divider")).toHaveLength(0);
  });

  it("adds N divider panels for N dividers, spanning the module's full height", () => {
    const panels = computePanels(designWithShelf(2));
    const dividers = panels.filter((p) => p.role === "divider" && p.moduleId === "m1");
    expect(dividers).toHaveLength(2);
    for (const d of dividers) {
      expect(d.sizeY).toBeCloseTo(0.4, 5); // full module height
      expect(d.isHardware).toBe(false);
    }
  });

  it("spaces N dividers evenly across the inner width, splitting it into N+1 equal sections", () => {
    const panels = computePanels(designWithShelf(1));
    const [divider] = panels.filter((p) => p.role === "divider" && p.moduleId === "m1");
    // width 0.9, thickness 18mm -> innerWidth = 0.9 - 0.036 = 0.864, one divider at the midpoint
    // of the inner cavity: innerX0 (0.018) + 0.864/2 = 0.45
    expect(divider.centerX).toBeCloseTo(0.45, 3);
  });

  it("is grouped in the cutlist under its own 'divider' role, distinct from side panels", () => {
    const panels = computePanels(designWithShelf(1));
    const cutlist = computeCutlist(panels);
    const dividerRow = cutlist.find((r) => r.role === "divider");
    expect(dividerRow).toBeDefined();
    expect(dividerRow!.cutlistId).toMatch(/^V\d+$/);
  });
});
