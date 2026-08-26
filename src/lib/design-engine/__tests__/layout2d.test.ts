import { describe, expect, it } from "vitest";
import { computeLayout2D } from "../layout2d";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

describe("computeLayout2D", () => {
  it("places columns side by side by cumulative width", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [
        { id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "shelf", heightM: 1 }] },
        { id: "c2", widthM: 0.8, modules: [{ id: "m2", type: "shelf", heightM: 1 }] },
      ],
    };
    const layout = computeLayout2D(design);
    expect(layout.columns[0].x).toBe(0);
    expect(layout.columns[1].x).toBe(0.6);
    expect(layout.widthM).toBeCloseTo(1.4, 5);
  });

  it("stacks modules within a column bottom-up without gaps", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [
        {
          id: "c1",
          widthM: 0.6,
          modules: [
            { id: "m1", type: "shelf", heightM: 0.3 },
            { id: "m2", type: "doors", heightM: 0.9 },
          ],
        },
      ],
    };
    const layout = computeLayout2D(design);
    const [rect1, rect2] = layout.columns[0].modules;
    expect(rect1.y).toBe(0);
    expect(rect1.height).toBe(0.3);
    expect(rect2.y).toBe(0.3);
    expect(rect2.height).toBe(0.9);
    expect(layout.columns[0].height).toBeCloseTo(1.2, 5);
  });

  it("design height is the tallest column", () => {
    const design: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS },
      columns: [
        { id: "c1", widthM: 0.5, modules: [{ id: "m1", type: "shelf", heightM: 1 }] },
        { id: "c2", widthM: 0.5, modules: [{ id: "m2", type: "shelf", heightM: 2 }] },
      ],
    };
    const layout = computeLayout2D(design);
    expect(layout.heightM).toBe(2);
  });
});
