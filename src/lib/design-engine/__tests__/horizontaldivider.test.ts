import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithOpenModule(horizontalDividers?: number): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      {
        id: "c1",
        widthM: 0.6,
        modules: [{ id: "m1", type: "open", heightM: 0.9, horizontalDividers }],
      },
    ],
  };
}

describe("horizontal dividers splitting a module into stacked sections", () => {
  it("adds no extra shelf boards when unset (an 'open' module contributes none of its own)", () => {
    const panels = computePanels(designWithOpenModule());
    expect(panels.filter((p) => p.moduleId === "m1")).toHaveLength(0);
  });

  it("adds N shelf boards for N dividers, evenly splitting the module's height", () => {
    const panels = computePanels(designWithOpenModule(2));
    const boards = panels.filter((p) => p.moduleId === "m1" && p.role === "shelf");
    expect(boards).toHaveLength(2);
    // 0.9m module split into 3 equal 0.3m sections -> boundaries at y=0.3 and y=0.6,
    // each board's underside sits at the boundary (centerY = boundary - thickness/2).
    const centers = boards.map((b) => b.centerY).sort((a, b) => a - b);
    expect(centers[0]).toBeCloseTo(0.3 - 0.009, 3);
    expect(centers[1]).toBeCloseTo(0.6 - 0.009, 3);
  });

  it("horizontal-divider boards are plain 'shelf' role pieces, not sheet-material hardware", () => {
    const panels = computePanels(designWithOpenModule(1));
    const board = panels.find((p) => p.moduleId === "m1" && p.role === "shelf")!;
    expect(board.orientation).toBe("horizontal-xz");
    expect(board.isHardware).toBe(false);
  });

  it("composes with vertical dividers on the same module without interference", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [
        {
          id: "c1",
          widthM: 0.6,
          modules: [{ id: "m1", type: "open", heightM: 0.9, horizontalDividers: 1, verticalDividers: 1 }],
        },
      ],
    };
    const panels = computePanels(design);
    expect(panels.filter((p) => p.moduleId === "m1" && p.role === "shelf")).toHaveLength(1);
    expect(panels.filter((p) => p.moduleId === "m1" && p.role === "divider")).toHaveLength(1);
  });
});
