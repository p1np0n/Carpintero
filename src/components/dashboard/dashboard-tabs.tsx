"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProjectCard } from "@/components/dashboard/project-card";
import { createProject, createProjectFromTemplate, importProjectFromJson } from "@/app/actions/projects";
import { toast } from "@/lib/toast-store";
import type { ProjectRow } from "@/lib/project-types";

interface SeedTemplateSummary {
  slug: string;
  name: string;
  description: string;
  thumbnailSvg: string;
}

export function DashboardTabs({
  projects,
  userTemplates,
  seedTemplates,
}: {
  projects: ProjectRow[];
  userTemplates: ProjectRow[];
  seedTemplates: SeedTemplateSummary[];
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [creating, setCreating] = React.useState(false);

  async function handleNewProject() {
    setCreating(true);
    try {
      const id = await createProject();
      router.push(`/proyectos/${id}`);
    } catch (err) {
      toast({ title: "No se pudo crear el proyecto", description: String(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleUseTemplate(slug: string) {
    setCreating(true);
    try {
      const id = await createProjectFromTemplate(slug);
      router.push(`/proyectos/${id}`);
    } catch (err) {
      toast({ title: "No se pudo usar la plantilla", description: String(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const id = await importProjectFromJson(text);
      router.push(`/proyectos/${id}`);
    } catch (err) {
      toast({ title: "No se pudo importar", description: String(err), variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  }

  return (
    <Tabs defaultValue="projects">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="projects">Mis proyectos</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload /> Importar
          </Button>
          <Button onClick={handleNewProject} disabled={creating}>
            <Plus /> Nuevo proyecto
          </Button>
        </div>
      </div>

      <TabsContent value="projects">
        {projects.length === 0 ? (
          <EmptyState onNew={handleNewProject} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="templates" className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Demos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {seedTemplates.map((t) => (
              <Card key={t.slug} className="overflow-hidden">
                <div
                  className="flex aspect-[4/3] items-center justify-center bg-secondary/40 p-4 text-primary [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: t.thumbnailSvg }}
                />
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                  <CardDescription className="text-xs">{t.description}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => handleUseTemplate(t.slug)}>
                    Usar plantilla
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {userTemplates.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Mis plantillas</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {userTemplates.map((p) => (
                <ProjectCard key={p.id} project={p} isTemplate />
              ))}
            </div>
          </section>
        )}
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">Todavía no tienes proyectos.</p>
        <Button onClick={onNew}>
          <Plus /> Crear tu primer proyecto
        </Button>
      </CardContent>
    </Card>
  );
}
