import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { SEED_TEMPLATES } from "@/lib/design-engine/templates";
import { renderThumbnailSvg } from "@/lib/design-engine/render-thumbnail";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProjects } = await supabase
    .from("carpintero_projects")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_template", false)
    .order("updated_at", { ascending: false });

  const { data: userTemplates } = await supabase
    .from("carpintero_projects")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_template", true)
    .order("updated_at", { ascending: false });

  const seedTemplates = SEED_TEMPLATES.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    thumbnailSvg: renderThumbnailSvg(t.design),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
        <DashboardTabs
          projects={myProjects ?? []}
          userTemplates={userTemplates ?? []}
          seedTemplates={seedTemplates}
        />
      </main>
    </div>
  );
}
