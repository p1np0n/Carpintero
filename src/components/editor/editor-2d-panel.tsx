"use client";

import * as React from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDesignStore } from "@/store/design-store";
import { MODULE_TYPE_LABELS } from "@/lib/design-engine/labels";

export function Editor2DPanel() {
  const columns = useDesignStore((s) => s.design.columns);
  const addColumn = useDesignStore((s) => s.addColumn);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Alzado frontal</span>
        <Button variant="ghost" size="sm" onClick={() => addColumn("end")}>
          <Plus /> Columna
        </Button>
      </div>
      <div className="flex flex-1 items-stretch gap-1 overflow-auto p-4">
        {columns.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <Button onClick={() => addColumn("end")}>
              <Plus /> Agregar la primera columna
            </Button>
          </div>
        )}
        {columns.map((column) => (
          <ColumnEditor key={column.id} columnId={column.id} />
        ))}
      </div>
    </div>
  );
}

function ColumnEditor({ columnId }: { columnId: string }) {
  const column = useDesignStore((s) => s.design.columns.find((c) => c.id === columnId));
  const setColumnWidth = useDesignStore((s) => s.setColumnWidth);
  const removeColumn = useDesignStore((s) => s.removeColumn);
  const addModule = useDesignStore((s) => s.addModule);

  if (!column) return null;

  return (
    <div className="flex min-w-32 flex-col" style={{ flexGrow: column.widthM, flexBasis: 0 }}>
      <Button variant="ghost" size="sm" className="mb-1" onClick={() => addModule(column.id, "end")}>
        <Plus className="size-3.5" />
      </Button>
      <div className="flex flex-1 flex-col-reverse gap-0.5 overflow-hidden rounded border border-border">
        {column.modules.map((mod) => (
          <ModuleBox key={mod.id} columnId={column.id} moduleId={mod.id} />
        ))}
        {column.modules.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Vacío</div>
        )}
      </div>
      <Button variant="ghost" size="sm" className="mt-1" onClick={() => addModule(column.id, "start")}>
        <Plus className="size-3.5" />
      </Button>
      <div className="mt-2 flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" className="size-6" onClick={() => removeColumn(column.id)}>
          <Minus className="size-3.5" />
        </Button>
        <input
          type="number"
          step={0.01}
          min={0.1}
          value={column.widthM}
          onChange={(e) => setColumnWidth(column.id, Number(e.target.value))}
          className="h-6 w-16 rounded border border-input bg-transparent text-center text-xs"
        />
        <span className="text-[10px] text-muted-foreground">m</span>
      </div>
    </div>
  );
}

function ModuleBox({ columnId, moduleId }: { columnId: string; moduleId: string }) {
  const mod = useDesignStore((s) =>
    s.design.columns.find((c) => c.id === columnId)?.modules.find((m) => m.id === moduleId)
  );
  const isSelected = useDesignStore((s) => s.selectedModuleId === moduleId);
  const select = useDesignStore((s) => s.select);

  if (!mod) return null;

  return (
    <button
      type="button"
      onClick={() => select({ columnId, moduleId })}
      style={{ flexGrow: mod.heightM, flexBasis: 0 }}
      className={cn(
        "relative flex min-h-8 items-center justify-center border-t border-border/60 bg-secondary/30 px-1 text-center text-[11px] leading-tight text-muted-foreground transition-colors first:border-t-0 hover:bg-secondary/60",
        isSelected &&
          "border border-primary bg-[repeating-linear-gradient(45deg,var(--color-primary)_0,var(--color-primary)_2px,transparent_2px,transparent_9px)] bg-primary/10 text-foreground"
      )}
    >
      {MODULE_TYPE_LABELS[mod.type]}
    </button>
  );
}
