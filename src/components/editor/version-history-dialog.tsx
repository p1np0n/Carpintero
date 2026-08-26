"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { History, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listVersions, restoreVersion } from "@/app/actions/projects";
import { toast } from "@/lib/toast-store";

interface VersionSummary {
  id: string;
  label: string | null;
  created_at: string;
  created_by: string | null;
}

export function VersionHistoryDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [versions, setVersions] = React.useState<VersionSummary[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      setVersions(await listVersions(projectId));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!window.confirm("¿Restaurar esta versión? Se creará una nueva versión a partir de ella.")) return;
    try {
      await restoreVersion(projectId, versionId);
      toast({ title: "Versión restaurada" });
      setOpen(false);
      router.refresh();
      window.location.reload();
    } catch (err) {
      toast({ title: "No se pudo restaurar", description: String(err), variant: "destructive" });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History /> Historial
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de versiones</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-auto">
          {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!loading && versions.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay versiones guardadas.</p>
          )}
          {versions.map((v, i) => (
            <div key={v.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
              <div>
                <p className="font-medium">{v.label ?? (i === 0 ? "Versión actual" : "Versión")}</p>
                <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("es-CL")}</p>
              </div>
              {i !== 0 && (
                <Button size="sm" variant="outline" onClick={() => handleRestore(v.id)}>
                  <RotateCcw /> Restaurar
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
