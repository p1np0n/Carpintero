import * as React from "react";
import { computeLayout2D, type ModuleRect } from "@/lib/design-engine/layout2d";
import type { Design, FullDoorConfig } from "@/lib/design-engine/types";

const GRAPHITE = "#3f3f46";
const GRAPHITE_SOFT = "#3f3f4633";

function ModuleDecoration({ rect, mm }: { rect: ModuleRect; mm: (v: number) => number }) {
  const w = mm(rect.width);
  const h = mm(rect.height);
  const cx = w / 2;
  const cy = h / 2;

  switch (rect.module.type) {
    case "shelf":
      return <line x1={0} y1={4} x2={w} y2={4} stroke={GRAPHITE} strokeWidth={2} />;
    case "drawer":
      return (
        <>
          <line x1={0} y1={3} x2={w} y2={3} stroke={GRAPHITE} strokeWidth={1.5} />
          <rect x={cx - w * 0.12} y={cy - 2} width={w * 0.24} height={4} fill={GRAPHITE} rx={2} />
        </>
      );
    case "doors":
      return (
        <>
          <line x1={cx} y1={2} x2={cx} y2={h - 2} stroke={GRAPHITE} strokeWidth={1.5} />
          <circle cx={cx - w * 0.08} cy={cy} r={3} fill={GRAPHITE} />
          <circle cx={cx + w * 0.08} cy={cy} r={3} fill={GRAPHITE} />
        </>
      );
    case "left-door":
      return <circle cx={w - w * 0.1} cy={cy} r={3} fill={GRAPHITE} />;
    case "right-door":
      return <circle cx={w * 0.1} cy={cy} r={3} fill={GRAPHITE} />;
    case "hanging-rod":
      return (
        <>
          <line x1={4} y1={cy} x2={w - 4} y2={cy} stroke={GRAPHITE} strokeWidth={2} strokeDasharray="6 4" />
          <circle cx={4} cy={cy} r={3} fill={GRAPHITE} />
          <circle cx={w - 4} cy={cy} r={3} fill={GRAPHITE} />
        </>
      );
    case "legs":
      return (
        <>
          <line x1={4} y1={h} x2={4} y2={h - 10} stroke={GRAPHITE} strokeWidth={3} />
          <line x1={w - 4} y1={h} x2={w - 4} y2={h - 10} stroke={GRAPHITE} strokeWidth={3} />
        </>
      );
    case "top-moulding":
    case "bottom-moulding":
      return <rect x={0} y={rect.module.type === "top-moulding" ? h - 6 : 0} width={w} height={6} fill={GRAPHITE} opacity={0.6} />;
    case "multiple": {
      const count = rect.module.multipleCount ?? 1;
      const subHeight = h / count;
      return (
        <>
          {Array.from({ length: count - 1 }).map((_, i) => (
            <line
              key={i}
              x1={0}
              y1={(i + 1) * subHeight}
              x2={w}
              y2={(i + 1) * subHeight}
              stroke={GRAPHITE}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: count }).map((_, i) => (
            <rect
              key={`h-${i}`}
              x={cx - w * 0.12}
              y={i * subHeight + subHeight / 2 - 2}
              width={w * 0.24}
              height={4}
              fill={GRAPHITE}
              rx={2}
            />
          ))}
        </>
      );
    }
    case "open":
    default:
      return null;
  }
}

/** Overlay marking a column-wide door (spanning every module in the column) — an inset
 * dashed outline plus handle knob(s), drawn on top of the column's own outline. */
function FullDoorDecoration({ config, width, y, height }: { config: FullDoorConfig; width: number; y: number; height: number }) {
  const cy = y + height / 2;

  if (config.hinge === "double") {
    const cx = width / 2;
    return (
      <>
        <rect x={3} y={y + 3} width={width - 6} height={height - 6} fill="none" stroke={GRAPHITE} strokeWidth={1.5} strokeDasharray="3 3" />
        <line x1={cx} y1={y + 4} x2={cx} y2={y + height - 4} stroke={GRAPHITE} strokeWidth={1.5} />
        <circle cx={cx - width * 0.06} cy={cy} r={4} fill={GRAPHITE} />
        <circle cx={cx + width * 0.06} cy={cy} r={4} fill={GRAPHITE} />
      </>
    );
  }

  const knobX = config.hinge === "left" ? width - width * 0.08 : width * 0.08;
  return (
    <>
      <rect x={3} y={y + 3} width={width - 6} height={height - 6} fill="none" stroke={GRAPHITE} strokeWidth={1.5} strokeDasharray="3 3" />
      <circle cx={knobX} cy={cy} r={4} fill={GRAPHITE} />
    </>
  );
}

export interface ElevationSvgProps {
  design: Design;
  selectedModuleId?: string | null;
  onSelectModule?: (columnId: string, moduleId: string) => void;
  className?: string;
}

/** Renders the front elevation (alzado) as SVG — the technical schematic used both to
 * edit the design and as a project thumbnail. Meters are scaled to millimeters for a
 * legible viewBox. */
export function ElevationSvg({ design, selectedModuleId, onSelectModule, className }: ElevationSvgProps) {
  const layout = React.useMemo(() => computeLayout2D(design), [design]);
  const mm = (v: number) => Math.round(v * 1000);
  const totalW = mm(layout.widthM) || 1;
  const totalH = mm(layout.heightM) || 1;
  const pad = Math.max(20, Math.round(Math.max(totalW, totalH) * 0.04));

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${totalW + pad * 2} ${totalH + pad * 2}`}
      className={className}
      role="img"
      aria-label="Alzado frontal del mueble"
    >
      <rect
        x={-pad}
        y={-pad}
        width={totalW + pad * 2}
        height={totalH + pad * 2}
        fill="transparent"
      />
      {layout.columns.map((col) => (
        <g key={col.column.id} transform={`translate(${mm(col.x)}, 0)`}>
          {col.modules.map((rect) => {
            const isSelected = rect.module.id === selectedModuleId;
            const svgY = totalH - mm(rect.y) - mm(rect.height);
            return (
              <g
                key={rect.module.id}
                transform={`translate(0, ${svgY})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectModule?.(col.column.id, rect.module.id);
                }}
                style={{ cursor: onSelectModule ? "pointer" : undefined }}
              >
                <rect
                  x={0}
                  y={0}
                  width={mm(rect.width)}
                  height={mm(rect.height)}
                  fill={isSelected ? GRAPHITE_SOFT : "transparent"}
                  stroke={isSelected ? GRAPHITE : "currentColor"}
                  strokeOpacity={isSelected ? 1 : 0.6}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                <ModuleDecoration rect={rect} mm={mm} />
              </g>
            );
          })}
          <rect
            x={0}
            y={totalH - mm(col.y) - mm(col.height)}
            width={mm(col.width)}
            height={mm(col.height)}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.9}
            strokeWidth={2.5}
          />
          {col.column.fullDoor && (
            <FullDoorDecoration
              config={col.column.fullDoor}
              width={mm(col.width)}
              y={totalH - mm(col.y) - mm(col.height)}
              height={mm(col.height)}
            />
          )}
        </g>
      ))}
    </svg>
  );
}
