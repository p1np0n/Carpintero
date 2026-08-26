"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDesignStore } from "@/store/design-store";

export function GlobalParamsBar() {
  const globalParams = useDesignStore((s) => s.design.globalParams);
  const setGlobalParams = useDesignStore((s) => s.setGlobalParams);

  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-border bg-muted/40 px-4 py-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="depth" className="text-xs text-muted-foreground">
          Profundidad (m)
        </Label>
        <Input
          id="depth"
          type="number"
          step={0.01}
          min={0.1}
          className="h-7 w-20"
          value={globalParams.depthM}
          onChange={(e) => setGlobalParams({ depthM: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="thickness" className="text-xs text-muted-foreground">
          Espesor (mm)
        </Label>
        <Input
          id="thickness"
          type="number"
          step={1}
          min={3}
          className="h-7 w-20"
          value={globalParams.thicknessMm}
          onChange={(e) => setGlobalParams({ thicknessMm: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="overhang" className="text-xs text-muted-foreground">
          Voladizo (mm)
        </Label>
        <Input
          id="overhang"
          type="number"
          step={1}
          min={0}
          className="h-7 w-20"
          value={globalParams.overhangMm}
          onChange={(e) => setGlobalParams({ overhangMm: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
