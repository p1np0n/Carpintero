import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { computeLayout2D } from "../layout2d";
import { columnTopM, designHeightM, DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithMount(mountHeightM: number): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      { id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "shelf", heightM: 1.0 }] },
      {
        id: "c2",
        widthM: 0.6,
        mountHeightM,
        modules: [{ id: "m2", type: "shelf", heightM: 0.4 }],
      },
    ],
  };
}

describe("column mountHeightM (wall-mounted / hanging units)", () => {
  it("columnTopM and designHeightM account for the mount offset", () => {
    const design = designWithMount(1.5);
    expect(columnTopM(design.columns[1])).toBeCloseTo(1.9, 5); // 1.5 + 0.4
    expect(designHeightM(design)).toBeCloseTo(1.9, 5); // taller than the floor column's 1.0
  });

  it("computeLayout2D offsets the mounted column's own y and its modules' y by the mount height", () => {
    const design = designWithMount(1.5);
    const layout = computeLayout2D(design);
    const mounted = layout.columns[1];
    expect(mounted.y).toBeCloseTo(1.5, 5);
    expect(mounted.modules[0].y).toBeCloseTo(1.5, 5);
  });

  it("computePanels shifts every piece of a mounted column up by the mount height", () => {
    const flat = designWithMount(0);
    const mounted = designWithMount(1.5);
    const flatPieces = computePanels(flat).filter((p) => p.columnId === "c2");
    const mountedPieces = computePanels(mounted).filter((p) => p.columnId === "c2");

    expect(mountedPieces).toHaveLength(flatPieces.length);
    for (let i = 0; i < flatPieces.length; i += 1) {
      expect(mountedPieces[i].centerY).toBeCloseTo(flatPieces[i].centerY + 1.5, 5);
    }
  });

  it("a column with mountHeightM = 0 (default) behaves exactly like before", () => {
    const design = designWithMount(0);
    const layout = computeLayout2D(design);
    expect(layout.columns[1].y).toBe(0);
    expect(layout.columns[1].modules[0].y).toBe(0);
  });
});
