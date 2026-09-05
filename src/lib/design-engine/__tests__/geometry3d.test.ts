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

describe("computePieces3D exploded-mode side-panel direction", () => {
  it("sends each column's own left/right side panel away from each other, for every column", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [
        { id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "shelf", heightM: 0.5 }] },
        { id: "c2", widthM: 0.6, modules: [{ id: "m2", type: "shelf", heightM: 0.5 }] },
      ],
    };
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const pieces = computePieces3D(panels, cutlist);

    for (const columnId of ["c1", "c2"]) {
      const sides = pieces.filter((p) => p.columnId === columnId && p.role === "side-panel");
      expect(sides).toHaveLength(2);
      const [a, b] = sides;
      const left = a.centerX <= b.centerX ? a : b;
      const right = a.centerX <= b.centerX ? b : a;
      // Previously every column's sides used the same fixed +X direction unless the
      // column started at x=0, so a second column's sides would overlap its neighbor.
      expect(left.explodeDirection[0]).toBe(-1);
      expect(right.explodeDirection[0]).toBe(1);
    }
  });
});

describe("computePieces3D exploded-mode vertical fan-out", () => {
  it("spaces stacked shelves further apart the higher they are, instead of one rigid shift", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [
        {
          id: "c1",
          widthM: 0.6,
          modules: [
            { id: "m1", type: "shelf", heightM: 0.1 },
            { id: "m2", type: "shelf", heightM: 0.1 },
            { id: "m3", type: "shelf", heightM: 0.1 },
          ],
        },
      ],
    };
    const panels = computePanels(design);
    const cutlist = computeCutlist(panels);
    const pieces = computePieces3D(panels, cutlist).filter((p) => p.role === "shelf");
    const byHeight = [...pieces].sort((a, b) => a.centerY - b.centerY);

    // Every subsequent (higher) layer must get at least as much separation as the one
    // below it, and the topmost layer strictly more than the bottom cap.
    for (let i = 1; i < byHeight.length; i += 1) {
      expect(byHeight[i].explodeDistance).toBeGreaterThanOrEqual(byHeight[i - 1].explodeDistance);
    }
    expect(byHeight[byHeight.length - 1].explodeDistance).toBeGreaterThan(byHeight[0].explodeDistance);
  });
});
