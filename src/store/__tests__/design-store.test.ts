import { beforeEach, describe, expect, it } from "vitest";
import { useDesignStore } from "@/store/design-store";
import { createEmptyDesign } from "@/lib/design-engine/defaults";

describe("design-store undo/redo", () => {
  beforeEach(() => {
    useDesignStore.setState({
      design: createEmptyDesign(),
      past: [],
      future: [],
      selectedColumnId: null,
      selectedModuleId: null,
    });
  });

  it("does nothing when there is no history", () => {
    const before = useDesignStore.getState().design;
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().design).toBe(before);
    useDesignStore.getState().redo();
    expect(useDesignStore.getState().design).toBe(before);
  });

  it("restores the previous design on undo and reapplies it on redo", () => {
    const original = useDesignStore.getState().design;
    useDesignStore.getState().addColumn("end");
    const afterAdd = useDesignStore.getState().design;
    expect(afterAdd.columns.length).toBe(original.columns.length + 1);

    useDesignStore.getState().undo();
    expect(useDesignStore.getState().design).toBe(original);
    expect(useDesignStore.getState().past.length).toBe(0);
    expect(useDesignStore.getState().future.length).toBe(1);

    useDesignStore.getState().redo();
    expect(useDesignStore.getState().design).toEqual(afterAdd);
    expect(useDesignStore.getState().future.length).toBe(0);
  });

  it("clears redo history when a new change is made after undoing", () => {
    useDesignStore.getState().addColumn("end");
    useDesignStore.getState().undo();
    expect(useDesignStore.getState().future.length).toBe(1);

    useDesignStore.getState().addColumn("start");
    expect(useDesignStore.getState().future.length).toBe(0);
  });

  it("resets selection on undo so a deleted column isn't left selected", () => {
    useDesignStore.getState().addColumn("end");
    const columnId = useDesignStore.getState().design.columns[0].id;
    useDesignStore.getState().select({ columnId });
    useDesignStore.getState().removeColumn(columnId);

    useDesignStore.getState().undo();
    expect(useDesignStore.getState().selectedColumnId).toBeNull();
  });

  it("does not push history for selection-only changes", () => {
    useDesignStore.getState().addColumn("end");
    const columnId = useDesignStore.getState().design.columns[0].id;
    const pastLengthAfterAdd = useDesignStore.getState().past.length;

    useDesignStore.getState().select({ columnId });
    expect(useDesignStore.getState().past.length).toBe(pastLengthAfterAdd);
  });
});
