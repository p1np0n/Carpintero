import type { Column, Design, Module, ModuleType, RepeatableModuleType } from "./types";
import { DEFAULT_GLOBAL_PARAMS } from "./types";

let counter = 0;
/** Deterministic, dependency-free id generator (crypto.randomUUID is not available in every test env). */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createModule(type: ModuleType = "shelf", heightM = 0.35): Module {
  const base: Module = { id: nextId("mod"), type, heightM };
  if (type === "multiple") {
    base.multipleSubtype = "drawer" as RepeatableModuleType;
    base.multipleCount = 3;
  }
  if (type === "legs") {
    base.legCount = 4;
    base.legHeightMm = 100;
  }
  if (type === "hanging-rod") {
    base.rodDiameterMm = 25;
  }
  if (type === "top-moulding" || type === "bottom-moulding") {
    base.mouldingDepthMm = 40;
  }
  return base;
}

export function createColumn(widthM = 0.6): Column {
  return {
    id: nextId("col"),
    widthM,
    modules: [createModule("shelf", 0.35), createModule("doors", 1.6)],
  };
}

export function createEmptyDesign(): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [createColumn()],
  };
}
