"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SEED_MATERIALS } from "@/lib/design-engine/materials";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function listMaterials() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("carpintero_materials")
    .select("*")
    .or(`owner_id.is.null,owner_id.eq.${user.id}`)
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureSeedMaterials() {
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("carpintero_materials")
    .select("id", { count: "exact", head: true })
    .is("owner_id", null);
  if ((count ?? 0) > 0) return;
  await supabase.from("carpintero_materials").insert(
    SEED_MATERIALS.map((m) => ({
      owner_id: null,
      name: m.name,
      type: m.type,
      thickness_mm: m.thicknessMm,
      price_per_sqm: m.pricePerSqm ?? null,
      price_per_sheet: m.pricePerSheet ?? null,
      sheet_width_m: m.sheetWidthM,
      sheet_height_m: m.sheetHeightM,
      currency: m.currency,
    }))
  );
}

export async function createMaterial(input: {
  name: string;
  type: string;
  thicknessMm: number;
  pricePerSqm?: number;
  pricePerSheet?: number;
  sheetWidthM: number;
  sheetHeightM: number;
  currency: string;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("carpintero_materials").insert({
    owner_id: user.id,
    name: input.name,
    type: input.type,
    thickness_mm: input.thicknessMm,
    price_per_sqm: input.pricePerSqm ?? null,
    price_per_sheet: input.pricePerSheet ?? null,
    sheet_width_m: input.sheetWidthM,
    sheet_height_m: input.sheetHeightM,
    currency: input.currency,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/materiales");
}

export async function deleteMaterial(materialId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("carpintero_materials").delete().eq("id", materialId);
  if (error) throw new Error(error.message);
  revalidatePath("/materiales");
}

export async function listAssignments(projectId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("carpintero_project_materials")
    .select("*")
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  return data;
}

export async function setMaterialAssignment(
  projectId: string,
  scope: "project" | "column" | "module",
  materialId: string,
  targetId?: string
) {
  const { supabase } = await requireUser();
  // target_id uses "" (not null) as the project-scope sentinel: Postgres treats every NULL as
  // distinct for uniqueness, which would break upsert's ON CONFLICT matching for repeated
  // project-level assignments (each save would insert a new row instead of updating).
  const { error } = await supabase
    .from("carpintero_project_materials")
    .upsert(
      { project_id: projectId, scope, target_id: targetId ?? "", material_id: materialId },
      { onConflict: "project_id,scope,target_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/proyectos/${projectId}`);
}

export async function removeMaterialAssignment(projectId: string, scope: string, targetId?: string) {
  const { supabase } = await requireUser();
  let query = supabase.from("carpintero_project_materials").delete().eq("project_id", projectId).eq("scope", scope);
  query = query.eq("target_id", targetId ?? "");
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath(`/proyectos/${projectId}`);
}
