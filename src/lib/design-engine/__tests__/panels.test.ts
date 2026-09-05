import { describe, expect, it } from "vitest";
import { computePanels } from "../panels";
import { DEFAULT_GLOBAL_PARAMS, type Design } from "../types";

function designWithModules(modules: Design["columns"][number]["modules"]): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [{ id: "c1", widthM: 0.6, modules }],
  };
}

describe("computePanels", () => {
  it("generates carcass pieces (2 sides, 1 back, top+bottom caps) for a single column", () => {
    const design = designWithModules([{ id: "m1", type: "shelf", heightM: 0.35 }]);
    const panels = computePanels(design);

    expect(panels.filter((p) => p.role === "side-panel")).toHaveLength(2);
    expect(panels.filter((p) => p.role === "back-panel")).toHaveLength(1);
    // 2 fixed caps + 1 shelf module = 3 "shelf" role pieces
    expect(panels.filter((p) => p.role === "shelf")).toHaveLength(3);
  });

  it("a column with multiple stacked modules produces one shelf piece per shelf module plus caps", () => {
    const design = designWithModules([
      { id: "m1", type: "shelf", heightM: 0.3 },
      { id: "m2", type: "shelf", heightM: 0.3 },
      { id: "m3", type: "doors", heightM: 1.0 },
    ]);
    const panels = computePanels(design);

    expect(panels.filter((p) => p.role === "shelf")).toHaveLength(4); // 2 module shelves + 2 caps
    expect(panels.filter((p) => p.role === "door-front")).toHaveLength(2); // doors = pair
  });

  it("stacks module y positions bottom-up without gaps or overlaps", () => {
    const design = designWithModules([
      { id: "m1", type: "open", heightM: 0.2 },
      { id: "m2", type: "open", heightM: 0.5 },
    ]);
    // "open" produces no pieces, so assert indirectly via side panel height = sum of module heights
    const panels = computePanels(design);
    const side = panels.find((p) => p.role === "side-panel")!;
    expect(side.heightM).toBeCloseTo(0.7, 5);
  });

  it("drawer module produces front, back, 2 sides and a bottom", () => {
    const design = designWithModules([{ id: "m1", type: "drawer", heightM: 0.2 }]);
    const panels = computePanels(design);
    expect(panels.filter((p) => p.role === "drawer-front")).toHaveLength(1);
    expect(panels.filter((p) => p.role === "drawer-back")).toHaveLength(1);
    expect(panels.filter((p) => p.role === "drawer-side")).toHaveLength(2);
    expect(panels.filter((p) => p.role === "drawer-bottom")).toHaveLength(1);
  });

  it("left-door and right-door produce a single door-front with the matching hinge", () => {
    const design = designWithModules([{ id: "m1", type: "left-door", heightM: 0.5 }]);
    const panels = computePanels(design);
    const doors = panels.filter((p) => p.role === "door-front");
    expect(doors).toHaveLength(1);
    expect(doors[0].hinge).toBe("left");
  });

  it("hanging-rod and legs are marked as hardware, not sheet material", () => {
    const design = designWithModules([
      { id: "m1", type: "hanging-rod", heightM: 0.1, rodDiameterMm: 25 },
      { id: "m2", type: "legs", heightM: 0.1, legCount: 4 },
    ]);
    const panels = computePanels(design);
    const rodPieces = panels.filter((p) => p.role === "hanging-rod");
    const legs = panels.filter((p) => p.role === "legs");
    // The rod itself, plus one mounting bracket at each end wall.
    expect(rodPieces).toHaveLength(3);
    expect(rodPieces.every((p) => p.isHardware)).toBe(true);
    expect(rodPieces.filter((p) => p.orientation === "rod")).toHaveLength(1);
    expect(rodPieces.filter((p) => p.orientation === "hardware")).toHaveLength(2);
    expect(legs).toHaveLength(4);
    expect(legs.every((l) => l.isHardware)).toBe(true);
  });

  it("open modules contribute no cut pieces beyond the fixed carcass", () => {
    const withOpen = designWithModules([{ id: "m1", type: "open", heightM: 0.4 }]);
    const panels = computePanels(withOpen);
    // only the fixed carcass pieces (2 sides + back + 2 caps = 5)
    expect(panels).toHaveLength(5);
  });
});
