import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectEditor } from "@/components/editor/project-editor";
import type { Design } from "@/lib/design-engine/types";

export default async function ProjectPage(props: PageProps<"/proyectos/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("carpintero_projects").select("*").eq("id", id).single();
  if (!project) notFound();
  if (project.owner_id !== user.id) redirect(`/dashboard`);

  const { data: version } = await supabase
    .from("carpintero_project_versions")
    .select("design_json")
    .eq("id", project.current_version_id!)
    .single();
  if (!version) notFound();

  return <ProjectEditor project={project} initialDesign={version.design_json as unknown as Design} />;
}
