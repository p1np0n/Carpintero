import type { CutlistRow } from "./cutlist";
import type { PanelPiece } from "./panels";

export interface Piece3D extends PanelPiece {
  cutlistId: string;
  /** applied in "open" view mode, meters */
  openTranslation: [number, number, number];
  /** applied in "open" view mode, radians, pivoted at the hinge edge */
  openRotationY: number;
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

  return panels.map((p) => {
    let openTranslation: [number, number, number] = [0, 0, 0];
    let openRotationY = 0;
    let explodeDirection: [number, number, number] = [0, 0, 0];

    switch (p.role) {
      case "door-front":
        openRotationY = p.hinge === "left" ? -Math.PI / 2.2 : Math.PI / 2.2;
        explodeDirection = [0, 0, 1];
        break;
      case "drawer-front":
      case "drawer-back":
      case "drawer-side":
      case "drawer-bottom":
        openTranslation = [0, 0, p.sizeZ + 0.35];
        explodeDirection = [0, 0, 1];
        break;
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
      explodeDirection,
    };
  });
}
