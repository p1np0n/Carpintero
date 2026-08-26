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
    let y = 0;
    const modules: ModuleRect[] = column.modules.map((module) => {
      const rect: ModuleRect = { module, x, y, width: column.widthM, height: module.heightM };
      y += module.heightM;
      return rect;
    });
    columns.push({ column, x, width: column.widthM, height, modules });
    x += column.widthM;
  }

  return { widthM: x, heightM, columns };
}
