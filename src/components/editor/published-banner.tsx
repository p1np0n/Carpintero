"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateProject } from "@/app/actions/projects";
import { toast } from "@/lib/toast-store";

export function PublishedBanner({ projectId }: { projectId: string }) {
  const router = useRouter();

  async function handleCopy() {
    try {
      const id = await duplicateProject(projectId);
      toast({ title: "Copia creada" });
      router.push(`/proyectos/${id}`);
    } catch (err) {
      toast({ title: "No se pudo copiar", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
      <span className="flex items-center gap-2">
        <AlertTriangle className="size-4" /> Publicado → los cambios aquí afectan la copia pública.
      </span>
      <Button size="sm" variant="outline" onClick={handleCopy}>
        Hacer una copia
      </Button>
    </div>
  );
}
