import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeCutlist } from "../cutlist";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithFullDoor(hinge: "left" | "right" | "double") {
  const design: Design = {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      {
        id: "c1",
        widthM: 0.6,
        fullDoor: { hinge, handle: true },
        modules: [
          { id: "m1", type: "shelf", heightM: 0.3 },
          { id: "m2", type: "hanging-rod", heightM: 0.2 },
          { id: "m3", type: "drawer", heightM: 0.25 },
        ],
      },
    ],
  };
  return design;
}

describe("column fullDoor", () => {
  it("a single-hinge full door spans the whole column height, not just one module", () => {
    const design = designWithFullDoor("left");
    const panels = computePanels(design);
    const fullDoorPieces = panels.filter((p) => p.moduleId === "__fulldoor__");

    expect(fullDoorPieces).toHaveLength(1);
    expect(fullDoorPieces[0].role).toBe("door-front");
    expect(fullDoorPieces[0].hinge).toBe("left");
    // Should be roughly as tall as the sum of every module in the column.
    const totalModuleHeight = 0.3 + 0.2 + 0.25;
    expect(fullDoorPieces[0].heightM).toBeGreaterThan(totalModuleHeight - 0.01);
  });

  it("a double-hinge full door produces two door-front pieces sharing the column's full height", () => {
    const design = designWithFullDoor("double");
    const panels = computePanels(design);
    const fullDoorPieces = panels.filter((p) => p.moduleId === "__fulldoor__");

    expect(fullDoorPieces).toHaveLength(2);
    expect(fullDoorPieces.map((p) => p.hinge).sort()).toEqual(["left", "right"]);
    expect(fullDoorPieces[0].heightM).toBeCloseTo(fullDoorPieces[1].heightM, 5);
  });

  it("full-door pieces are grouped into the cutlist alongside regular doors", () => {
    const design = designWithFullDoor("right");
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const doorRows = cutlist.filter((r) => r.role === "door-front");
    expect(doorRows.length).toBeGreaterThan(0);
    expect(doorRows.reduce((sum, r) => sum + r.qty, 0)).toBe(1);
  });

  it("a column without fullDoor generates no __fulldoor__ pieces", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [{ id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "shelf", heightM: 0.3 }] }],
    };
    const panels = computePanels(design);
    expect(panels.filter((p) => p.moduleId === "__fulldoor__")).toHaveLength(0);
  });
});
