import type { CutlistRow } from "./cutlist";
import type { PanelPiece, PanelRole } from "./panels";

/** Base separation applied to every piece in "exploded" view mode, in meters. */
const EXPLODE_BASE_DIST = 0.6;
/** Extra separation added per stacking rank so vertically-stacked layers (shelves, caps,
 * dividers, mouldings, rods, legs) fan out instead of sliding as one still-crowded block. */
const EXPLODE_LAYER_GAP = 0.15;

/** Piece roles that stack vertically within a column and should fan out by rank when exploded. */
const VERTICAL_FAMILY_ROLES: readonly PanelRole[] = [
  "shelf",
  "top-moulding",
  "bottom-moulding",
  "hanging-rod",
  "legs",
];

export interface Piece3D extends PanelPiece {
  cutlistId: string;
  /** applied in "open" view mode, meters */
  openTranslation: [number, number, number];
  /** applied in "open" view mode, radians, pivoted at the hinge edge (left/right hinge) */
  openRotationY: number;
  /** applied in "open" view mode, radians, pivoted at the hinge edge (up/down hinge) */
  openRotationX: number;
  /** unit-ish direction the piece is pushed along in "exploded" view mode */
  explodeDirection: [number, number, number];
  /** meters to move along explodeDirection in "exploded" view mode */
  explodeDistance: number;
}

export function pieceIdToCutlistId(rows: CutlistRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    for (const pieceId of row.pieceIds) {
      map.set(pieceId, row.cutlistId);
    }
  }
  return map;
}

export function computePieces3D(panels: PanelPiece[], rows: CutlistRow[]): Piece3D[] {
  const cutlistIdByPieceId = pieceIdToCutlistId(rows);

  // A drawer's front/back/sides/bottom must all pull out by the same distance in "open"
  // mode or the box drifts apart from its own front. Each piece's own sizeZ isn't a valid
  // stand-in for that distance (front/back are as thin as the material, not the drawer's
  // depth), so capture the box's real depth once per module from its side panel instead.
  const drawerDepthByModuleId = new Map<string, number>();
  for (const p of panels) {
    if (p.role === "drawer-side") {
      drawerDepthByModuleId.set(p.moduleId, p.sizeZ);
    }
  }

  // Which side-panel piece is the LEFT one in its own column (smaller centerX) vs. the
  // RIGHT one — comparing centerX to a fixed threshold only ever worked for the very
  // first column, so every other column's sides all exploded toward the same +X side
  // and overlapped their neighbor's.
  const leftSideIdByColumnId = new Map<string, string>();
  for (const columnId of new Set(panels.map((p) => p.columnId))) {
    const [a, b] = panels.filter((p) => p.columnId === columnId && p.role === "side-panel");
    if (a && b) leftSideIdByColumnId.set(columnId, a.centerX <= b.centerX ? a.id : b.id);
  }

  // Rank (bottom to top) of each vertically-stacked piece within its own column, so the
  // exploded view can space layers further apart the further they already are from the
  // floor instead of shifting the whole stack as one rigid, still-crowded block.
  const verticalRankByPieceId = new Map<string, number>();
  for (const columnId of new Set(panels.map((p) => p.columnId))) {
    const verticals = panels
      .filter((p) => p.columnId === columnId && VERTICAL_FAMILY_ROLES.includes(p.role))
      .sort((a, b) => a.centerY - b.centerY);
    verticals.forEach((p, rank) => verticalRankByPieceId.set(p.id, rank));
  }

  return panels.map((p) => {
    let openTranslation: [number, number, number] = [0, 0, 0];
    let openRotationY = 0;
    let openRotationX = 0;
    let explodeDirection: [number, number, number] = [0, 0, 0];
    let explodeDistance = EXPLODE_BASE_DIST;

    switch (p.role) {
      case "door-front":
        if (p.hinge === "up" || p.hinge === "down") {
          openRotationX = p.hinge === "up" ? Math.PI / 2.2 : -Math.PI / 2.2;
        } else {
          openRotationY = p.hinge === "left" ? -Math.PI / 2.2 : Math.PI / 2.2;
        }
        explodeDirection = [0, 0, 1];
        break;
      case "drawer-front":
      case "drawer-back":
      case "drawer-side":
      case "drawer-bottom": {
        const drawerDepth = drawerDepthByModuleId.get(p.moduleId) ?? p.sizeZ;
        openTranslation = [0, 0, drawerDepth + 0.35];
        explodeDirection = [0, 0, 1];
        break;
      }
      case "back-panel":
        explodeDirection = [0, 0, -1];
        break;
      case "side-panel":
        explodeDirection = [leftSideIdByColumnId.get(p.columnId) === p.id ? -1 : 1, 0, 0];
        break;
      case "shelf":
      case "top-moulding":
      case "bottom-moulding":
        explodeDirection = [0, p.role === "bottom-moulding" ? -1 : 1, 0];
        explodeDistance = EXPLODE_BASE_DIST + (verticalRankByPieceId.get(p.id) ?? 0) * EXPLODE_LAYER_GAP;
        break;
      case "hanging-rod":
        explodeDirection = [0, 1, 0];
        explodeDistance = EXPLODE_BASE_DIST + (verticalRankByPieceId.get(p.id) ?? 0) * EXPLODE_LAYER_GAP;
        break;
      case "legs":
        explodeDirection = [0, -1, 0];
        explodeDistance = EXPLODE_BASE_DIST + (verticalRankByPieceId.get(p.id) ?? 0) * EXPLODE_LAYER_GAP;
        break;
      case "divider":
        explodeDirection = [0, 0, 1];
        break;
      default:
        explodeDirection = [0, 0, 0];
    }

    return {
      ...p,
      cutlistId: cutlistIdByPieceId.get(p.id) ?? "?",
      openTranslation,
      openRotationY,
      openRotationX,
      explodeDirection,
      explodeDistance,
    };
  });
}
