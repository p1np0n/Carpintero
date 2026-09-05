"use client";

import { Rows2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDesignStore } from "@/store/design-store";
import { MODULE_TYPES } from "@/lib/design-engine/types";
import type { ModuleType, RepeatableModuleType } from "@/lib/design-engine/types";
import { MODULE_TYPE_LABELS } from "@/lib/design-engine/labels";

export function ModulePropertiesPanel() {
  const selectedColumnId = useDesignStore((s) => s.selectedColumnId);
  const selectedModuleId = useDesignStore((s) => s.selectedModuleId);
  const column = useDesignStore((s) => s.design.columns.find((c) => c.id === selectedColumnId));
  const mod = column?.modules.find((m) => m.id === selectedModuleId);
  const setModuleHeight = useDesignStore((s) => s.setModuleHeight);
  const setModuleType = useDesignStore((s) => s.setModuleType);
  const updateModuleProps = useDesignStore((s) => s.updateModuleProps);
  const removeModule = useDesignStore((s) => s.removeModule);
  const splitModule = useDesignStore((s) => s.splitModule);
  const select = useDesignStore((s) => s.select);

  if (!column || !mod) {
    return (
      <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
        Selecciona un módulo en el alzado para editar sus propiedades.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-4 border-t border-border bg-muted/40 p-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Tipo</Label>
        <Select value={mod.type} onValueChange={(v) => setModuleType(column.id, mod.id, v as ModuleType)}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODULE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {MODULE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ancho (m)</Label>
        <Input value={column.widthM.toFixed(2)} disabled className="h-8 w-24" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Alto (m)</Label>
        <Input
          type="number"
          step={0.01}
          min={0.02}
          value={mod.heightM}
          onChange={(e) => setModuleHeight(column.id, mod.id, Number(e.target.value))}
          className="h-8 w-24"
        />
      </div>

      {mod.type === "multiple" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Repetir</Label>
            <Select
              value={mod.multipleSubtype ?? "drawer"}
              onValueChange={(v) =>
                updateModuleProps(column.id, mod.id, { multipleSubtype: v as RepeatableModuleType })
              }
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_TYPES.filter((t) => t !== "multiple").map((t) => (
                  <SelectItem key={t} value={t}>
                    {MODULE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cantidad</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={mod.multipleCount ?? 1}
              onChange={(e) =>
                updateModuleProps(column.id, mod.id, { multipleCount: Number(e.target.value) })
              }
              className="h-8 w-20"
            />
          </div>
        </>
      )}

      {mod.type === "legs" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">N° de patas</Label>
            <Input
              type="number"
              min={1}
              max={4}
              value={mod.legCount ?? 4}
              onChange={(e) => updateModuleProps(column.id, mod.id, { legCount: Number(e.target.value) })}
              className="h-8 w-20"
            />
          </div>
        </>
      )}

      {mod.type === "hanging-rod" && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Diámetro barral (mm)</Label>
          <Input
            type="number"
            min={10}
            max={50}
            value={mod.rodDiameterMm ?? 25}
            onChange={(e) => updateModuleProps(column.id, mod.id, { rodDiameterMm: Number(e.target.value) })}
            className="h-8 w-24"
          />
        </div>
      )}

      {(mod.type === "top-moulding" || mod.type === "bottom-moulding") && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Profundidad moldura (mm)</Label>
          <Input
            type="number"
            min={10}
            max={100}
            value={mod.mouldingDepthMm ?? 40}
            onChange={(e) =>
              updateModuleProps(column.id, mod.id, { mouldingDepthMm: Number(e.target.value) })
            }
            className="h-8 w-24"
          />
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        disabled={mod.heightM / 2 < 0.02}
        title="Divide este módulo en dos módulos apilados, cada uno con la mitad de la altura"
        onClick={() => splitModule(column.id, mod.id)}
      >
        <Rows2 /> Dividir módulo
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          removeModule(column.id, mod.id);
          select(null);
        }}
      >
        <Trash2 /> Eliminar módulo
      </Button>
    </div>
  );
}
