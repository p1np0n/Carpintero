"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Redo2, Save, Undo2 } from "lucide-react";
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
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      // Don't hijack native undo inside text fields (project name, dialogs, etc).
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

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
        <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">
          <Redo2 />
        </Button>
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
