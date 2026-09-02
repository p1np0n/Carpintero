"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Box, Boxes, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ViewMode3D } from "@/components/editor/view-3d-scene";
import type { Design } from "@/lib/design-engine/types";

const View3DScene = dynamic(() => import("@/components/editor/view-3d-scene").then((m) => m.View3DScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Cargando vista 3D…</div>
  ),
});

const MODES: { value: ViewMode3D; label: string; icon: React.ReactNode }[] = [
  { value: "solid", label: "Sólido", icon: <Box className="size-4" /> },
  { value: "open", label: "Abierto", icon: <DoorOpen className="size-4" /> },
  { value: "exploded", label: "Explosionado", icon: <Boxes className="size-4" /> },
];

export function View3DPanel({ design }: { design: Design }) {
  const [mode, setMode] = React.useState<ViewMode3D>("solid");

  return (
    <div className="relative h-full min-h-64 min-w-0 bg-[#161310]">
      <View3DScene design={design} mode={mode} />
      <div className="absolute right-3 top-3 flex gap-1 rounded-md border border-border/50 bg-background/80 p-1 backdrop-blur">
        {MODES.map((m) => (
          <Button
            key={m.value}
            size="icon"
            variant="ghost"
            title={m.label}
            className={cn("size-8", mode === m.value && "bg-primary text-primary-foreground hover:bg-primary/90")}
            onClick={() => setMode(m.value)}
          >
            {m.icon}
          </Button>
        ))}
      </div>
    </div>
  );
}
