"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function listComments(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carpintero_comments")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function addComment(projectId: string, body: string, shareSlug?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión para comentar");

  const { error } = await supabase.from("carpintero_comments").insert({
    project_id: projectId,
    author_id: user.id,
    author_name: user.email ?? "Usuario",
    body,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/proyectos/${projectId}`);
  if (shareSlug) revalidatePath(`/p/${shareSlug}`);
}
