import type { Column, Design, Module } from "./types";
import { columnHeightM, designHeightM } from "./types";

export interface ModuleRect {
  module: Module;
  /** meters, origin bottom-left of the column */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ColumnLayout {
  column: Column;
  x: number;
  /** meters above the floor where the column's own stack starts (its mount height). */
  y: number;
  width: number;
  height: number;
  modules: ModuleRect[];
}

export interface DesignLayout {
  widthM: number;
  heightM: number;
  columns: ColumnLayout[];
}

export function computeLayout2D(design: Design): DesignLayout {
  const heightM = designHeightM(design);
  const columns: ColumnLayout[] = [];
  let x = 0;

  for (const column of design.columns) {
    const height = columnHeightM(column);
    const mountY = column.mountHeightM ?? 0;
    let y = mountY;
    const modules: ModuleRect[] = column.modules.map((module) => {
      const rect: ModuleRect = { module, x, y, width: column.widthM, height: module.heightM };
      y += module.heightM;
      return rect;
    });
    columns.push({ column, x, y: mountY, width: column.widthM, height, modules });
    x += column.widthM;
  }

  return { widthM: x, heightM, columns };
}
