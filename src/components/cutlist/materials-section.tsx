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
import { ensureSeedMaterials, listAssignments, listMaterials, setMaterialAssignment, updateMaterial } from "@/app/actions/materials";
import { useDesignStore } from "@/store/design-store";
import { formatCurrency } from "@/lib/format";
import { MODULE_TYPE_LABELS } from "@/lib/design-engine/labels";

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
  const sellPrice = useDesignStore((s) => s.design.globalParams.sellPriceManual ?? 0);
  const currency = useDesignStore((s) => s.design.globalParams.currency ?? "CLP");
  const setGlobalParams = useDesignStore((s) => s.setGlobalParams);
  const [priceDrafts, setPriceDrafts] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      await ensureSeedMaterials();
      const [mats, rows] = await Promise.all([listMaterials(), listAssignments(projectId)]);
      const loadedMaterials: Material[] = mats.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        thicknessMm: m.thickness_mm,
        pricePerSqm: m.price_per_sqm,
        pricePerSheet: m.price_per_sheet,
        sheetWidthM: m.sheet_width_m,
        sheetHeightM: m.sheet_height_m,
        currency: m.currency,
      }));
      let loadedAssignments: MaterialAssignment[] = rows.map((r) => ({
        scope: r.scope as MaterialAssignment["scope"],
        targetId: r.target_id ?? undefined,
        materialId: r.material_id,
      }));

      // A project with no material chosen yet defaults to Melamina blanca 15mm instead of
      // staying unassigned (0 cost) until someone picks one from the dropdown.
      const hasProjectMaterial = loadedAssignments.some((a) => a.scope === "project");
      if (!hasProjectMaterial) {
        const defaultMaterial = loadedMaterials.find((m) => m.name === "Melamina blanca 15mm");
        if (defaultMaterial) {
          await setMaterialAssignment(projectId, "project", defaultMaterial.id);
          loadedAssignments = [...loadedAssignments, { scope: "project", materialId: defaultMaterial.id }];
        }
      }

      setMaterials(loadedMaterials);
      setAssignments(loadedAssignments);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);

  async function assign(scope: "project" | "column" | "module" | "back-panel", materialId: string, targetId?: string) {
    await setMaterialAssignment(projectId, scope, materialId, targetId);
    await load();
  }

  const budget = computeBudget(panels, cutlist, materials, assignments, { extraCost, currency });
  const projectMaterialId = assignments.find((a) => a.scope === "project")?.materialId ?? "";
  const backMaterialId = assignments.find((a) => a.scope === "back-panel")?.materialId ?? "";
  const margin = sellPrice > 0 ? sellPrice - budget.grandTotal : null;

  // Every distinct material actually assigned somewhere in this project (project default,
  // back panel, per-column, per-module) — not the whole catalog — since those are the only
  // ones whose price actually affects this project's cost.
  const usedMaterials = React.useMemo(() => {
    const ids = new Set(assignments.map((a) => a.materialId));
    return materials.filter((m) => ids.has(m.id));
  }, [assignments, materials]);
  const usedMaterialsKey = usedMaterials.map((m) => `${m.id}:${m.pricePerSheet ?? ""}`).join("|");

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync drafts when the set of used materials (or their saved prices) changes
    setPriceDrafts(Object.fromEntries(usedMaterials.map((m) => [m.id, m.pricePerSheet != null ? String(m.pricePerSheet) : ""])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- usedMaterialsKey captures every id+price this needs to react to
  }, [usedMaterialsKey]);

  async function savePrice(material: Material) {
    const draft = priceDrafts[material.id];
    if (draft === undefined || draft === "") return;
    const nextPrice = Number(draft);
    if (nextPrice === material.pricePerSheet) return;
    await updateMaterial(material.id, {
      name: material.name,
      type: material.type,
      thicknessMm: material.thicknessMm,
      pricePerSqm: material.pricePerSqm ?? undefined,
      pricePerSheet: nextPrice,
      sheetWidthM: material.sheetWidthM,
      sheetHeightM: material.sheetHeightM,
      currency: material.currency,
    });
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Materiales y presupuesto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
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
            <Label className="text-xs text-muted-foreground" title="Los paneles traseros siempre usan este material, sin importar el material asignado al frente de esa columna o módulo">
              Material de fondo (siempre distinto)
            </Label>
            <Select
              value={backMaterialId}
              onValueChange={(v) => assign("back-panel", v)}
              disabled={loading || materials.length === 0}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Sin asignar" />
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

        {columns.some((c) => c.modules.length > 0) && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground" title="Elige un material solo para este módulo — anula la columna y el proyecto para esa parte del mueble">
              Material por módulo (opcional, para una sola parte)
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {columns.map((c, ci) =>
                c.modules.map((m, mi) => {
                  const modMaterialId = assignments.find((a) => a.scope === "module" && a.targetId === m.id)?.materialId ?? "";
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 truncate text-xs text-muted-foreground" title={`Columna ${ci + 1} · ${MODULE_TYPE_LABELS[m.type]} (#${mi + 1})`}>
                        Col. {ci + 1} · {MODULE_TYPE_LABELS[m.type]}
                      </span>
                      <Select value={modMaterialId} onValueChange={(v) => assign("module", v, m.id)} disabled={loading}>
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue placeholder="Usar el de la columna" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((mat) => (
                            <SelectItem key={mat.id} value={mat.id}>
                              {mat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {usedMaterials.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground" title="El precio de cada material se guarda en el catálogo compartido — afecta a todos los proyectos que usen ese mismo material">
              Valor de cada material usado en este mueble ({currency})
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {usedMaterials.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-xs text-muted-foreground" title={m.name}>
                    {m.name}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={priceDrafts[m.id] ?? ""}
                    onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    onBlur={() => savePrice(m)}
                    placeholder="Valor de la plancha"
                    className="h-8 flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
          <Stat label="Área de tablero" value={`${budget.totalAreaSqm.toFixed(2)} m²`} />
          <Stat label="Materiales" value={formatCurrency(budget.materialsCostTotal, currency)} />
          <Stat label="Herrajes/otros" value={formatCurrency(budget.extraCost, currency)} />
          <Stat label="Total estimado" value={formatCurrency(budget.grandTotal, currency)} emphasis />
        </div>

        <div className="grid gap-4 border-t border-border pt-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" title="Lo que le vas a cobrar al cliente por el mueble terminado — independiente del costo de materiales calculado arriba">
              Precio a cobrar por el mueble ({currency})
            </Label>
            <Input
              type="number"
              min={0}
              value={sellPrice || ""}
              onChange={(e) => setGlobalParams({ sellPriceManual: Number(e.target.value) })}
              placeholder="Ej: 450000"
              className="h-8"
            />
          </div>
          {margin !== null && (
            <Stat
              label="Utilidad (precio a cobrar − costo)"
              value={formatCurrency(margin, currency)}
              emphasis
              tone={margin >= 0 ? "positive" : "negative"}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "positive" | "negative";
}) {
  const sizeClass = emphasis ? "text-lg font-semibold" : "text-sm font-medium";
  const colorClass =
    tone === "positive" ? "text-green-600 dark:text-green-400" : tone === "negative" ? "text-red-600 dark:text-red-400" : "text-primary";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`${sizeClass} ${tone ? colorClass : emphasis ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
