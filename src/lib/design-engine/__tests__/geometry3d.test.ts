import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeCutlist } from "../cutlist";
import { computePieces3D } from "../geometry3d";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

describe("computePieces3D open-mode drawer translation", () => {
  it("pulls the drawer front out by the same distance as its box (front, back, sides, bottom)", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [{ id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "drawer", heightM: 0.2 }] }],
    };
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const pieces = computePieces3D(panels, cutlist).filter((p) => p.moduleId === "m1");

    const front = pieces.find((p) => p.role === "drawer-front")!;
    const back = pieces.find((p) => p.role === "drawer-back")!;
    const side = pieces.find((p) => p.role === "drawer-side")!;
    const bottom = pieces.find((p) => p.role === "drawer-bottom")!;

    // The front's material is much thinner than the box's own depth, so if each piece used
    // its own sizeZ for the pull distance, the front would lag behind the rest of the box.
    expect(front.sizeZ).not.toBeCloseTo(side.sizeZ, 2);

    const zTranslations = [front, back, side, bottom].map((p) => p.openTranslation[2]);
    expect(zTranslations[0]).toBeCloseTo(zTranslations[1], 5);
    expect(zTranslations[0]).toBeCloseTo(zTranslations[2], 5);
    expect(zTranslations[0]).toBeCloseTo(zTranslations[3], 5);
  });
});
