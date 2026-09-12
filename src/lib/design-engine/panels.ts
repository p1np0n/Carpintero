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
  | "legs"
  | "divider";

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

/** One independent physical carcass (box) within a column: its own sides, back panel
 * and top/bottom caps. A column with no `newBoxHere` modules is a single box spanning
 * its full height — the previous, still-default behavior. Setting `newBoxHere` on a
 * module breaks the column into more boxes stacked at that point instead. */
interface BoxSegment {
  yBottom: number;
  heightM: number;
  modules: Module[];
}

function computeBoxSegments(column: Column): BoxSegment[] {
  const segments: BoxSegment[] = [];
  let current: Module[] = [];
  let currentYBottom = column.mountHeightM ?? 0;

  for (const mod of column.modules) {
    if (mod.newBoxHere && current.length > 0) {
      const heightM = current.reduce((sum, m) => sum + m.heightM, 0);
      segments.push({ yBottom: currentYBottom, heightM, modules: current });
      currentYBottom += heightM;
      current = [];
    }
    current.push(mod);
  }
  if (current.length > 0) {
    const heightM = current.reduce((sum, m) => sum + m.heightM, 0);
    segments.push({ yBottom: currentYBottom, heightM, modules: current });
  }
  return segments;
}

/** Vertical divider panels splitting a module's own compartment into equal-width,
 * side-by-side sections — independent of the module's type-specific pieces (shelf
 * board, doors, etc.), so they layer on top of whatever that type already generates. */
function genVerticalDividerPieces(mod: Module, ctx: ModuleCtx): PanelPiece[] {
  const count = mod.verticalDividers ?? 0;
  if (count <= 0) return [];

  const { column, columnX0, globalParams, yBottom } = ctx;
  const { depthM, thicknessMm } = globalParams;
  const thicknessM = thicknessMm / 1000;
  const W = column.widthM;
  const innerWidth = round(W - 2 * thicknessM);
  const innerX0 = columnX0 + thicknessM;
  const sectionWidth = innerWidth / (count + 1);
  const moduleHeight = mod.heightM;

  const pieces: PanelPiece[] = [];
  for (let i = 0; i < count; i += 1) {
    pieces.push({
      id: `${mod.id}-divider-${i}-${Math.random().toString(36).slice(2, 8)}`,
      moduleId: mod.id,
      columnId: column.id,
      role: "divider",
      orientation: "vertical-yz",
      widthM: depthM,
      heightM: moduleHeight,
      thicknessMm,
      isHardware: false,
      centerX: innerX0 + sectionWidth * (i + 1),
      centerY: yBottom + moduleHeight / 2,
      centerZ: depthM / 2,
      sizeX: thicknessM,
      sizeY: moduleHeight,
      sizeZ: depthM,
    });
  }
  return pieces;
}

/** Horizontal shelf boards splitting a module's own compartment into equal-height,
 * stacked sections — same idea as the vertical dividers above but along the module's
 * height instead of its width, e.g. adding internal shelves inside a "doors" module. */
function genHorizontalDividerPieces(mod: Module, ctx: ModuleCtx): PanelPiece[] {
  const count = mod.horizontalDividers ?? 0;
  if (count <= 0) return [];

  const { column, columnX0, globalParams, yBottom } = ctx;
  const { depthM, thicknessMm } = globalParams;
  const thicknessM = thicknessMm / 1000;
  const W = column.widthM;
  const innerWidth = round(W - 2 * thicknessM);
  const centerXCol = columnX0 + W / 2;
  const moduleHeight = mod.heightM;
  const sectionHeight = moduleHeight / (count + 1);

  const pieces: PanelPiece[] = [];
  for (let i = 0; i < count; i += 1) {
    const boundaryY = yBottom + sectionHeight * (i + 1);
    pieces.push({
      id: `${mod.id}-hdivider-${i}-${Math.random().toString(36).slice(2, 8)}`,
      moduleId: mod.id,
      columnId: column.id,
      role: "shelf",
      orientation: "horizontal-xz",
      widthM: innerWidth,
      heightM: depthM,
      thicknessMm,
      isHardware: false,
      centerX: centerXCol,
      centerY: boundaryY - thicknessM / 2,
      centerZ: depthM / 2,
      sizeX: innerWidth,
      sizeY: thicknessM,
      sizeZ: depthM,
    });
  }
  return pieces;
}

function genModulePieces(mod: Module, ctx: ModuleCtx): PanelPiece[] {
  const { column, columnX0, globalParams, yBottom } = ctx;
  const { depthM, thicknessMm, overhangMm, drawerSlideClearanceMm } = globalParams;
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

  const typePieces = ((): PanelPiece[] => {
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
      const rodCenterY = yTop - 0.05;
      const rodCenterZ = depthM * 0.7;
      const bracketSize = Math.max(dM * 1.6, 0.03);
      return [
        piece({
          role: "hanging-rod",
          orientation: "rod",
          widthM: innerWidth,
          heightM: 0,
          thicknessMm: dMm,
          isHardware: true,
          centerX: centerXCol,
          centerY: rodCenterY,
          centerZ: rodCenterZ,
          sizeX: innerWidth,
          sizeY: dM,
          sizeZ: dM,
        }),
        // End brackets mounted flush against each inner side wall, so the rod reads as an
        // installed fixture rather than a bare line floating in empty space.
        piece({
          role: "hanging-rod",
          orientation: "hardware",
          widthM: bracketSize,
          heightM: bracketSize,
          thicknessMm: dMm,
          isHardware: true,
          centerX: columnX0 + thicknessM + bracketSize / 2,
          centerY: rodCenterY,
          centerZ: rodCenterZ,
          sizeX: bracketSize,
          sizeY: bracketSize,
          sizeZ: bracketSize,
        }),
        piece({
          role: "hanging-rod",
          orientation: "hardware",
          widthM: bracketSize,
          heightM: bracketSize,
          thicknessMm: dMm,
          isHardware: true,
          centerX: columnX0 + W - thicknessM - bracketSize / 2,
          centerY: rodCenterY,
          centerZ: rodCenterZ,
          sizeX: bracketSize,
          sizeY: bracketSize,
          sizeZ: bracketSize,
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
      return [
        piece({
          role: mod.type,
          orientation: "horizontal-xz",
          widthM: W,
          heightM: dM,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          // Fills the module's entire reserved height (not just a thin, material-thickness
          // sliver at one edge) so the trim reads as a complete band, not a partial one.
          centerY: yBottom + moduleHeight / 2,
          centerZ: depthM - dM / 2,
          sizeX: W,
          sizeY: moduleHeight,
          sizeZ: dM,
        }),
      ];
    }

    case "doors": {
      // Full-width coverage: each leaf spans half the column's outer width, so the pair
      // sits flush with both outer edges instead of leaving the (2×thickness − overhang)
      // reveal that "innerWidth + overhang" left when overhang was smaller than the two
      // side panels it was meant to cover.
      const doorWidth = round(W / 2);
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
      // Full-width coverage: flush with both outer edges of the column (see "doors" above).
      const doorWidth = round(W);
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
      const bottomDepth = round(Math.max(0.01, innerDepth - 0.05));
      const centerY = yBottom + moduleHeight / 2;

      // Side-mount drawer slides sit between the drawer box and the cabinet's inner
      // walls, so the box has to be narrower than the raw opening by the slides'
      // combined width (~13mm per side, 26mm total by default) — not just a token 1cm
      // gap that left no real room for the hardware once installed.
      const slideClearanceM = (drawerSlideClearanceMm ?? 26) / 1000;
      const sideOffset = round(thicknessM + slideClearanceM / 2);
      const sideCenterInset = round(sideOffset + thicknessM / 2);
      const backWidth = round(Math.max(0.01, innerWidth - slideClearanceM - 2 * thicknessM));

      // Screwed-on bottom (not a routed groove): full board thickness for real strength,
      // spanning the box's whole outer footprint since the sides/back sit directly on top
      // of its edges instead of slotting partway up into them. The rest of the box is
      // raised by that thickness so it rests ON the bottom panel rather than overlapping it.
      const bottomWidth = round(Math.max(0.01, W - 2 * sideOffset));
      const boxCenterY = yBottom + thicknessM + boxHeight / 2;
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
          centerX: columnX0 + sideCenterInset,
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
          centerX: columnX0 + W - sideCenterInset,
          centerY: boxCenterY,
          centerZ: depthM / 2,
          sizeX: thicknessM,
          sizeY: boxHeight,
          sizeZ: sideWidth,
        }),
        piece({
          role: "drawer-bottom",
          orientation: "horizontal-xz",
          widthM: bottomWidth,
          heightM: bottomDepth,
          thicknessMm,
          isHardware: false,
          centerX: centerXCol,
          centerY: yBottom + thicknessM / 2,
          centerZ: depthM / 2,
          sizeX: bottomWidth,
          sizeY: thicknessM,
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
        const subPieces = genModulePieces(subModule, { ...ctx, yBottom: yBottom + i * subHeight });
        // Keep the real (outer) module id on every repeated sub-piece so selecting any of
        // them (e.g. clicking one in the 3D view) resolves back to the actual "multiple"
        // module instead of a synthetic per-repetition id nothing else recognizes.
        pieces.push(...subPieces.map((p) => ({ ...p, moduleId: mod.id })));
      }
      return pieces;
    }

    default:
      return [];
    }
  })();

  return [...typePieces, ...genVerticalDividerPieces(mod, ctx), ...genHorizontalDividerPieces(mod, ctx)];
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
    // Full-width coverage: each leaf spans half the column's outer width (see "doors" in
    // genModulePieces above for why innerWidth + overhang used to leave an edge reveal).
    const doorWidth = round(W / 2);
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

  // Full-width coverage: flush with both outer edges of the column.
  const doorWidth = round(W);
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

    // One column can be one continuous carcass (the default) or several independent
    // boxes stacked on top of each other (see `Module.newBoxHere`) — each box gets its
    // own sides, back panel and top/bottom caps, sized to just that box's height.
    const segments = computeBoxSegments(column);

    segments.forEach((segment, segIdx) => {
      const boxId = `${column.id}-box${segIdx}`;
      const segH = segment.heightM;
      const segY0 = segment.yBottom;

      pieces.push({
        id: `${boxId}-side-left`,
        moduleId: "__carcass__",
        columnId: column.id,
        role: "side-panel",
        orientation: "vertical-yz",
        widthM: depthM,
        heightM: segH,
        thicknessMm,
        isHardware: false,
        centerX: columnX0 + thicknessM / 2,
        centerY: segY0 + segH / 2,
        centerZ: depthM / 2,
        sizeX: thicknessM,
        sizeY: segH,
        sizeZ: depthM,
      });
      pieces.push({
        id: `${boxId}-side-right`,
        moduleId: "__carcass__",
        columnId: column.id,
        role: "side-panel",
        orientation: "vertical-yz",
        widthM: depthM,
        heightM: segH,
        thicknessMm,
        isHardware: false,
        centerX: columnX0 + W - thicknessM / 2,
        centerY: segY0 + segH / 2,
        centerZ: depthM / 2,
        sizeX: thicknessM,
        sizeY: segH,
        sizeZ: depthM,
      });
      pieces.push({
        id: `${boxId}-back`,
        moduleId: "__carcass__",
        columnId: column.id,
        role: "back-panel",
        orientation: "vertical-xy",
        widthM: innerWidth,
        heightM: segH,
        thicknessMm: backPanelThicknessMm ?? thicknessMm,
        isHardware: false,
        centerX: columnX0 + W / 2,
        centerY: segY0 + segH / 2,
        centerZ: backThicknessM / 2,
        sizeX: innerWidth,
        sizeY: segH,
        sizeZ: backThicknessM,
      });
      if (segH > 0) {
        pieces.push({
          id: `${boxId}-cap-bottom`,
          moduleId: "__carcass__",
          columnId: column.id,
          role: "shelf",
          orientation: "horizontal-xz",
          widthM: innerWidth,
          heightM: depthM,
          thicknessMm,
          isHardware: false,
          centerX: columnX0 + W / 2,
          centerY: segY0 + thicknessM / 2,
          centerZ: depthM / 2,
          sizeX: innerWidth,
          sizeY: thicknessM,
          sizeZ: depthM,
        });
        pieces.push({
          id: `${boxId}-cap-top`,
          moduleId: "__carcass__",
          columnId: column.id,
          role: "shelf",
          orientation: "horizontal-xz",
          widthM: innerWidth,
          heightM: depthM,
          thicknessMm,
          isHardware: false,
          centerX: columnX0 + W / 2,
          centerY: segY0 + segH - thicknessM / 2,
          centerZ: depthM / 2,
          sizeX: innerWidth,
          sizeY: thicknessM,
          sizeZ: depthM,
        });
      }

      let yBottom = segY0;
      for (let i = 0; i < segment.modules.length; i += 1) {
        const mod = segment.modules[i];
        pieces.push(...genModulePieces(mod, { column, columnX0, globalParams, yBottom }));
        const yTop = yBottom + mod.heightM;

        // A physical board separating this module from the next one (within the same
        // box), unless one of them already places a board at this exact boundary (a
        // "shelf" module puts one at its own top; a moulding module puts one at its own
        // top/bottom) — avoids a doubled-up board and gives every other module pair
        // (e.g. two stacked hanging-rod sections) a visible wooden divider instead of an
        // invisible seam. At the box's own last module there's no "next" here even if
        // the column continues into another box — that boundary is already covered by
        // this box's top cap meeting the next box's bottom cap.
        const nextMod = segment.modules[i + 1];
        const thisProvidesBoard = mod.type === "shelf" || mod.type === "top-moulding";
        const nextProvidesBoard = nextMod?.type === "bottom-moulding";
        if (nextMod && !thisProvidesBoard && !nextProvidesBoard) {
          pieces.push({
            id: `${boxId}-divider-${i}`,
            moduleId: "__carcass__",
            columnId: column.id,
            role: "shelf",
            orientation: "horizontal-xz",
            widthM: innerWidth,
            heightM: depthM,
            thicknessMm,
            isHardware: false,
            centerX: columnX0 + W / 2,
            centerY: yTop - thicknessM / 2,
            centerZ: depthM / 2,
            sizeX: innerWidth,
            sizeY: thicknessM,
            sizeZ: depthM,
          });
        }

        yBottom = yTop;
      }
    });

    pieces.push(...genFullDoorPieces(column, columnX0, globalParams, H));

    columnX0 += W;
  }

  return pieces;
}

/** Whether a piece would actually be visible looking at the furniture from the front —
 * used to decide which cutlist ID labels to draw on the front elevation without cluttering
 * it with boards that are hidden behind a front (drawer internals, the back panel) or
 * mounting hardware that has no board of its own (hanging-rod brackets). */
export function isFrontVisiblePanel(p: PanelPiece): boolean {
  if (p.role === "back-panel") return false;
  if (p.role === "drawer-back" || p.role === "drawer-side" || p.role === "drawer-bottom") return false;
  if (p.role === "hanging-rod" && p.orientation === "hardware") return false;
  return true;
}
