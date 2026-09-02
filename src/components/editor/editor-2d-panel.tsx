"use client";

import * as React from "react";
import { ArrowUpDown, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDesignStore } from "@/store/design-store";
import { MODULE_TYPE_LABELS } from "@/lib/design-engine/labels";
import { computeLayout2D, type ColumnLayout, type ModuleRect } from "@/lib/design-engine/layout2d";

/** Pixels per meter — a single fixed scale shared by every column and module so that
 * relative proportions on screen match the real-world proportions used in the 3D view. */
const PX_PER_M = 260;
/** Minimum rendered height for a module box so very short pieces (mouldings, etc.) stay legible. */
const MIN_MODULE_PX = 26;

export function Editor2DPanel() {
  const design = useDesignStore((s) => s.design);
  const addColumn = useDesignStore((s) => s.addColumn);
  const layout = React.useMemo(() => computeLayout2D(design), [design]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Alzado frontal</span>
      </div>
      <div className="flex flex-1 items-end gap-4 overflow-auto p-6">
        {layout.columns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Button onClick={() => addColumn("end")}>
              <Plus /> Agregar la primera columna
            </Button>
          </div>
        ) : (
          <>
            <TotalHeightGauge heightM={layout.heightM} />
            <div className="flex items-end gap-3">
              {layout.columns.map((columnLayout) => (
                <ColumnEditor key={columnLayout.column.id} columnLayout={columnLayout} />
              ))}
              <AddColumnSlot heightPx={layout.heightM * PX_PER_M} onAdd={() => addColumn("end")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Vertical dimension line + arrowheads showing the total height of the piece. */
function TotalHeightGauge({ heightM }: { heightM: number }) {
  if (heightM <= 0) return null;
  const heightPx = Math.max(heightM * PX_PER_M, 40);

  return (
    <div
      className="flex shrink-0 items-stretch text-muted-foreground"
      style={{ height: heightPx, width: 28 }}
      title={`Alto total: ${heightM.toFixed(2)} m`}
    >
      <svg width="28" height={heightPx} viewBox={`0 0 28 ${heightPx}`}>
        <line x1="14" y1="5" x2="14" y2={heightPx - 5} stroke="currentColor" strokeWidth="1.5" />
        <polyline points="9,11 14,5 19,11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={`9,${heightPx - 11} 14,${heightPx - 5} 19,${heightPx - 11}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="14"
          y={heightPx / 2}
          transform={`rotate(-90 14 ${heightPx / 2})`}
          textAnchor="middle"
          fontSize="11"
          fontWeight={600}
          fill="currentColor"
        >
          {heightM.toFixed(2)} m
        </text>
      </svg>
    </div>
  );
}

/** Dashed slot at the end of the last column, at the same height as the piece, to add a new column. */
function AddColumnSlot({ heightPx, onAdd }: { heightPx: number; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      style={{ height: Math.max(heightPx, 40) }}
      className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      title="Agregar columna"
    >
      <Plus className="size-5" />
      <span className="text-[10px] font-medium leading-tight">Columna</span>
    </button>
  );
}

function ColumnEditor({ columnLayout }: { columnLayout: ColumnLayout }) {
  const column = columnLayout.column;
  const setColumnWidth = useDesignStore((s) => s.setColumnWidth);
  const removeColumn = useDesignStore((s) => s.removeColumn);
  const addModule = useDesignStore((s) => s.addModule);

  const widthPx = Math.max(columnLayout.width * PX_PER_M, 80);
  const heightPx = Math.max(columnLayout.height * PX_PER_M, 40);

  return (
    <div className="flex shrink-0 flex-col items-center" style={{ width: widthPx }}>
      <Button variant="ghost" size="sm" className="mb-1" onClick={() => addModule(column.id, "end")}>
        <Plus className="size-3.5" />
      </Button>
      <div
        className="flex w-full flex-col-reverse overflow-hidden rounded border border-border"
        style={{ height: heightPx }}
      >
        {columnLayout.modules.map((rect) => (
          <ModuleBox key={rect.module.id} columnId={column.id} rect={rect} />
        ))}
        {columnLayout.modules.length === 0 && (
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

function ModuleBox({ columnId, rect }: { columnId: string; rect: ModuleRect }) {
  const moduleId = rect.module.id;
  const isSelected = useDesignStore((s) => s.selectedModuleId === moduleId);
  const select = useDesignStore((s) => s.select);

  const heightPx = Math.max(rect.height * PX_PER_M, MIN_MODULE_PX);
  const showDetail = heightPx >= 34;

  return (
    <button
      type="button"
      onClick={() => select({ columnId, moduleId })}
      style={{ height: heightPx }}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-0.5 overflow-hidden border-t border-border/60 bg-secondary/30 px-1.5 text-center leading-tight text-foreground transition-colors first:border-t-0 hover:bg-secondary/60",
        isSelected && "border-2 border-primary bg-primary text-primary-foreground hover:bg-primary"
      )}
    >
      <span className="text-[13px] font-semibold">{MODULE_TYPE_LABELS[rect.module.type]}</span>
      {showDetail && (
        <span
          className={cn(
            "flex items-center gap-0.5 text-[11px] tabular-nums",
            isSelected ? "text-primary-foreground/85" : "text-muted-foreground"
          )}
        >
          {rect.width.toFixed(2)} × <ArrowUpDown className="size-2.5" /> {rect.height.toFixed(2)} m
        </span>
      )}
    </button>
  );
}
