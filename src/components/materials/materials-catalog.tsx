"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMaterial, deleteMaterial, ensureSeedMaterials, updateMaterial } from "@/app/actions/materials";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/toast-store";
import type { MaterialRow } from "@/lib/project-types";

function materialFieldsFromForm(formData: FormData) {
  return {
    name: String(formData.get("name")),
    type: String(formData.get("type")),
    thicknessMm: Number(formData.get("thicknessMm")),
    pricePerSheet: Number(formData.get("pricePerSheet")) || undefined,
    sheetWidthM: Number(formData.get("sheetWidthM")) || 1.83,
    sheetHeightM: Number(formData.get("sheetHeightM")) || 2.44,
    currency: String(formData.get("currency") || "CLP"),
  };
}

function MaterialFormFields({ material }: { material?: MaterialRow }) {
  return (
    <>
      <div className="space-y-1">
        <Label>Nombre</Label>
        <Input name="name" defaultValue={material?.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Input name="type" placeholder="MDF, Melamina…" defaultValue={material?.type} required />
        </div>
        <div className="space-y-1">
          <Label>Espesor (mm)</Label>
          <Input name="thicknessMm" type="number" step={1} defaultValue={material?.thickness_mm} required />
        </div>
        <div className="space-y-1">
          <Label>Precio por plancha</Label>
          <Input name="pricePerSheet" type="number" step={1} defaultValue={material?.price_per_sheet ?? undefined} />
        </div>
        <div className="space-y-1">
          <Label>Moneda</Label>
          <Input name="currency" defaultValue={material?.currency ?? "CLP"} />
        </div>
        <div className="space-y-1">
          <Label>Ancho plancha (m)</Label>
          <Input name="sheetWidthM" type="number" step={0.01} defaultValue={material?.sheet_width_m ?? 1.83} />
        </div>
        <div className="space-y-1">
          <Label>Alto plancha (m)</Label>
          <Input name="sheetHeightM" type="number" step={0.01} defaultValue={material?.sheet_height_m ?? 2.44} />
        </div>
      </div>
    </>
  );
}

export function MaterialsCatalog({ initialMaterials, userId }: { initialMaterials: MaterialRow[]; userId: string }) {
  const [materials, setMaterials] = React.useState(initialMaterials);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MaterialRow | null>(null);

  React.useEffect(() => {
    if (materials.length === 0) {
      ensureSeedMaterials().then(() => window.location.reload());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(formData: FormData) {
    await createMaterial(materialFieldsFromForm(formData));
    setOpen(false);
    window.location.reload();
  }

  async function handleUpdate(formData: FormData) {
    if (!editing) return;
    await updateMaterial(editing.id, materialFieldsFromForm(formData));
    setEditing(null);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar este material?")) return;
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      toast({ title: "No se pudo eliminar", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus /> Nuevo material
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo material</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <MaterialFormFields />
            <DialogFooter>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar material</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-3">
            <MaterialFormFields material={editing ?? undefined} />
            <DialogFooter>
              <Button type="submit">Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {materials.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div>
                <p className="font-medium">
                  {m.name} {m.owner_id === null && <Badge variant="outline">Catálogo</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.type} · {m.thickness_mm} mm · plancha {m.sheet_width_m}×{m.sheet_height_m} m
                </p>
                <p className="text-sm text-primary">
                  {m.price_per_sheet
                    ? `${formatCurrency(m.price_per_sheet, m.currency)} / plancha`
                    : m.price_per_sqm
                      ? `${formatCurrency(m.price_per_sqm, m.currency)} / m²`
                      : "Sin precio"}
                </p>
              </div>
              {m.owner_id === userId && (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(m)} title="Editar precio y datos">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
