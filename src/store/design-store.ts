import { create } from "zustand";
import { createColumn, createModule, createEmptyDesign, nextId } from "@/lib/design-engine/defaults";
import type { Column, Design, FullDoorConfig, GlobalParams, Module, ModuleType } from "@/lib/design-engine/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface DesignStoreState {
  projectId: string | null;
  projectName: string;
  design: Design;
  selectedColumnId: string | null;
  selectedModuleId: string | null;
  saveStatus: SaveStatus;

  loadProject: (projectId: string, name: string, design: Design) => void;
  setProjectName: (name: string) => void;
  setSaveStatus: (status: SaveStatus) => void;

  setGlobalParams: (patch: Partial<GlobalParams>) => void;

  addColumn: (position: "start" | "end") => void;
  removeColumn: (columnId: string) => void;
  duplicateColumn: (columnId: string) => void;
  setColumnWidth: (columnId: string, widthM: number) => void;
  setColumnFullDoor: (columnId: string, fullDoor: FullDoorConfig | null) => void;
  setColumnMountHeight: (columnId: string, mountHeightM: number) => void;
  moveColumn: (columnId: string, direction: "left" | "right") => void;

  addModule: (columnId: string, position: "start" | "end") => void;
  removeModule: (columnId: string, moduleId: string) => void;
  splitModule: (columnId: string, moduleId: string) => void;
  setModuleHeight: (columnId: string, moduleId: string, heightM: number) => void;
  setModuleType: (columnId: string, moduleId: string, type: ModuleType) => void;
  updateModuleProps: (columnId: string, moduleId: string, patch: Partial<Module>) => void;
  moveModule: (columnId: string, moduleId: string, direction: "up" | "down") => void;

  select: (selection: { columnId: string; moduleId?: string } | null) => void;
}

function mapColumn(design: Design, columnId: string, fn: (c: Column) => Column): Design {
  return { ...design, columns: design.columns.map((c) => (c.id === columnId ? fn(c) : c)) };
}

function mapModule(column: Column, moduleId: string, fn: (m: Module) => Module): Column {
  return { ...column, modules: column.modules.map((m) => (m.id === moduleId ? fn(m) : m)) };
}

export const useDesignStore = create<DesignStoreState>((set) => ({
  projectId: null,
  projectName: "Proyecto sin título",
  design: createEmptyDesign(),
  selectedColumnId: null,
  selectedModuleId: null,
  saveStatus: "idle",

  loadProject: (projectId, name, design) =>
    set({ projectId, projectName: name, design, selectedColumnId: null, selectedModuleId: null, saveStatus: "idle" }),

  setProjectName: (name) => set({ projectName: name }),
  setSaveStatus: (status) => set({ saveStatus: status }),

  setGlobalParams: (patch) =>
    set((state) => ({ design: { ...state.design, globalParams: { ...state.design.globalParams, ...patch } } })),

  addColumn: (position) =>
    set((state) => {
      const column = createColumn();
      const columns =
        position === "start" ? [column, ...state.design.columns] : [...state.design.columns, column];
      return { design: { ...state.design, columns } };
    }),

  removeColumn: (columnId) =>
    set((state) => ({
      design: { ...state.design, columns: state.design.columns.filter((c) => c.id !== columnId) },
      selectedColumnId: state.selectedColumnId === columnId ? null : state.selectedColumnId,
      selectedModuleId: state.selectedColumnId === columnId ? null : state.selectedModuleId,
    })),

  duplicateColumn: (columnId) =>
    set((state) => {
      const idx = state.design.columns.findIndex((c) => c.id === columnId);
      if (idx < 0) return {};
      const original = state.design.columns[idx];
      const clone: Column = {
        ...original,
        id: nextId("col"),
        modules: original.modules.map((m) => ({ ...m, id: nextId("mod") })),
      };
      const columns = [...state.design.columns];
      columns.splice(idx + 1, 0, clone);
      return { design: { ...state.design, columns } };
    }),

  setColumnWidth: (columnId, widthM) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) => ({ ...c, widthM: Math.max(0.1, widthM) })),
    })),

  setColumnFullDoor: (columnId, fullDoor) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) => ({ ...c, fullDoor: fullDoor ?? undefined })),
    })),

  setColumnMountHeight: (columnId, mountHeightM) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) => ({ ...c, mountHeightM: Math.max(0, mountHeightM) })),
    })),

  moveColumn: (columnId, direction) =>
    set((state) => {
      const columns = [...state.design.columns];
      const idx = columns.findIndex((c) => c.id === columnId);
      const target = direction === "left" ? idx - 1 : idx + 1;
      if (idx < 0 || target < 0 || target >= columns.length) return {};
      [columns[idx], columns[target]] = [columns[target], columns[idx]];
      return { design: { ...state.design, columns } };
    }),

  addModule: (columnId, position) =>
    set((state) => {
      const newModule = createModule("shelf", 0.3);
      return {
        design: mapColumn(state.design, columnId, (c) => ({
          ...c,
          modules: position === "start" ? [newModule, ...c.modules] : [...c.modules, newModule],
        })),
      };
    }),

  removeModule: (columnId, moduleId) =>
    set((state) => {
      const column = state.design.columns.find((c) => c.id === columnId);
      if (!column) return {};
      const remaining = column.modules.filter((m) => m.id !== moduleId);

      // Deleting the last module in a column leaves an empty shell with nothing to
      // show — remove the column itself instead of stranding a dangling empty box.
      if (remaining.length === 0) {
        return {
          design: { ...state.design, columns: state.design.columns.filter((c) => c.id !== columnId) },
          selectedColumnId: state.selectedColumnId === columnId ? null : state.selectedColumnId,
          selectedModuleId: null,
        };
      }

      return {
        design: mapColumn(state.design, columnId, (c) => ({ ...c, modules: remaining })),
        selectedModuleId: state.selectedModuleId === moduleId ? null : state.selectedModuleId,
      };
    }),

  splitModule: (columnId, moduleId) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) => {
        const idx = c.modules.findIndex((m) => m.id === moduleId);
        if (idx < 0) return c;
        const target = c.modules[idx];
        const halfHeight = target.heightM / 2;
        if (halfHeight < 0.02) return c;
        const first: Module = { ...target, heightM: halfHeight };
        const second: Module = { ...target, id: nextId("mod"), heightM: halfHeight };
        const modules = [...c.modules];
        modules.splice(idx, 1, first, second);
        return { ...c, modules };
      }),
    })),

  setModuleHeight: (columnId, moduleId, heightM) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) =>
        mapModule(c, moduleId, (m) => ({ ...m, heightM: Math.max(0.02, heightM) }))
      ),
    })),

  setModuleType: (columnId, moduleId, type) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) =>
        mapModule(c, moduleId, (m) => {
          const fresh = createModule(type, m.heightM);
          return { ...fresh, id: m.id, heightM: m.heightM };
        })
      ),
    })),

  updateModuleProps: (columnId, moduleId, patch) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) => mapModule(c, moduleId, (m) => ({ ...m, ...patch }))),
    })),

  moveModule: (columnId, moduleId, direction) =>
    set((state) => ({
      design: mapColumn(state.design, columnId, (c) => {
        const modules = [...c.modules];
        const idx = modules.findIndex((m) => m.id === moduleId);
        const target = direction === "up" ? idx + 1 : idx - 1;
        if (idx < 0 || target < 0 || target >= modules.length) return c;
        [modules[idx], modules[target]] = [modules[target], modules[idx]];
        return { ...c, modules };
      }),
    })),

  select: (selection) =>
    set({ selectedColumnId: selection?.columnId ?? null, selectedModuleId: selection?.moduleId ?? null }),
}));

export { nextId };
