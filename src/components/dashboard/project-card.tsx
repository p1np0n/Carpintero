"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Copy, Pencil, Trash2, BookmarkPlus, Download } from "lucide-react";
import { Card, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProject, duplicateProject, renameProject, saveAsTemplate } from "@/app/actions/projects";
import { toast } from "@/lib/toast-store";
import type { ProjectRow } from "@/lib/project-types";

export function ProjectCard({ project, isTemplate }: { project: ProjectRow; isTemplate?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<unknown>, successMsg?: string) {
    setBusy(true);
    try {
      await fn();
      if (successMsg) toast({ title: successMsg });
      router.refresh();
    } catch (err) {
      toast({
        title: "Ocurrió un error",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="group overflow-hidden">
      <Link href={`/proyectos/${project.id}`} className="block">
        <div
          className="flex aspect-[4/3] items-center justify-center bg-secondary/40 p-4 text-primary [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: project.thumbnail_svg ?? "" }}
        />
      </Link>
      <CardFooter className="flex items-center justify-between gap-2 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <div className="mt-0.5 flex gap-1">
            {project.is_public && <Badge variant="secondary">Publicado</Badge>}
            {isTemplate && <Badge variant="outline">Plantilla</Badge>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={busy} aria-label="Más opciones">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                const name = window.prompt("Nuevo nombre", project.name);
                if (name) run(() => renameProject(project.id, name));
              }}
            >
              <Pencil /> Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(() => duplicateProject(project.id), "Copia creada")}>
              <Copy /> Duplicar
            </DropdownMenuItem>
            {!isTemplate && (
              <DropdownMenuItem onSelect={() => run(() => saveAsTemplate(project.id), "Guardado como plantilla")}>
                <BookmarkPlus /> Guardar como plantilla
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => router.push(`/proyectos/${project.id}/exportar`)}>
              <Download /> Exportar diseño (.json)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                if (window.confirm(`¿Eliminar "${project.name}"? Esta acción no se puede deshacer.`)) {
                  run(() => deleteProject(project.id));
                }
              }}
            >
              <Trash2 /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
