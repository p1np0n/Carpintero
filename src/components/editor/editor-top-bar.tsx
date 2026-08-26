"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { SaveStatusIndicator } from "@/components/editor/save-status-indicator";
import { VersionHistoryDialog } from "@/components/editor/version-history-dialog";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useDesignStore } from "@/store/design-store";
import { renameProject, saveVersion } from "@/app/actions/projects";
import { toast } from "@/lib/toast-store";

export function EditorTopBar({
  projectId,
  isPublic,
  shareSlug,
}: {
  projectId: string;
  isPublic: boolean;
  shareSlug: string | null;
}) {
  const router = useRouter();
  const projectName = useDesignStore((s) => s.projectName);
  const setProjectName = useDesignStore((s) => s.setProjectName);
  const design = useDesignStore((s) => s.design);

  async function handleNameBlur() {
    try {
      await renameProject(projectId, projectName);
    } catch {
      // best-effort; autosave banner already covers persistence errors
    }
  }

  async function handleSaveVersion() {
    const label = window.prompt("Nombre de esta versión (opcional)") ?? undefined;
    try {
      await saveVersion(projectId, design, label || undefined);
      toast({ title: "Versión guardada" });
    } catch (err) {
      toast({ title: "No se pudo guardar la versión", description: String(err), variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/dashboard" onClick={() => router.push("/dashboard")}>
          <ArrowLeft />
        </Link>
      </Button>
      <Input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        onBlur={handleNameBlur}
        className="h-8 w-48 border-transparent bg-transparent font-medium hover:border-input focus-visible:border-input"
      />
      <SaveStatusIndicator />
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleSaveVersion}>
          <Save /> Guardar versión
        </Button>
        <VersionHistoryDialog projectId={projectId} />
        <ShareDialog projectId={projectId} isPublic={isPublic} shareSlug={shareSlug} />
        <ThemeToggle />
      </div>
    </div>
  );
}
