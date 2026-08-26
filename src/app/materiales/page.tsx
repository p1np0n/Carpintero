import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { MaterialsCatalog } from "@/components/materials/materials-catalog";

export default async function MaterialesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: materials } = await supabase
    .from("carpintero_materials")
    .select("*")
    .or(`owner_id.is.null,owner_id.eq.${user.id}`)
    .order("name");

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-8">
        <h1 className="mb-4 text-xl font-semibold">Catálogo de materiales</h1>
        <MaterialsCatalog initialMaterials={materials ?? []} userId={user.id} />
      </main>
    </div>
  );
}
