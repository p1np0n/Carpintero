"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "@/app/actions/comments";
import { toast } from "@/lib/toast-store";
import type { CommentRow } from "@/lib/project-types";

export function CommentsSection({
  projectId,
  shareSlug,
  initialComments,
  isLoggedIn,
}: {
  projectId: string;
  shareSlug: string;
  initialComments: CommentRow[];
  isLoggedIn: boolean;
}) {
  const [comments, setComments] = React.useState(initialComments);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await addComment(projectId, body.trim(), shareSlug);
      setComments((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, project_id: projectId, author_id: null, author_name: "Tú", body, created_at: new Date().toISOString() },
      ]);
      setBody("");
    } catch (err) {
      toast({ title: "No se pudo comentar", description: String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4" /> Comentarios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>}
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded border border-border p-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground">{c.author_name ?? "Anónimo"}</p>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
        {isLoggedIn ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe un comentario…"
              className="min-h-9"
            />
            <Button type="submit" size="icon" disabled={sending}>
              <Send />
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>{" "}
            para comentar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
