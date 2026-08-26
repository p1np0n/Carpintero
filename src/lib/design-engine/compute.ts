import { computeCutlist, computeCutlistTotals, type CutlistRow, type CutlistTotals } from "./cutlist";
import { computePieces3D, type Piece3D } from "./geometry3d";
import { computeLayout2D, type DesignLayout } from "./layout2d";
import { computePanels, type PanelPiece } from "./panels";
import type { Design } from "./types";

export interface ComputedDesign {
  layout2D: DesignLayout;
  panels: PanelPiece[];
  cutlist: CutlistRow[];
  totals: CutlistTotals;
  pieces3D: Piece3D[];
}

export function computeDesign(design: Design): ComputedDesign {
  const layout2D = computeLayout2D(design);
  const panels = computePanels(design);
  const cutlist = computeCutlist(panels);
  const totals = computeCutlistTotals(cutlist);
  const pieces3D = computePieces3D(panels, cutlist);
  return { layout2D, panels, cutlist, totals, pieces3D };
}

/** Reference-keyed memoization: a new `Design` object (immutable updates, as
 * produced by the Zustand store) recomputes; the same reference is cached. */
const cache = new WeakMap<Design, ComputedDesign>();

export function computeDesignMemoized(design: Design): ComputedDesign {
  const cached = cache.get(design);
  if (cached) return cached;
  const result = computeDesign(design);
  cache.set(design, result);
  return result;
}

export * from "./cutlist";
export * from "./geometry3d";
export * from "./layout2d";
export * from "./panels";
export * from "./types";
