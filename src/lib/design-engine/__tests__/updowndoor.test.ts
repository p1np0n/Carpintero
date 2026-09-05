import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeCutlist } from "../cutlist";
import { computePieces3D } from "../geometry3d";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithFullDoor(hinge: "up" | "down"): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      {
        id: "c1",
        widthM: 0.6,
        fullDoor: { hinge, handle: true },
        modules: [{ id: "m1", type: "shelf", heightM: 0.3 }],
      },
    ],
  };
}

describe("column fullDoor with an up/down (flap) hinge", () => {
  it("generates a single full-height door-front piece carrying the up/down hinge", () => {
    const design = designWithFullDoor("up");
    const panels = computePanels(design);
    const fullDoorPieces = panels.filter((p) => p.moduleId === "__fulldoor__");

    expect(fullDoorPieces).toHaveLength(1);
    expect(fullDoorPieces[0].role).toBe("door-front");
    expect(fullDoorPieces[0].hinge).toBe("up");
  });

  it("is grouped into the cutlist alongside regular doors", () => {
    const design = designWithFullDoor("down");
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const doorRows = cutlist.filter((r) => r.role === "door-front");
    expect(doorRows.reduce((sum, r) => sum + r.qty, 0)).toBe(1);
  });

  it("pivots around the X axis (openRotationX), not the Y axis used by left/right doors", () => {
    const upDesign = designWithFullDoor("up");
    const upPanels = computePanels(upDesign);
    const upCutlist = computeCutlist(upPanels);
    const [upPiece] = computePieces3D(upPanels, upCutlist).filter((p) => p.role === "door-front");

    expect(upPiece.openRotationX).not.toBe(0);
    expect(upPiece.openRotationY).toBe(0);

    const downDesign = designWithFullDoor("down");
    const downPanels = computePanels(downDesign);
    const downCutlist = computeCutlist(downPanels);
    const [downPiece] = computePieces3D(downPanels, downCutlist).filter((p) => p.role === "door-front");

    // Hinged at the top vs. the bottom should swing the flap in opposite directions.
    expect(Math.sign(downPiece.openRotationX)).not.toBe(Math.sign(upPiece.openRotationX));
  });
});
