"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Share2, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { publishProject, unpublishProject } from "@/app/actions/projects";
import { toast } from "@/lib/toast-store";

export function ShareDialog({
  projectId,
  isPublic,
  shareSlug,
}: {
  projectId: string;
  isPublic: boolean;
  shareSlug: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const url = shareSlug && typeof window !== "undefined" ? `${window.location.origin}/p/${shareSlug}` : "";

  async function handleToggle(next: boolean) {
    setPending(true);
    try {
      if (next) {
        await publishProject(projectId);
        toast({ title: "Proyecto publicado", description: "El enlace de solo lectura ya está activo." });
      } else {
        await unpublishProject(projectId);
        toast({ title: "Proyecto despublicado" });
      }
      router.refresh();
    } catch (err) {
      toast({ title: "No se pudo actualizar", description: String(err), variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={isPublic ? "secondary" : "default"} size="sm">
          <Share2 /> {isPublic ? "Publicado" : "Publicar"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir proyecto</DialogTitle>
          <DialogDescription>
            Un enlace público de solo lectura para que cualquiera vea este diseño, sin poder editarlo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded border border-border p-3">
          <Label htmlFor="public-switch">Enlace público activo</Label>
          <Switch id="public-switch" checked={isPublic} disabled={pending} onCheckedChange={handleToggle} />
        </div>
        {isPublic && url && (
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="text-xs" />
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="text-primary" /> : <Copy />}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
