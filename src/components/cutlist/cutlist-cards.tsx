import { Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { pieceToSvg } from "@/lib/design-engine/export/svg";
import { PANEL_ROLE_LABELS } from "@/lib/design-engine/labels";
import { cutlistRowKey, type CutlistRow } from "@/lib/design-engine/cutlist";

export function CutlistCards({
  rows,
  excludedKeys,
  onToggleExcluded,
}: {
  rows: CutlistRow[];
  /** Omit for a read-only listing (e.g. the public share view) — no toggle button is shown. */
  excludedKeys?: Set<string>;
  onToggleExcluded?: (row: CutlistRow) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((row) => {
        const excluded = excludedKeys?.has(cutlistRowKey(row)) ?? false;
        return (
          <Card key={row.cutlistId} className={cn("relative overflow-hidden p-2", excluded && "opacity-50")}>
            <Badge className="absolute right-2 top-2 z-10">×{row.qty}</Badge>
            {onToggleExcluded && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1 top-1 z-10 size-6 bg-background/70"
                onClick={() => onToggleExcluded(row)}
                title={excluded ? "Volver a incluir esta pieza" : "Ya la tengo — sacarla de la lista"}
              >
                {excluded ? <Undo2 className="size-3.5" /> : <X className="size-3.5" />}
              </Button>
            )}
            <div
              className="flex aspect-square items-center justify-center text-primary [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: pieceToSvg(row) }}
            />
            <p className={cn("mt-1 text-center text-xs font-semibold text-primary", excluded && "line-through")}>
              {row.cutlistId}
            </p>
            <p className="truncate text-center text-[11px] text-muted-foreground">{PANEL_ROLE_LABELS[row.role]}</p>
          </Card>
        );
      })}
    </div>
  );
}
