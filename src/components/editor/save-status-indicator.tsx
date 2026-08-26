"use client";

import { Check, Loader2, AlertTriangle } from "lucide-react";
import { useDesignStore } from "@/store/design-store";

export function SaveStatusIndicator() {
  const status = useDesignStore((s) => s.saveStatus);

  if (status === "idle") return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {status === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin" /> Guardando…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3 text-primary" /> Guardado
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="size-3 text-destructive" /> Error al guardar
        </>
      )}
    </span>
  );
}
