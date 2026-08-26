import { DEFAULT_GLOBAL_PARAMS } from "./types";
import type { Column, Design, Module } from "./types";

let seedCounter = 0;
function id(prefix: string): string {
  seedCounter += 1;
  return `seed-${prefix}-${seedCounter}`;
}

function mod(type: Module["type"], heightM: number, extra: Partial<Module> = {}): Module {
  return { id: id("mod"), type, heightM, ...extra };
}

function col(widthM: number, modules: Module[]): Column {
  return { id: id("col"), widthM, modules };
}

export interface SeedTemplate {
  slug: string;
  name: string;
  description: string;
  design: Design;
}

function closetDesign(): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      col(0.9, [
        mod("bottom-moulding", 0.06),
        mod("hanging-rod", 0.9),
        mod("shelf", 0.35),
        mod("multiple", 0.6, { multipleSubtype: "drawer", multipleCount: 2 }),
        mod("top-moulding", 0.06),
      ]),
      col(0.6, [
        mod("bottom-moulding", 0.06),
        mod("doors", 1.9),
        mod("top-moulding", 0.06),
      ]),
    ],
  };
}

function doubleClosetDesign(): Design {
  const single = closetDesign();
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS },
    columns: [
      ...single.columns,
      col(0.6, [mod("bottom-moulding", 0.06), mod("doors", 1.9), mod("top-moulding", 0.06)]),
      col(0.9, [
        mod("bottom-moulding", 0.06),
        mod("hanging-rod", 0.9),
        mod("shelf", 0.35),
        mod("multiple", 0.6, { multipleSubtype: "drawer", multipleCount: 2 }),
        mod("top-moulding", 0.06),
      ]),
    ],
  };
}

function chestDesign(): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS, depthM: 0.5 },
    columns: [
      col(0.8, [
        mod("legs", 0.12),
        mod("multiple", 0.9, { multipleSubtype: "drawer", multipleCount: 4 }),
      ]),
    ],
  };
}

function sideTableDesign(): Design {
  return {
    globalParams: { ...DEFAULT_GLOBAL_PARAMS, depthM: 0.4, thicknessMm: 20 },
    columns: [
      col(0.45, [mod("legs", 0.35), mod("drawer", 0.12), mod("open", 0.13)]),
    ],
  };
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    slug: "closet",
    name: "Closet",
    description: "Ropero de una puerta con barral, estante y cajones.",
    design: closetDesign(),
  },
  {
    slug: "double-closet",
    name: "Closet doble",
    description: "Closet de cuatro columnas con dos barrales y dos puertas.",
    design: doubleClosetDesign(),
  },
  {
    slug: "chest",
    name: "Cómoda",
    description: "Cómoda de 4 cajones con patas.",
    design: chestDesign(),
  },
  {
    slug: "side-table",
    name: "Mesa auxiliar",
    description: "Mesa auxiliar baja con un cajón y espacio abierto.",
    design: sideTableDesign(),
  },
];
