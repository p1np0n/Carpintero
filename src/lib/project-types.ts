import type { Design } from "@/lib/design-engine/types";
import type { Tables } from "@/lib/supabase/types";

export type ProjectRow = Tables<"carpintero_projects">;
export type ProjectVersionRow = Tables<"carpintero_project_versions">;
export type MaterialRow = Tables<"carpintero_materials">;
export type ProjectMaterialRow = Tables<"carpintero_project_materials">;
export type CommentRow = Tables<"carpintero_comments">;

export interface ProjectWithDesign extends ProjectRow {
  design: Design;
}

function randomSlug(length = 8): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export { randomSlug };
