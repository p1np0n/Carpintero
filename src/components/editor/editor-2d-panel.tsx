"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, ArrowUpDown, Plus, Minus } from "lucide-react";
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
/** Horizontal gap between columns (and the add-column slot) — shared by every row so
 * everything (module stacks, width gauges, the total gauge, buttons) stays aligned. */
const COLUMN_GAP_PX = 20;
const ADD_SLOT_WIDTH_PX = 64;
/** Shared classes for the square +/- controls that grow/shrink a column or its modules. */
const RESIZE_BUTTON_CLASS = "flex size-11 shrink-0 items-center justify-center rounded-md border border-input bg-transparent transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40";

export function Editor2DPanel() {
  const design = useDesignStore((s) => s.design);
  const addColumn = useDesignStore((s) => s.addColumn);
  const layout = React.useMemo(() => computeLayout2D(design), [design]);

  const totalWidthPx =
    layout.columns.reduce((sum, c) => sum + Math.max(c.width * PX_PER_M, 80), 0) +
    Math.max(0, layout.columns.length - 1) * COLUMN_GAP_PX;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Alzado frontal</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {layout.columns.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Button onClick={() => addColumn("end")}>
              <Plus /> Agregar la primera columna
            </Button>
          </div>
        ) : (
          <div className="flex w-fit flex-col gap-2">
            {/* Row 1: module stacks + each column's own width gauge, floor-aligned. */}
            <div className="flex items-end" style={{ gap: COLUMN_GAP_PX }}>
              {layout.columns.map((columnLayout) => (
                <ColumnEditorTop key={columnLayout.column.id} columnLayout={columnLayout} />
              ))}
              <AddColumnSlotTop heightM={layout.heightM} onAdd={() => addColumn("end")} />
            </div>

            {/* Row 2: the total-width dimension line, spanning every column above. */}
            <TotalWidthGauge widthPx={totalWidthPx} label={layout.widthM.toFixed(2)} />

            {/* Row 3: per-column controls (add module, move/remove column, full door). */}
            <div className="flex items-start" style={{ gap: COLUMN_GAP_PX }}>
              {layout.columns.map((columnLayout, i) => (
                <ColumnEditorBottom
                  key={columnLayout.column.id}
                  columnLayout={columnLayout}
                  canMoveLeft={i > 0}
                  canMoveRight={i < layout.columns.length - 1}
                />
              ))}
              <div style={{ width: ADD_SLOT_WIDTH_PX }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Vertical dimension line + arrowheads, sized to exactly match a module stack's height. */
function HeightGauge({ heightPx, label }: { heightPx: number; label: string }) {
  const gaugeWidth = 34;
  const lineX = 9;
  const textX = 25;

  return (
    <div className="flex shrink-0 items-stretch text-foreground" style={{ height: heightPx, width: gaugeWidth }} title={`Alto: ${label} m`}>
      <svg width={gaugeWidth} height={heightPx} viewBox={`0 0 ${gaugeWidth} ${heightPx}`}>
        <line x1={lineX} y1="4" x2={lineX} y2={heightPx - 4} stroke="currentColor" strokeWidth="1.75" />
        <polyline points={`${lineX - 5},10 ${lineX},4 ${lineX + 5},10`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={`${lineX - 5},${heightPx - 10} ${lineX},${heightPx - 4} ${lineX + 5},${heightPx - 10}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Text sits in its own column, offset from the dimension line so it never overlaps it. */}
        <text x={textX} y={heightPx / 2} transform={`rotate(-90 ${textX} ${heightPx / 2})`} textAnchor="middle" fontSize="11" fontWeight={700} fill="currentColor">
          {label} m
        </text>
      </svg>
    </div>
  );
}

/** Horizontal dimension line + arrowheads, sized to exactly match a module stack's width. */
function WidthGauge({ widthPx, label }: { widthPx: number; label: string }) {
  const gaugeHeight = 28;
  const lineY = 7;
  const textY = 25;

  return (
    <div className="flex shrink-0 items-center justify-center text-foreground" style={{ width: widthPx, height: gaugeHeight }} title={`Ancho: ${label} m`}>
      <svg width={widthPx} height={gaugeHeight} viewBox={`0 0 ${widthPx} ${gaugeHeight}`}>
        <line x1="4" y1={lineY} x2={widthPx - 4} y2={lineY} stroke="currentColor" strokeWidth="1.75" />
        <polyline points={`10,${lineY - 4} 4,${lineY} 10,${lineY + 4}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={`${widthPx - 10},${lineY - 4} ${widthPx - 4},${lineY} ${widthPx - 10},${lineY + 4}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Text sits in its own row below the dimension line so it never overlaps it. */}
        <text x={widthPx / 2} y={textY} textAnchor="middle" fontSize="11" fontWeight={700} fill="currentColor">
          {label} m
        </text>
      </svg>
    </div>
  );
}

/** Full-width dimension line spanning every column (and the gaps between them), placed
 * right below the row of individual per-column width gauges, for the piece's total width. */
function TotalWidthGauge({ widthPx, label }: { widthPx: number; label: string }) {
  const gaugeHeight = 32;
  const lineY = 8;
  const textY = 29;

  return (
    <div className="shrink-0 text-foreground" style={{ width: widthPx, height: gaugeHeight }} title={`Ancho total: ${label} m`}>
      <svg width={widthPx} height={gaugeHeight} viewBox={`0 0 ${widthPx} ${gaugeHeight}`}>
        <line x1="4" y1={lineY} x2={widthPx - 4} y2={lineY} stroke="currentColor" strokeWidth="2" />
        <polyline points={`11,${lineY - 5} 4,${lineY} 11,${lineY + 5}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={`${widthPx - 11},${lineY - 5} ${widthPx - 4},${lineY} ${widthPx - 11},${lineY + 5}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x={widthPx / 2} y={textY} textAnchor="middle" fontSize="12" fontWeight={700} fill="currentColor">
          Total: {label} m
        </text>
      </svg>
    </div>
  );
}

/** Top half of the add-column slot (matches ColumnEditorTop): an invisible spacer for the
 * add-module button row, then the dashed clickable box, sized to the piece's total height. */
function AddColumnSlotTop({ heightM, onAdd }: { heightM: number; onAdd: () => void }) {
  const heightPx = Math.max(heightM * PX_PER_M, 40);

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className={cn(RESIZE_BUTTON_CLASS, "invisible mb-1")}>
        <Plus className="size-5" />
      </div>
      <button
        type="button"
        onClick={onAdd}
        style={{ height: heightPx, width: ADD_SLOT_WIDTH_PX }}
        className="flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        title="Agregar columna"
      >
        <Plus className="size-5" />
        <span className="text-[10px] font-medium leading-tight">Columna</span>
      </button>
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

/** Top half of a column: add-module button, module stack + height gauge, width gauge.
 * If the column is mounted above the floor, an empty gap of that height is drawn below
 * the stack (inside the same floor-aligned box) so it visually "hangs" like a wall unit. */
function ColumnEditorTop({ columnLayout }: { columnLayout: ColumnLayout }) {
  const column = columnLayout.column;
  const addModule = useDesignStore((s) => s.addModule);

  const widthPx = Math.max(columnLayout.width * PX_PER_M, 80);
  const stackHeightPx = Math.max(columnLayout.height * PX_PER_M, 40);
  const mountPx = (column.mountHeightM ?? 0) * PX_PER_M;
  const isEmpty = columnLayout.modules.length === 0;

  return (
    <div className="flex shrink-0 flex-col items-center">
      <button
        type="button"
        className={cn(RESIZE_BUTTON_CLASS, "mb-1")}
        onClick={() => addModule(column.id, "end")}
        title="Agregar módulo arriba"
      >
        <Plus className="size-5" />
      </button>
      <div className="flex items-stretch gap-1.5">
        <div className="flex flex-col" style={{ width: widthPx }}>
          <div
            className={cn(
              "flex flex-col-reverse overflow-hidden rounded border",
              isEmpty ? "border-2 border-dashed border-border" : "border-border"
            )}
            style={{ width: widthPx, height: stackHeightPx }}
          >
            {columnLayout.modules.map((rect) => (
              <ModuleBox key={rect.module.id} columnId={column.id} rect={rect} />
            ))}
            {isEmpty && (
              <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center text-[10px] text-muted-foreground">
                <span className="font-medium">Vacío</span>
                <span>Agrega un módulo (+) o quita la columna (−)</span>
              </div>
            )}
          </div>
          {mountPx > 0 && (
            <div
              className="border-x border-dashed border-border/50"
              style={{ height: mountPx }}
              title={`Montada a ${(column.mountHeightM ?? 0).toFixed(2)} m del piso (espacio libre debajo)`}
            />
          )}
        </div>
        <HeightGauge heightPx={stackHeightPx} label={columnLayout.height.toFixed(2)} />
      </div>
      <WidthGauge widthPx={widthPx} label={columnLayout.width.toFixed(2)} />
    </div>
  );
}

/** Bottom half of a column: add-module button, move/remove column + width input,
 * mount-height input (for wall-mounted / hanging units), full-door control. */
function ColumnEditorBottom({
  columnLayout,
  canMoveLeft,
  canMoveRight,
}: {
  columnLayout: ColumnLayout;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}) {
  const column = columnLayout.column;
  const setColumnWidth = useDesignStore((s) => s.setColumnWidth);
  const setColumnMountHeight = useDesignStore((s) => s.setColumnMountHeight);
  const removeColumn = useDesignStore((s) => s.removeColumn);
  const moveColumn = useDesignStore((s) => s.moveColumn);
  const addModule = useDesignStore((s) => s.addModule);

  const widthPx = Math.max(columnLayout.width * PX_PER_M, 80);

  return (
    <div className="flex shrink-0 flex-col items-center" style={{ width: widthPx }}>
      <button
        type="button"
        className={RESIZE_BUTTON_CLASS}
        onClick={() => addModule(column.id, "start")}
        title="Agregar módulo abajo"
      >
        <Plus className="size-5" />
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          className={RESIZE_BUTTON_CLASS}
          onClick={() => moveColumn(column.id, "left")}
          disabled={!canMoveLeft}
          title="Mover columna a la izquierda"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          className={RESIZE_BUTTON_CLASS}
          onClick={() => removeColumn(column.id)}
          title="Quitar columna"
        >
          <Minus className="size-5" />
        </button>
        <button
          type="button"
          className={RESIZE_BUTTON_CLASS}
          onClick={() => moveColumn(column.id, "right")}
          disabled={!canMoveRight}
          title="Mover columna a la derecha"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1">
        <input
          type="number"
          step={0.01}
          min={0.1}
          value={column.widthM}
          onChange={(e) => setColumnWidth(column.id, Number(e.target.value))}
          className="h-6 w-16 rounded border border-input bg-transparent text-center text-xs"
        />
        <span className="text-[10px] text-muted-foreground">m ancho</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1" title="Altura desde el piso — úsalo para muebles aéreos/colgantes">
        <input
          type="number"
          step={0.01}
          min={0}
          value={column.mountHeightM ?? 0}
          onChange={(e) => setColumnMountHeight(column.id, Number(e.target.value))}
          className="h-6 w-16 rounded border border-input bg-transparent text-center text-xs"
        />
        <span className="text-[10px] text-muted-foreground">m piso</span>
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
