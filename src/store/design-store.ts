import { create } from "zustand";
import { createColumn, createModule, createEmptyDesign, nextId } from "@/lib/design-engine/defaults";
import type { Column, Design, FullDoorConfig, GlobalParams, Module, ModuleType } from "@/lib/design-engine/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** How many past design snapshots (and, symmetrically, redo steps) are kept. */
const MAX_HISTORY = 50;

interface DesignStoreState {
  projectId: string | null;
  projectName: string;
  design: Design;
  /** Design snapshots to restore on undo, most recent last. */
  past: Design[];
  /** Design snapshots to restore on redo, most recent first. */
  future: Design[];
  selectedColumnId: string | null;
  selectedModuleId: string | null;
  saveStatus: SaveStatus;

  loadProject: (projectId: string, name: string, design: Design) => void;
  setProjectName: (name: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  undo: () => void;
  redo: () => void;

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

export const useDesignStore = create<DesignStoreState>((set) => {
  // Every design-mutating action goes through this instead of calling `set` directly, so
  // undo/redo history stays correct without each action having to manage it by hand: the
  // design *before* this change is pushed onto `past`, and any pending redo is discarded
  // (redoing after a fresh edit would resurrect a branch that no longer makes sense).
  // Actions that don't touch `design` (selection, project name, save status) skip this.
  const updateDesign = (produce: (state: DesignStoreState) => Partial<DesignStoreState>) => {
    set((state) => {
      const patch = produce(state);
      if (patch.design === undefined) return patch;
      return {
        ...patch,
        past: [...state.past, state.design].slice(-MAX_HISTORY),
        future: [],
      };
    });
  };

  return {
    projectId: null,
    projectName: "Proyecto sin título",
    design: createEmptyDesign(),
    past: [],
    future: [],
    selectedColumnId: null,
    selectedModuleId: null,
    saveStatus: "idle",

    loadProject: (projectId, name, design) =>
      set({
        projectId,
        projectName: name,
        design,
        past: [],
        future: [],
        selectedColumnId: null,
        selectedModuleId: null,
        saveStatus: "idle",
      }),

    setProjectName: (name) => set({ projectName: name }),
    setSaveStatus: (status) => set({ saveStatus: status }),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return {};
        const previous = state.past[state.past.length - 1];
        return {
          design: previous,
          past: state.past.slice(0, -1),
          future: [state.design, ...state.future].slice(0, MAX_HISTORY),
          selectedColumnId: null,
          selectedModuleId: null,
        };
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return {};
        const [next, ...rest] = state.future;
        return {
          design: next,
          past: [...state.past, state.design].slice(-MAX_HISTORY),
          future: rest,
          selectedColumnId: null,
          selectedModuleId: null,
        };
      }),

    setGlobalParams: (patch) =>
      updateDesign((state) => ({ design: { ...state.design, globalParams: { ...state.design.globalParams, ...patch } } })),

    addColumn: (position) =>
      updateDesign((state) => {
        const column = createColumn();
        const columns =
          position === "start" ? [column, ...state.design.columns] : [...state.design.columns, column];
        return { design: { ...state.design, columns } };
      }),

    removeColumn: (columnId) =>
      updateDesign((state) => ({
        design: { ...state.design, columns: state.design.columns.filter((c) => c.id !== columnId) },
        selectedColumnId: state.selectedColumnId === columnId ? null : state.selectedColumnId,
        selectedModuleId: state.selectedColumnId === columnId ? null : state.selectedModuleId,
      })),

    duplicateColumn: (columnId) =>
      updateDesign((state) => {
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
      updateDesign((state) => ({
        design: mapColumn(state.design, columnId, (c) => ({ ...c, widthM: Math.max(0.1, widthM) })),
      })),

    setColumnFullDoor: (columnId, fullDoor) =>
      updateDesign((state) => ({
        design: mapColumn(state.design, columnId, (c) => ({ ...c, fullDoor: fullDoor ?? undefined })),
      })),

    setColumnMountHeight: (columnId, mountHeightM) =>
      updateDesign((state) => ({
        design: mapColumn(state.design, columnId, (c) => ({ ...c, mountHeightM: Math.max(0, mountHeightM) })),
      })),

    moveColumn: (columnId, direction) =>
      updateDesign((state) => {
        const columns = [...state.design.columns];
        const idx = columns.findIndex((c) => c.id === columnId);
        const target = direction === "left" ? idx - 1 : idx + 1;
        if (idx < 0 || target < 0 || target >= columns.length) return {};
        [columns[idx], columns[target]] = [columns[target], columns[idx]];
        return { design: { ...state.design, columns } };
      }),

    addModule: (columnId, position) =>
      updateDesign((state) => {
        const newModule = createModule("shelf", 0.3);
        return {
          design: mapColumn(state.design, columnId, (c) => ({
            ...c,
            modules: position === "start" ? [newModule, ...c.modules] : [...c.modules, newModule],
          })),
        };
      }),

    removeModule: (columnId, moduleId) =>
      updateDesign((state) => {
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
      updateDesign((state) => ({
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
      updateDesign((state) => ({
        design: mapColumn(state.design, columnId, (c) =>
          mapModule(c, moduleId, (m) => ({ ...m, heightM: Math.max(0.02, heightM) }))
        ),
      })),

    setModuleType: (columnId, moduleId, type) =>
      updateDesign((state) => ({
        design: mapColumn(state.design, columnId, (c) =>
          mapModule(c, moduleId, (m) => {
            const fresh = createModule(type, m.heightM);
            return { ...fresh, id: m.id, heightM: m.heightM };
          })
        ),
      })),

    updateModuleProps: (columnId, moduleId, patch) =>
      updateDesign((state) => ({
        design: mapColumn(state.design, columnId, (c) => mapModule(c, moduleId, (m) => ({ ...m, ...patch }))),
      })),

    moveModule: (columnId, moduleId, direction) =>
      updateDesign((state) => ({
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
  };
});

export { nextId };
