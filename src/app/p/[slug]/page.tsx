import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { PublicProjectView } from "@/components/public/public-project-view";
import type { Design } from "@/lib/design-engine/types";

export default async function PublicProjectPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("carpintero_projects")
    .select("*")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .single();
  if (!project) notFound();

  const { data: version } = await supabase
    .from("carpintero_project_versions")
    .select("design_json")
    .eq("id", project.current_version_id!)
    .single();
  if (!version) notFound();

  const { data: comments } = await supabase
    .from("carpintero_comments")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user?.email} />
      <PublicProjectView
        project={project}
        design={version.design_json as unknown as Design}
        comments={comments ?? []}
        isLoggedIn={!!user}
      />
    </div>
  );
}
