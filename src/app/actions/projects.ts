"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEmptyDesign } from "@/lib/design-engine/defaults";
import { renderThumbnailSvg } from "@/lib/design-engine/render-thumbnail";
import { SEED_TEMPLATES } from "@/lib/design-engine/templates";
import { randomSlug } from "@/lib/project-types";
import type { Design } from "@/lib/design-engine/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createProject(name = "Proyecto sin título", design?: Design) {
  const { supabase, user } = await requireUser();
  const finalDesign = design ?? createEmptyDesign();

  const { data: project, error: projectError } = await supabase
    .from("carpintero_projects")
    .insert({ owner_id: user.id, name, thumbnail_svg: renderThumbnailSvg(finalDesign) })
    .select()
    .single();
  if (projectError || !project) throw new Error(projectError?.message ?? "No se pudo crear el proyecto");

  const { data: version, error: versionError } = await supabase
    .from("carpintero_project_versions")
    .insert({ project_id: project.id, design_json: finalDesign as unknown as never, created_by: user.id })
    .select()
    .single();
  if (versionError || !version) throw new Error(versionError?.message ?? "No se pudo crear la versión inicial");

  await supabase
    .from("carpintero_projects")
    .update({ current_version_id: version.id })
    .eq("id", project.id);

  revalidatePath("/dashboard");
  return project.id as string;
}

export async function createProjectFromTemplate(slug: string) {
  const template = SEED_TEMPLATES.find((t) => t.slug === slug);
  if (!template) throw new Error("Plantilla no encontrada");
  return createProject(template.name, template.design);
}

export async function importProjectFromJson(json: string) {
  let parsed: { name?: string; design: Design };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("El archivo no es un JSON válido");
  }
  if (!parsed.design?.columns) throw new Error("El archivo no tiene un diseño válido");
  return createProject(parsed.name ?? "Proyecto importado", parsed.design);
}

export async function renameProject(projectId: string, name: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("carpintero_projects").update({ name }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/proyectos/${projectId}`);
}

export async function deleteProject(projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("carpintero_projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

async function fetchDesign(projectId: string) {
  const { supabase } = await requireUser();
  const { data: project } = await supabase.from("carpintero_projects").select("*").eq("id", projectId).single();
  if (!project?.current_version_id) return null;
  const { data: version } = await supabase
    .from("carpintero_project_versions")
    .select("design_json")
    .eq("id", project.current_version_id)
    .single();
  if (!version) return null;
  return { project, design: version.design_json as unknown as Design };
}

export async function duplicateProject(projectId: string) {
  const { supabase } = await requireUser();
  const { data: version } = await supabase
    .from("carpintero_projects")
    .select("name, current_version_id")
    .eq("id", projectId)
    .single();
  if (!version) throw new Error("Proyecto no encontrado");

  const { data: versionRow } = await supabase
    .from("carpintero_project_versions")
    .select("design_json")
    .eq("id", version.current_version_id!)
    .single();
  if (!versionRow) throw new Error("Versión no encontrada");

  return createProject(`${version.name} (copia)`, versionRow.design_json as unknown as Design);
}

export async function saveAsTemplate(projectId: string) {
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("carpintero_projects")
    .select("name, current_version_id")
    .eq("id", projectId)
    .single();
  if (!project) throw new Error("Proyecto no encontrado");

  const { data: versionRow } = await supabase
    .from("carpintero_project_versions")
    .select("design_json")
    .eq("id", project.current_version_id!)
    .single();
  if (!versionRow) throw new Error("Versión no encontrada");

  const newId = await createProject(project.name, versionRow.design_json as unknown as Design);
  const { supabase: sb2 } = await requireUser();
  await sb2
    .from("carpintero_projects")
    .update({ is_template: true, template_source: "user" })
    .eq("id", newId);
  revalidatePath("/dashboard");
  return newId;
}

export async function autosaveDesign(projectId: string, design: Design) {
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("carpintero_projects")
    .select("current_version_id")
    .eq("id", projectId)
    .single();
  if (!project?.current_version_id) throw new Error("Proyecto sin versión activa");

  await supabase
    .from("carpintero_project_versions")
    .update({ design_json: design as unknown as never })
    .eq("id", project.current_version_id);

  await supabase
    .from("carpintero_projects")
    .update({ updated_at: new Date().toISOString(), thumbnail_svg: renderThumbnailSvg(design) })
    .eq("id", projectId);
}

export async function saveVersion(projectId: string, design: Design, label?: string) {
  const { supabase, user } = await requireUser();
  const { data: newVersion, error } = await supabase
    .from("carpintero_project_versions")
    .insert({ project_id: projectId, design_json: design as unknown as never, created_by: user.id, label })
    .select()
    .single();
  if (error || !newVersion) throw new Error(error?.message ?? "No se pudo guardar la versión");

  await supabase
    .from("carpintero_projects")
    .update({
      current_version_id: newVersion.id,
      updated_at: new Date().toISOString(),
      thumbnail_svg: renderThumbnailSvg(design),
    })
    .eq("id", projectId);

  revalidatePath(`/proyectos/${projectId}`);
  return newVersion.id as string;
}

export async function listVersions(projectId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("carpintero_project_versions")
    .select("id, label, created_at, created_by")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function restoreVersion(projectId: string, versionId: string) {
  const { supabase } = await requireUser();
  const { data: versionRow, error } = await supabase
    .from("carpintero_project_versions")
    .select("design_json")
    .eq("id", versionId)
    .single();
  if (error || !versionRow) throw new Error(error?.message ?? "Versión no encontrada");

  await saveVersion(projectId, versionRow.design_json as unknown as Design, "Restaurado desde historial");
  revalidatePath(`/proyectos/${projectId}`);
}

export async function publishProject(projectId: string) {
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("carpintero_projects")
    .select("share_slug")
    .eq("id", projectId)
    .single();

  let slug = project?.share_slug ?? null;
  if (!slug) {
    for (let attempt = 0; attempt < 5 && !slug; attempt += 1) {
      const candidate = randomSlug();
      const { data: existing } = await supabase
        .from("carpintero_projects")
        .select("id")
        .eq("share_slug", candidate)
        .maybeSingle();
      if (!existing) slug = candidate;
    }
  }

  const { error } = await supabase
    .from("carpintero_projects")
    .update({ is_public: true, share_slug: slug })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/proyectos/${projectId}`);
  return slug;
}

export async function unpublishProject(projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("carpintero_projects").update({ is_public: false }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/proyectos/${projectId}`);
}

export { fetchDesign };
