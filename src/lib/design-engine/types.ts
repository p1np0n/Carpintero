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

/** A single door (or pair of doors) covering the column's full height, in front of
 * whatever modules it contains — independent of any per-module "doors" module. */
export interface FullDoorConfig {
  hinge: "left" | "right" | "double" | "up" | "down";
  handle?: boolean;
}

export interface Column {
  id: string;
  widthM: number;
  /** Stacked bottom (index 0) to top. */
  modules: Module[];
  /** When set, generates a door (or pair of doors) spanning the entire column height. */
  fullDoor?: FullDoorConfig;
  /** Height above the floor where this column starts, in meters. 0 (default) sits on
   * the floor; a positive value makes it a wall-mounted unit (e.g. an upper kitchen
   * cabinet / "mueble aéreo") with open space underneath. */
  mountHeightM?: number;
}

export interface GlobalParams {
  depthM: number;
  thicknessMm: number;
  overhangMm: number;
  /** Flat manual cost (hardware, hinges, slides, etc.) added to the budget total. */
  extraCostManual?: number;
  /** Currency code shown in the budget (CLP, USD, MXN, ...). */
  currency?: string;
  /** Optional thinner/different thickness for the back panel only (e.g. 3mm hardboard
   * "durolac" or thin plywood behind an 18mm carcass). Falls back to `thicknessMm`. */
  backPanelThicknessMm?: number;
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

/** Height of the column's top edge above the floor: mount height + its own stack height. */
export function columnTopM(column: Column): number {
  return (column.mountHeightM ?? 0) + columnHeightM(column);
}

export function designHeightM(design: Design): number {
  return design.columns.reduce((max, c) => Math.max(max, columnTopM(c)), 0);
}

export function designWidthM(design: Design): number {
  return design.columns.reduce((sum, c) => sum + c.widthM, 0);
}
