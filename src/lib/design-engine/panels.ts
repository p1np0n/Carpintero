import type { Column, Design, GlobalParams, Module, RepeatableModuleType } from "./types";
import { columnHeightM } from "./types";

export type PanelRole =
  | "back-panel"
  | "side-panel"
  | "shelf"
  | "door-front"
  | "drawer-front"
  | "drawer-back"
  | "drawer-side"
  | "drawer-bottom"
  | "top-moulding"
  | "bottom-moulding"
  | "hanging-rod"
  | "legs";

/** How a piece's two "cut" dimensions (widthM/heightM) map onto 3D axes. */
export type Orientation = "vertical-xy" | "horizontal-xz" | "vertical-yz" | "rod" | "hardware";

/**
 * One physical piece to cut (or one hardware item), already placed in 3D
 * space (meters, y-up, origin at the floor / front-left / back of the
 * furniture). `widthM`/`heightM` are the two cut dimensions shown in the
 * cutlist table; `sizeX/Y/Z` + `centerX/Y/Z` are the render-ready box.
 */
export interface PanelPiece {
  id: string;
  moduleId: string;
  columnId: string;
  role: PanelRole;
  orientation: Orientation;
  widthM: number;
  heightM: number;
  thicknessMm: number;
  isHardware: boolean;
  centerX: number;
  centerY: number;
  centerZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  hinge?: "left" | "right" | "up" | "down";
  handle?: boolean;
}

interface ModuleCtx {
  column: Column;
  columnX0: number;
  globalParams: GlobalParams;
  yBottom: number;
}

function round(n: number, dp = 5): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function genModulePieces(mod: Module, ctx: ModuleCtx): PanelPiece[] {
  const { column, columnX0, globalParams, yBottom } = ctx;
  const { depthM, thicknessMm, overhangMm } = globalParams;
  const thicknessM = thicknessMm / 1000;
  const overhangM = overhangMm / 1000;
  const W = column.widthM;
  const innerWidth = round(W - 2 * thicknessM);
  const innerDepth = round(depthM - thicknessM);
  const moduleHeight = mod.heightM;
  const yTop = yBottom + moduleHeight;
  const centerXCol = columnX0 + W / 2;

  const piece = (p: Omit<PanelPiece, "id" | "moduleId" | "columnId">): PanelPiece => ({
    id: `${mod.id}-${p.role}-${Math.random().toString(36).slice(2, 8)}`,
    moduleId: mod.id,
    columnId: column.id,
    ...p,
  });

  switch (mod.type) {
    case "shelf":
      return [
        piece({
          role: "shelf",
          orientation: "horizontal-xz",
          widthM: innerWidth,
          heightM: depthM,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          centerY: yTop - thicknessM / 2,
          centerZ: depthM / 2,
          sizeX: innerWidth,
          sizeY: thicknessM,
          sizeZ: depthM,
        }),
      ];

    case "open":
      return [];

    case "hanging-rod": {
      const dMm = mod.rodDiameterMm ?? 25;
      const dM = dMm / 1000;
      return [
        piece({
          role: "hanging-rod",
          orientation: "rod",
          widthM: innerWidth,
          heightM: 0,
          thicknessMm: dMm,
          isHardware: true,
          centerX: centerXCol,
          centerY: yTop - 0.05,
          centerZ: depthM * 0.7,
          sizeX: innerWidth,
          sizeY: dM,
          sizeZ: dM,
        }),
      ];
    }

    case "legs": {
      const count = mod.legCount ?? 4;
      const legHeightM = moduleHeight;
      const footprint = 0.05;
      const xs = [columnX0 + footprint, columnX0 + W - footprint];
      const zs = [footprint, Math.max(footprint, depthM - footprint)];
      const corners: [number, number][] = [
        [xs[0], zs[0]],
        [xs[1], zs[0]],
        [xs[0], zs[1]],
        [xs[1], zs[1]],
      ];
      const chosen = corners.slice(0, Math.max(1, Math.min(4, count)));
      return chosen.map(([x, z]) =>
        piece({
          role: "legs",
          orientation: "hardware",
          widthM: footprint,
          heightM: legHeightM,
          thicknessMm: 50,
          isHardware: true,
          centerX: x,
          centerY: yBottom + legHeightM / 2,
          centerZ: z,
          sizeX: footprint,
          sizeY: legHeightM,
          sizeZ: footprint,
        })
      );
    }

    case "top-moulding":
    case "bottom-moulding": {
      const depthMm = mod.mouldingDepthMm ?? 40;
      const dM = depthMm / 1000;
      const isTop = mod.type === "top-moulding";
      return [
        piece({
          role: mod.type,
          orientation: "horizontal-xz",
          widthM: W,
          heightM: dM,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          centerY: isTop ? yTop - thicknessM / 2 : yBottom + thicknessM / 2,
          centerZ: depthM - dM / 2,
          sizeX: W,
          sizeY: thicknessM,
          sizeZ: dM,
        }),
      ];
    }

    case "doors": {
      const doorWidth = round((innerWidth + overhangM) / 2);
      const doorHeight = round(moduleHeight + overhangM);
      const centerY = yBottom + moduleHeight / 2;
      const centerZ = depthM + thicknessM / 2;
      return [
        piece({
          role: "door-front",
          orientation: "vertical-xy",
          widthM: doorWidth,
          heightM: doorHeight,
          thicknessMm,
          isHardware: false,
          centerX: columnX0 + doorWidth / 2,
          centerY,
          centerZ,
          sizeX: doorWidth,
          sizeY: doorHeight,
          sizeZ: thicknessM,
          hinge: "left",
          handle: true,
        }),
        piece({
          role: "door-front",
          orientation: "vertical-xy",
          widthM: doorWidth,
          heightM: doorHeight,
          thicknessMm,
          isHardware: false,
          centerX: columnX0 + W - doorWidth / 2,
          centerY,
          centerZ,
          sizeX: doorWidth,
          sizeY: doorHeight,
          sizeZ: thicknessM,
          hinge: "right",
          handle: true,
        }),
      ];
    }

    case "left-door":
    case "right-door": {
      const doorWidth = round(innerWidth + overhangM);
      const doorHeight = round(moduleHeight + overhangM);
      return [
        piece({
          role: "door-front",
          orientation: "vertical-xy",
          widthM: doorWidth,
          heightM: doorHeight,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          centerY: yBottom + moduleHeight / 2,
          centerZ: depthM + thicknessM / 2,
          sizeX: doorWidth,
          sizeY: doorHeight,
          sizeZ: thicknessM,
          hinge: mod.type === "left-door" ? "left" : "right",
          handle: true,
        }),
      ];
    }

    case "drawer": {
      const frontHeight = round(Math.max(0.01, moduleHeight - 0.004));
      const boxHeight = round(moduleHeight * 0.7);
      const sideWidth = round(Math.max(0.01, innerDepth - 0.05));
      const backWidth = round(Math.max(0.01, innerWidth - 0.02));
      const bottomDepth = round(Math.max(0.01, innerDepth - 0.05));
      const centerY = yBottom + moduleHeight / 2;
      const boxCenterY = yBottom + boxHeight / 2;
      return [
        piece({
          role: "drawer-front",
          orientation: "vertical-xy",
          widthM: W,
          heightM: frontHeight,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          centerY,
          centerZ: depthM + thicknessM / 2,
          sizeX: W,
          sizeY: frontHeight,
          sizeZ: thicknessM,
          handle: true,
        }),
        piece({
          role: "drawer-back",
          orientation: "vertical-xy",
          widthM: backWidth,
          heightM: boxHeight,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          centerY: boxCenterY,
          centerZ: depthM - 0.05,
          sizeX: backWidth,
          sizeY: boxHeight,
          sizeZ: thicknessM,
        }),
        piece({
          role: "drawer-side",
          orientation: "vertical-yz",
          widthM: sideWidth,
          heightM: boxHeight,
          thicknessMm,
          isHardware: false,
          centerX: columnX0 + thicknessM + 0.01,
          centerY: boxCenterY,
          centerZ: depthM / 2,
          sizeX: thicknessM,
          sizeY: boxHeight,
          sizeZ: sideWidth,
        }),
        piece({
          role: "drawer-side",
          orientation: "vertical-yz",
          widthM: sideWidth,
          heightM: boxHeight,
          thicknessMm,
          isHardware: false,
          centerX: columnX0 + W - thicknessM - 0.01,
          centerY: boxCenterY,
          centerZ: depthM / 2,
          sizeX: thicknessM,
          sizeY: boxHeight,
          sizeZ: sideWidth,
        }),
        piece({
          role: "drawer-bottom",
          orientation: "horizontal-xz",
          widthM: backWidth,
          heightM: bottomDepth,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          centerY: yBottom + 0.02,
          centerZ: depthM / 2,
          sizeX: backWidth,
          sizeY: thicknessM / 2,
          sizeZ: bottomDepth,
        }),
      ];
    }

    case "multiple": {
      const subtype: RepeatableModuleType = mod.multipleSubtype ?? "drawer";
      if ((subtype as string) === "multiple") return [];
      const count = Math.max(1, mod.multipleCount ?? 1);
      const subHeight = moduleHeight / count;
      const pieces: PanelPiece[] = [];
      for (let i = 0; i < count; i += 1) {
        const subModule: Module = {
          ...mod,
          id: `${mod.id}-${i}`,
          type: subtype,
          heightM: subHeight,
        };
        pieces.push(
          ...genModulePieces(subModule, { ...ctx, yBottom: yBottom + i * subHeight })
        );
      }
      return pieces;
    }

    default:
      return [];
  }
}

/** A door (or pair of doors) covering a column's full height, regardless of how many
 * modules it contains — generated once per column, independent of the module loop. */
function genFullDoorPieces(column: Column, columnX0: number, globalParams: GlobalParams, H: number): PanelPiece[] {
  const config = column.fullDoor;
  if (!config) return [];

  const { depthM, thicknessMm, overhangMm } = globalParams;
  const thicknessM = thicknessMm / 1000;
  const overhangM = overhangMm / 1000;
  const W = column.widthM;
  const innerWidth = round(W - 2 * thicknessM);
  const centerZ = depthM + thicknessM / 2;
  const doorHeight = round(H + overhangM);
  const mountY = column.mountHeightM ?? 0;
  const centerY = mountY + H / 2;

  const piece = (p: Omit<PanelPiece, "id" | "moduleId" | "columnId">): PanelPiece => ({
    id: `${column.id}-fulldoor-${p.hinge ?? "single"}-${Math.random().toString(36).slice(2, 8)}`,
    moduleId: "__fulldoor__",
    columnId: column.id,
    ...p,
  });

  if (config.hinge === "double") {
    const doorWidth = round((innerWidth + overhangM) / 2);
    return [
      piece({
        role: "door-front",
        orientation: "vertical-xy",
        widthM: doorWidth,
        heightM: doorHeight,
        thicknessMm,
        isHardware: false,
        centerX: columnX0 + doorWidth / 2,
        centerY,
        centerZ,
        sizeX: doorWidth,
        sizeY: doorHeight,
        sizeZ: thicknessM,
        hinge: "left",
        handle: config.handle ?? true,
      }),
      piece({
        role: "door-front",
        orientation: "vertical-xy",
        widthM: doorWidth,
        heightM: doorHeight,
        thicknessMm,
        isHardware: false,
        centerX: columnX0 + W - doorWidth / 2,
        centerY,
        centerZ,
        sizeX: doorWidth,
        sizeY: doorHeight,
        sizeZ: thicknessM,
        hinge: "right",
        handle: config.handle ?? true,
      }),
    ];
  }

  const doorWidth = round(innerWidth + overhangM);
  return [
    piece({
      role: "door-front",
      orientation: "vertical-xy",
      widthM: doorWidth,
      heightM: doorHeight,
      thicknessMm,
      isHardware: false,
      centerX: columnX0 + W / 2,
      centerY,
      centerZ,
      sizeX: doorWidth,
      sizeY: doorHeight,
      sizeZ: thicknessM,
      hinge: config.hinge,
      handle: config.handle ?? true,
    }),
  ];
}

export function computePanels(design: Design): PanelPiece[] {
  const { globalParams, columns } = design;
  const { depthM, thicknessMm, backPanelThicknessMm } = globalParams;
  const thicknessM = thicknessMm / 1000;
  const backThicknessM = (backPanelThicknessMm ?? thicknessMm) / 1000;

  const pieces: PanelPiece[] = [];
  let columnX0 = 0;

  for (const column of columns) {
    const H = columnHeightM(column);
    const W = column.widthM;
    const innerWidth = round(W - 2 * thicknessM);
    const mountY = column.mountHeightM ?? 0;

    // Fixed carcass pieces: two sides, back, top cap, bottom cap.
    pieces.push({
      id: `${column.id}-side-left`,
      moduleId: "__carcass__",
      columnId: column.id,
      role: "side-panel",
      orientation: "vertical-yz",
      widthM: depthM,
      heightM: H,
      thicknessMm,
      isHardware: false,
      centerX: columnX0 + thicknessM / 2,
      centerY: mountY + H / 2,
      centerZ: depthM / 2,
      sizeX: thicknessM,
      sizeY: H,
      sizeZ: depthM,
    });
    pieces.push({
      id: `${column.id}-side-right`,
      moduleId: "__carcass__",
      columnId: column.id,
      role: "side-panel",
      orientation: "vertical-yz",
      widthM: depthM,
      heightM: H,
      thicknessMm,
      isHardware: false,
      centerX: columnX0 + W - thicknessM / 2,
      centerY: mountY + H / 2,
      centerZ: depthM / 2,
      sizeX: thicknessM,
      sizeY: H,
      sizeZ: depthM,
    });
    pieces.push({
      id: `${column.id}-back`,
      moduleId: "__carcass__",
      columnId: column.id,
      role: "back-panel",
      orientation: "vertical-xy",
      widthM: innerWidth,
      heightM: H,
      thicknessMm: backPanelThicknessMm ?? thicknessMm,
      isHardware: false,
      centerX: columnX0 + W / 2,
      centerY: mountY + H / 2,
      centerZ: backThicknessM / 2,
      sizeX: innerWidth,
      sizeY: H,
      sizeZ: backThicknessM,
    });
    if (H > 0) {
      pieces.push({
        id: `${column.id}-cap-bottom`,
        moduleId: "__carcass__",
        columnId: column.id,
        role: "shelf",
        orientation: "horizontal-xz",
        widthM: innerWidth,
        heightM: depthM,
        thicknessMm,
        isHardware: false,
        centerX: columnX0 + W / 2,
        centerY: mountY + thicknessM / 2,
        centerZ: depthM / 2,
        sizeX: innerWidth,
        sizeY: thicknessM,
        sizeZ: depthM,
      });
      pieces.push({
        id: `${column.id}-cap-top`,
        moduleId: "__carcass__",
        columnId: column.id,
        role: "shelf",
        orientation: "horizontal-xz",
        widthM: innerWidth,
        heightM: depthM,
        thicknessMm,
        isHardware: false,
        centerX: columnX0 + W / 2,
        centerY: mountY + H - thicknessM / 2,
        centerZ: depthM / 2,
        sizeX: innerWidth,
        sizeY: thicknessM,
        sizeZ: depthM,
      });
    }

    let yBottom = mountY;
    for (const mod of column.modules) {
      pieces.push(...genModulePieces(mod, { column, columnX0, globalParams, yBottom }));
      yBottom += mod.heightM;
    }

    pieces.push(...genFullDoorPieces(column, columnX0, globalParams, H));

    columnX0 += W;
  }

  return pieces;
}
