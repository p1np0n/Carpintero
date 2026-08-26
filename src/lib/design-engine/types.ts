/**
 * Core data model for a furniture design. Everything downstream (2D layout,
 * 3D pieces, cutlist, budget, nesting) is derived from a `Design` by pure
 * functions in this package — no side effects, no randomness.
 */

export type ModuleType =
  | "shelf"
  | "drawer"
  | "doors"
  | "left-door"
  | "right-door"
  | "multiple"
  | "hanging-rod"
  | "open"
  | "legs"
  | "top-moulding"
  | "bottom-moulding";

export const MODULE_TYPES: ModuleType[] = [
  "shelf",
  "drawer",
  "doors",
  "left-door",
  "right-door",
  "multiple",
  "hanging-rod",
  "open",
  "legs",
  "top-moulding",
  "bottom-moulding",
];

/** Module types valid as the repeated sub-type inside a "multiple" module. */
export type RepeatableModuleType = Exclude<ModuleType, "multiple">;

export interface Module {
  id: string;
  type: ModuleType;
  /** Height of this module's slice of the column, in meters. */
  heightM: number;

  /** type === "multiple": what to repeat, and how many times. */
  multipleSubtype?: RepeatableModuleType;
  multipleCount?: number;

  /** type === "legs": number of feet and their height. */
  legCount?: number;
  legHeightMm?: number;

  /** type === "hanging-rod": rod diameter. */
  rodDiameterMm?: number;

  /** type === "top-moulding" | "bottom-moulding": trim depth (front overhang). */
  mouldingDepthMm?: number;
}

export interface Column {
  id: string;
  widthM: number;
  /** Stacked bottom (index 0) to top. */
  modules: Module[];
}

export interface GlobalParams {
  depthM: number;
  thicknessMm: number;
  overhangMm: number;
  /** Flat manual cost (hardware, hinges, slides, etc.) added to the budget total. */
  extraCostManual?: number;
  /** Currency code shown in the budget (CLP, USD, MXN, ...). */
  currency?: string;
}

export interface Design {
  globalParams: GlobalParams;
  columns: Column[];
}

export const DEFAULT_GLOBAL_PARAMS: GlobalParams = {
  depthM: 0.45,
  thicknessMm: 18,
  overhangMm: 20,
};

export function columnHeightM(column: Column): number {
  return column.modules.reduce((sum, m) => sum + m.heightM, 0);
}

export function designHeightM(design: Design): number {
  return design.columns.reduce((max, c) => Math.max(max, columnHeightM(c)), 0);
}

export function designWidthM(design: Design): number {
  return design.columns.reduce((sum, c) => sum + c.widthM, 0);
}
