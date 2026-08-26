"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeBudget } from "@/lib/design-engine/budget";
import type { PanelPiece } from "@/lib/design-engine/panels";
import type { CutlistRow } from "@/lib/design-engine/cutlist";
import type { Material, MaterialAssignment } from "@/lib/design-engine/materials";
import { ensureSeedMaterials, listAssignments, listMaterials, setMaterialAssignment } from "@/app/actions/materials";
import { useDesignStore } from "@/store/design-store";
import { formatCurrency } from "@/lib/format";

export function MaterialsSection({
  projectId,
  panels,
  cutlist,
}: {
  projectId: string;
  panels: PanelPiece[];
  cutlist: CutlistRow[];
}) {
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [assignments, setAssignments] = React.useState<MaterialAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const columns = useDesignStore((s) => s.design.columns);
  const extraCost = useDesignStore((s) => s.design.globalParams.extraCostManual ?? 0);
  const currency = useDesignStore((s) => s.design.globalParams.currency ?? "CLP");
  const setGlobalParams = useDesignStore((s) => s.setGlobalParams);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      await ensureSeedMaterials();
      const [mats, rows] = await Promise.all([listMaterials(), listAssignments(projectId)]);
      setMaterials(
        mats.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          thicknessMm: m.thickness_mm,
          pricePerSqm: m.price_per_sqm,
          pricePerSheet: m.price_per_sheet,
          sheetWidthM: m.sheet_width_m,
          sheetHeightM: m.sheet_height_m,
          currency: m.currency,
        }))
      );
      setAssignments(
        rows.map((r) => ({
          scope: r.scope as MaterialAssignment["scope"],
          targetId: r.target_id ?? undefined,
          materialId: r.material_id,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);

  async function assign(scope: "project" | "column", materialId: string, targetId?: string) {
    await setMaterialAssignment(projectId, scope, materialId, targetId);
    await load();
  }

  const budget = computeBudget(panels, cutlist, materials, assignments, { extraCost, currency });
  const projectMaterialId = assignments.find((a) => a.scope === "project")?.materialId ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Materiales y presupuesto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Material por defecto del proyecto</Label>
            <Select
              value={projectMaterialId}
              onValueChange={(v) => assign("project", v)}
              disabled={loading || materials.length === 0}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Selecciona un material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Herrajes / otros costos ({currency})</Label>
            <Input
              type="number"
              min={0}
              value={extraCost}
              onChange={(e) => setGlobalParams({ extraCostManual: Number(e.target.value) })}
              className="h-8"
            />
          </div>
        </div>

        {columns.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Material por columna (opcional)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {columns.map((c, i) => {
                const colMaterialId = assignments.find((a) => a.scope === "column" && a.targetId === c.id)?.materialId ?? "";
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs text-muted-foreground">Columna {i + 1}</span>
                    <Select value={colMaterialId} onValueChange={(v) => assign("column", v, c.id)} disabled={loading}>
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder="Usar el del proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
          <Stat label="Área de tablero" value={`${budget.totalAreaSqm.toFixed(2)} m²`} />
          <Stat label="Materiales" value={formatCurrency(budget.materialsCostTotal, currency)} />
          <Stat label="Herrajes/otros" value={formatCurrency(budget.extraCost, currency)} />
          <Stat label="Total estimado" value={formatCurrency(budget.grandTotal, currency)} emphasis />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasis ? "text-lg font-semibold text-primary" : "text-sm font-medium"}>{value}</p>
    </div>
  );
}
