"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ElevationSvg } from "@/components/design/elevation-svg";
import { View3DPanel } from "@/components/editor/view-3d-panel";
import { CutlistTable } from "@/components/cutlist/cutlist-table";
import { CutlistCards } from "@/components/cutlist/cutlist-cards";
import { CommentsSection } from "@/components/public/comments-section";
import { computeDesignMemoized } from "@/lib/design-engine/compute";
import type { Design } from "@/lib/design-engine/types";
import type { CommentRow, ProjectRow } from "@/lib/project-types";

export function PublicProjectView({
  project,
  design,
  comments,
  isLoggedIn,
}: {
  project: ProjectRow;
  design: Design;
  comments: CommentRow[];
  isLoggedIn: boolean;
}) {
  const { cutlist, totals } = React.useMemo(() => computeDesignMemoized(design), [design]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <Badge variant="secondary">Enlace público de solo lectura</Badge>
      </div>

      <Tabs defaultValue="design">
        <TabsList>
          <TabsTrigger value="design">Diseño</TabsTrigger>
          <TabsTrigger value="cutlist">Lista de corte</TabsTrigger>
        </TabsList>
        <TabsContent value="design" className="mt-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="flex aspect-[4/3] items-center justify-center rounded border border-border p-4 text-primary [&_svg]:h-full [&_svg]:w-full">
              <ElevationSvg design={design} />
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded border border-border">
              <View3DPanel design={design} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="cutlist" className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">
            {totals.totalPieces} piezas · {totals.totalAreaSqm.toFixed(2)} m² de tablero
          </p>
          <CutlistTable rows={cutlist} />
          <CutlistCards rows={cutlist} />
        </TabsContent>
      </Tabs>

      <CommentsSection
        projectId={project.id}
        shareSlug={project.share_slug!}
        initialComments={comments}
        isLoggedIn={isLoggedIn}
      />
    </main>
  );
}
