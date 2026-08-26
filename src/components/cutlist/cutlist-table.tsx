import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CutlistRow } from "@/lib/design-engine/cutlist";
import { ORIENTATION_LABELS, PANEL_ROLE_LABELS } from "@/lib/design-engine/labels";

export function CutlistTable({ rows }: { rows: CutlistRow[] }) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <Table>
        <TableHeader>
          <TableRow>
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
          {rows.map((row) => (
            <TableRow key={row.cutlistId}>
              <TableCell className="font-mono text-xs font-semibold text-primary">{row.cutlistId}</TableCell>
              <TableCell>{PANEL_ROLE_LABELS[row.role]}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{ORIENTATION_LABELS[row.orientation]}</TableCell>
              <TableCell className="text-right tabular-nums">{row.widthM.toFixed(3)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.heightM.toFixed(3)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.thicknessMm}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">×{row.qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
