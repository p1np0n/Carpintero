"use client";

import * as React from "react";
import { ArrowUpDown, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDesignStore } from "@/store/design-store";
import { MODULE_TYPE_LABELS } from "@/lib/design-engine/labels";
import { computeLayout2D, type ColumnLayout, type ModuleRect } from "@/lib/design-engine/layout2d";
import type { FullDoorConfig } from "@/lib/design-engine/types";

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
      <div className="flex flex-1 items-end gap-5 overflow-auto p-6">
        {layout.columns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Button onClick={() => addColumn("end")}>
              <Plus /> Agregar la primera columna
            </Button>
          </div>
        ) : (
          <>
            {layout.columns.map((columnLayout) => (
              <ColumnEditor key={columnLayout.column.id} columnLayout={columnLayout} />
            ))}
            <AddColumnSlot heightM={layout.heightM} onAdd={() => addColumn("end")} />
          </>
        )}
      </div>
    </div>
  );
}

/** Vertical dimension line + arrowheads, sized to exactly match a module stack's height. */
function HeightGauge({ heightPx, label }: { heightPx: number; label: string }) {
  return (
    <div className="flex shrink-0 items-stretch text-muted-foreground" style={{ height: heightPx, width: 22 }} title={`Alto: ${label} m`}>
      <svg width="22" height={heightPx} viewBox={`0 0 22 ${heightPx}`}>
        <line x1="11" y1="4" x2="11" y2={heightPx - 4} stroke="currentColor" strokeWidth="1.25" />
        <polyline points="7,9 11,4 15,9" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={`7,${heightPx - 9} 11,${heightPx - 4} 15,${heightPx - 9}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="11" y={heightPx / 2} transform={`rotate(-90 11 ${heightPx / 2})`} textAnchor="middle" fontSize="10" fontWeight={600} fill="currentColor">
          {label} m
        </text>
      </svg>
    </div>
  );
}

/** Horizontal dimension line + arrowheads, sized to exactly match a module stack's width. */
function WidthGauge({ widthPx, label }: { widthPx: number; label: string }) {
  return (
    <div className="flex shrink-0 items-center justify-center text-muted-foreground" style={{ width: widthPx, height: 18 }} title={`Ancho: ${label} m`}>
      <svg width={widthPx} height="18" viewBox={`0 0 ${widthPx} 18`}>
        <line x1="4" y1="9" x2={widthPx - 4} y2="9" stroke="currentColor" strokeWidth="1.25" />
        <polyline points="9,5 4,9 9,13" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={`${widthPx - 9},5 ${widthPx - 4},9 ${widthPx - 9},13`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x={widthPx / 2} y="13" textAnchor="middle" fontSize="10" fontWeight={600} fill="currentColor">
          {label} m
        </text>
      </svg>
    </div>
  );
}

/** Dashed slot to add a new column. Reuses ColumnEditor's exact chrome elements as
 * invisible placeholders (same components/classes, just hidden) so the dashed box lines
 * up pixel-for-pixel with the real module stacks next to it, however that chrome changes. */
function AddColumnSlot({ heightM, onAdd }: { heightM: number; onAdd: () => void }) {
  const heightPx = Math.max(heightM * PX_PER_M, 40);

  return (
    <div className="flex shrink-0 flex-col items-center">
      <Button variant="ghost" size="sm" className="invisible mb-1">
        <Plus className="size-3.5" />
      </Button>
      <button
        type="button"
        onClick={onAdd}
        style={{ height: heightPx, width: 64 }}
        className="flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        title="Agregar columna"
      >
        <Plus className="size-5" />
        <span className="text-[10px] font-medium leading-tight">Columna</span>
      </button>
      <div className="invisible" style={{ height: 18 }} />
      <Button variant="ghost" size="sm" className="invisible mt-1">
        <Plus className="size-3.5" />
      </Button>
      <div className="invisible mt-2 flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" className="size-6">
          <Minus className="size-3.5" />
        </Button>
        <span className="h-6 w-16 text-xs">0</span>
        <span className="text-[10px]">m</span>
      </div>
      <div className="invisible mt-1.5 flex flex-col items-center gap-1">
        <span className="text-[9px] font-medium uppercase tracking-wide">Puerta completa</span>
        <div className="flex items-center justify-center gap-1">
          <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium">Sin puerta</span>
        </div>
      </div>
    </div>
  );
}

const FULL_DOOR_OPTIONS: { value: "none" | "left" | "right" | "double"; label: string }[] = [
  { value: "none", label: "Sin puerta" },
  { value: "left", label: "Izq." },
  { value: "right", label: "Der." },
  { value: "double", label: "Doble" },
];

function FullDoorControl({ columnId, fullDoor }: { columnId: string; fullDoor: FullDoorConfig | undefined }) {
  const setColumnFullDoor = useDesignStore((s) => s.setColumnFullDoor);
  const current = fullDoor?.hinge ?? "none";

  return (
    <div className="mt-1.5 flex flex-col items-center gap-1">
      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Puerta completa</span>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {FULL_DOOR_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              setColumnFullDoor(columnId, opt.value === "none" ? null : { hinge: opt.value, handle: true })
            }
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              current === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-secondary/60"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
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
    <div className="flex shrink-0 flex-col items-center">
      <Button variant="ghost" size="sm" className="mb-1" onClick={() => addModule(column.id, "end")}>
        <Plus className="size-3.5" />
      </Button>
      <div className="flex items-stretch gap-1.5">
        <div className="flex flex-col-reverse overflow-hidden rounded border border-border" style={{ width: widthPx, height: heightPx }}>
          {columnLayout.modules.map((rect) => (
            <ModuleBox key={rect.module.id} columnId={column.id} rect={rect} />
          ))}
          {columnLayout.modules.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Vacío</div>
          )}
        </div>
        <HeightGauge heightPx={heightPx} label={columnLayout.height.toFixed(2)} />
      </div>
      <WidthGauge widthPx={widthPx} label={columnLayout.width.toFixed(2)} />
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
      <FullDoorControl columnId={column.id} fullDoor={column.fullDoor} />
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
