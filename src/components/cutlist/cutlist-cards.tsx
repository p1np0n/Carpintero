import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { pieceToSvg } from "@/lib/design-engine/export/svg";
import { PANEL_ROLE_LABELS } from "@/lib/design-engine/labels";
import type { CutlistRow } from "@/lib/design-engine/cutlist";

export function CutlistCards({ rows }: { rows: CutlistRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((row) => (
        <Card key={row.cutlistId} className="relative overflow-hidden p-2">
          <Badge className="absolute right-2 top-2 z-10">×{row.qty}</Badge>
          <div
            className="flex aspect-square items-center justify-center text-primary [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: pieceToSvg(row) }}
          />
          <p className="mt-1 text-center text-xs font-semibold text-primary">{row.cutlistId}</p>
          <p className="truncate text-center text-[11px] text-muted-foreground">{PANEL_ROLE_LABELS[row.role]}</p>
        </Card>
      ))}
    </div>
  );
}
