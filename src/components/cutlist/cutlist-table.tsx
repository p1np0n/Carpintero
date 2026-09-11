import { Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { cutlistRowKey, type CutlistRow } from "@/lib/design-engine/cutlist";
import { ORIENTATION_LABELS, PANEL_ROLE_LABELS } from "@/lib/design-engine/labels";

export function CutlistTable({
  rows,
  excludedKeys,
  onToggleExcluded,
}: {
  rows: CutlistRow[];
  /** Omit for a read-only listing (e.g. the public share view) — no toggle column is shown. */
  excludedKeys?: Set<string>;
  onToggleExcluded?: (row: CutlistRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {onToggleExcluded && <TableHead className="w-8" />}
            <TableHead>ID</TableHead>
            <TableHead>Pieza</TableHead>
            <TableHead>Orientación</TableHead>
            <TableHead className="text-right">Ancho (m)</TableHead>
            <TableHead className="text-right">Alto (m)</TableHead>
            <TableHead className="text-right">Espesor (mm)</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const excluded = excludedKeys?.has(cutlistRowKey(row)) ?? false;
            return (
              <TableRow key={row.cutlistId} className={cn(excluded && "opacity-50")}>
                {onToggleExcluded && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => onToggleExcluded(row)}
                      title={excluded ? "Volver a incluir esta pieza" : "Ya la tengo — sacarla de la lista"}
                    >
                      {excluded ? <Undo2 className="size-3.5" /> : <X className="size-3.5" />}
                    </Button>
                  </TableCell>
                )}
                <TableCell className={cn("font-mono text-xs font-semibold text-primary", excluded && "line-through")}>
                  {row.cutlistId}
                </TableCell>
                <TableCell className={cn(excluded && "line-through")}>{PANEL_ROLE_LABELS[row.role]}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{ORIENTATION_LABELS[row.orientation]}</TableCell>
                <TableCell className="text-right tabular-nums">{row.widthM.toFixed(3)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.heightM.toFixed(3)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.thicknessMm}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">×{row.qty}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
