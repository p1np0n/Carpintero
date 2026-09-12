import { describe, expect, it } from "vitest";
import { computePanels, isFrontVisiblePanel } from "../panels";
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

  it("leaves 13mm per side (26mm total) between the drawer box and the cabinet's inner walls for the slides", () => {
    const design = designWithModules([{ id: "m1", type: "drawer", heightM: 0.25 }]);
    const panels = computePanels(design);
    const [leftSide, rightSide] = panels.filter((p) => p.role === "drawer-side");
    const thicknessM = DEFAULT_GLOBAL_PARAMS.thicknessMm / 1000;

    const leftGap = leftSide.centerX - leftSide.sizeX / 2 - thicknessM;
    const rightGap = 0.6 - thicknessM - (rightSide.centerX + rightSide.sizeX / 2);
    expect(leftGap * 1000).toBeCloseTo(13, 1);
    expect(rightGap * 1000).toBeCloseTo(13, 1);
  });

  it("a wider drawerSlideClearanceMm shrinks the drawer box and its back/bottom width to match", () => {
    const narrow: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS, drawerSlideClearanceMm: 26 },
      columns: [{ id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "drawer", heightM: 0.25 }] }],
    };
    const wide: Design = {
      globalParams: { ...DEFAULT_GLOBAL_PARAMS, drawerSlideClearanceMm: 40 },
      columns: [{ id: "c1", widthM: 0.6, modules: [{ id: "m1", type: "drawer", heightM: 0.25 }] }],
    };

    const narrowBack = computePanels(narrow).find((p) => p.role === "drawer-back")!;
    const wideBack = computePanels(wide).find((p) => p.role === "drawer-back")!;
    expect(wideBack.widthM).toBeLessThan(narrowBack.widthM);
    expect(narrowBack.widthM - wideBack.widthM).toBeCloseTo(0.014, 3); // (40-26)mm extra clearance
  });

  it("screws the drawer bottom flush to the underside instead of setting it into a routed groove", () => {
    const design = designWithModules([{ id: "m1", type: "drawer", heightM: 0.25 }]);
    const panels = computePanels(design);
    const bottom = panels.find((p) => p.role === "drawer-bottom")!;
    const side = panels.find((p) => p.role === "drawer-side")!;
    const thicknessM = DEFAULT_GLOBAL_PARAMS.thicknessMm / 1000;

    // Full board thickness (not the thin ranurado insert) and flush with the very bottom
    // of the module slot (yBottom = 0 here), not floating partway up in a groove.
    expect(bottom.sizeY).toBeCloseTo(thicknessM, 5);
    expect(bottom.centerY - bottom.sizeY / 2).toBeCloseTo(0, 5);

    // The sides rest directly on top of the bottom panel — no gap, no overlap.
    const bottomTop = bottom.centerY + bottom.sizeY / 2;
    const sideBottom = side.centerY - side.sizeY / 2;
    expect(sideBottom).toBeCloseTo(bottomTop, 5);
  });

  it("the screwed-on bottom spans the box's full outer footprint, wider than the interior back board", () => {
    const design = designWithModules([{ id: "m1", type: "drawer", heightM: 0.25 }]);
    const panels = computePanels(design);
    const bottom = panels.find((p) => p.role === "drawer-bottom")!;
    const back = panels.find((p) => p.role === "drawer-back")!;

    expect(bottom.widthM).toBeGreaterThan(back.widthM);
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

  it("bottom-moulding fills its entire reserved module height, not just a thin sliver", () => {
    const design = designWithModules([
      { id: "m1", type: "bottom-moulding", heightM: 0.1, mouldingDepthMm: 40 },
      { id: "m2", type: "shelf", heightM: 0.5 },
    ]);
    const panels = computePanels(design);
    const moulding = panels.find((p) => p.role === "bottom-moulding")!;

    expect(moulding.sizeY).toBeCloseTo(0.1, 5);
    expect(moulding.centerY).toBeCloseTo(0.05, 5); // centered within its 0 to 0.1 slot
  });

  it("a drawer module's front-facing cutlist labels skip its hidden back/side/bottom boards", () => {
    const design = designWithModules([{ id: "m1", type: "drawer", heightM: 0.3 }]);
    const panels = computePanels(design);
    const visible = panels.filter(isFrontVisiblePanel);

    expect(visible.some((p) => p.role === "back-panel")).toBe(false);
    expect(visible.some((p) => p.role === "drawer-back")).toBe(false);
    expect(visible.some((p) => p.role === "drawer-side")).toBe(false);
    expect(visible.some((p) => p.role === "drawer-bottom")).toBe(false);
    expect(visible.some((p) => p.role === "drawer-front")).toBe(true);
    expect(visible.some((p) => p.role === "side-panel")).toBe(true);
  });

  it("a doors module's two leaves together span the column's full width, flush with both edges", () => {
    const design = designWithModules([{ id: "m1", type: "doors", heightM: 0.4 }]);
    const panels = computePanels(design);
    const doors = panels.filter((p) => p.role === "door-front");

    expect(doors).toHaveLength(2);
    expect(doors[0].widthM + doors[1].widthM).toBeCloseTo(0.6, 5);
  });

  it("a left-door/right-door module's door is exactly as wide as the column", () => {
    const design = designWithModules([{ id: "m1", type: "left-door", heightM: 0.4 }]);
    const panels = computePanels(design);
    const door = panels.find((p) => p.role === "door-front")!;

    expect(door.widthM).toBeCloseTo(0.6, 5);
  });

  it("keeps the hanging rod itself visible but hides its mounting brackets", () => {
    const design = designWithModules([{ id: "m1", type: "hanging-rod", heightM: 0.1 }]);
    const panels = computePanels(design);
    const visible = panels.filter(isFrontVisiblePanel);

    expect(visible.some((p) => p.role === "hanging-rod" && p.orientation === "rod")).toBe(true);
    expect(visible.some((p) => p.role === "hanging-rod" && p.orientation === "hardware")).toBe(false);
  });

  it("newBoxHere splits a column into two independent carcasses instead of one continuous one", () => {
    const design = designWithModules([
      { id: "m1", type: "shelf", heightM: 0.9 },
      { id: "m2", type: "shelf", heightM: 0.9, newBoxHere: true },
    ]);
    const panels = computePanels(design);

    const sides = panels.filter((p) => p.role === "side-panel");
    const backs = panels.filter((p) => p.role === "back-panel");
    // 2 boxes x (2 sides + 1 back) instead of 1 continuous box's 2 sides + 1 back.
    expect(sides).toHaveLength(4);
    expect(backs).toHaveLength(2);
    expect(sides.every((s) => s.heightM < 1.0)).toBe(true); // each box only 0.9m tall, not 1.8m

    // Each box gets its own top+bottom caps (2 x 2 = 4) plus each shelf module's own
    // shelf board (2) = 6 "shelf" role pieces, and no shared mid-column divider board.
    expect(panels.filter((p) => p.role === "shelf")).toHaveLength(6);
  });

  it("newBoxHere on the first module of a column is a no-op (nothing to split from)", () => {
    const withFlag = designWithModules([{ id: "m1", type: "shelf", heightM: 0.9, newBoxHere: true }]);
    const without = designWithModules([{ id: "m1", type: "shelf", heightM: 0.9 }]);

    expect(computePanels(withFlag).filter((p) => p.role === "side-panel")).toHaveLength(
      computePanels(without).filter((p) => p.role === "side-panel").length
    );
  });

  it("each independent box sits at its own height, stacked without gaps or overlaps", () => {
    const design = designWithModules([
      { id: "m1", type: "open", heightM: 0.4 },
      { id: "m2", type: "open", heightM: 0.6, newBoxHere: true },
    ]);
    const panels = computePanels(design);
    const sides = panels.filter((p) => p.role === "side-panel").sort((a, b) => a.centerY - b.centerY);
    const [lowerBoxSide, upperBoxSide] = [sides[0], sides[2]];

    expect(lowerBoxSide.heightM).toBeCloseTo(0.4, 5);
    expect(lowerBoxSide.centerY - lowerBoxSide.heightM / 2).toBeCloseTo(0, 5);
    expect(upperBoxSide.heightM).toBeCloseTo(0.6, 5);
    expect(upperBoxSide.centerY - upperBoxSide.heightM / 2).toBeCloseTo(0.4, 5); // starts right on top
  });
});
