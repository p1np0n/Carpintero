"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorTopBar } from "@/components/editor/editor-top-bar";
import { PublishedBanner } from "@/components/editor/published-banner";
import { GlobalParamsBar } from "@/components/editor/global-params-bar";
import { Editor2DPanel } from "@/components/editor/editor-2d-panel";
import { ModulePropertiesPanel } from "@/components/editor/module-properties-panel";
import { View3DPanel } from "@/components/editor/view-3d-panel";
import { CutlistPanel } from "@/components/cutlist/cutlist-panel";
import { useAutosave } from "@/components/editor/use-autosave";
import { useDesignStore } from "@/store/design-store";
import type { Design } from "@/lib/design-engine/types";
import type { ProjectRow } from "@/lib/project-types";

export function ProjectEditor({ project, initialDesign }: { project: ProjectRow; initialDesign: Design }) {
  const loadProject = useDesignStore((s) => s.loadProject);
  const design = useDesignStore((s) => s.design);
  const selectedModuleId = useDesignStore((s) => s.selectedModuleId);
  const select = useDesignStore((s) => s.select);

  React.useEffect(() => {
    loadProject(project.id, project.name, initialDesign);
    // only reload if a different project mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useAutosave(project.id, design);

  return (
    <div className="flex h-screen flex-col">
      <EditorTopBar projectId={project.id} isPublic={project.is_public} shareSlug={project.share_slug} />
      {project.is_public && <PublishedBanner projectId={project.id} />}
      <Tabs defaultValue="design" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-3 py-1.5">
          <TabsList>
            <TabsTrigger value="design">Diseño</TabsTrigger>
            <TabsTrigger value="cutlist">Lista de corte</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="design" className="mt-0 flex min-h-0 flex-1 flex-col">
          <GlobalParamsBar />
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
            <Editor2DPanel />
            <View3DPanel
              design={design}
              selectedModuleId={selectedModuleId}
              onSelectModule={(columnId, moduleId) => select({ columnId, moduleId })}
            />
          </div>
          <ModulePropertiesPanel />
        </TabsContent>
        <TabsContent value="cutlist" className="mt-0 min-h-0 flex-1 overflow-auto">
          <CutlistPanel projectId={project.id} design={design} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
