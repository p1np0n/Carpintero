import type { CutlistRow } from "./cutlist";
import type { PanelPiece } from "./panels";

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

  return panels.map((p) => {
    let openTranslation: [number, number, number] = [0, 0, 0];
    let openRotationY = 0;
    let openRotationX = 0;
    let explodeDirection: [number, number, number] = [0, 0, 0];

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
        explodeDirection = [p.centerX < 0.001 ? -1 : 1, 0, 0];
        break;
      case "shelf":
      case "top-moulding":
      case "bottom-moulding":
        explodeDirection = [0, p.role === "bottom-moulding" ? -1 : 1, 0];
        break;
      case "hanging-rod":
        explodeDirection = [0, 1, 0];
        break;
      case "legs":
        explodeDirection = [0, -1, 0];
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
    };
  });
}
