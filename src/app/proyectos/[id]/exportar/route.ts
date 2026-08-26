import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, ctx: RouteContext<"/proyectos/[id]/exportar">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: project } = await supabase.from("carpintero_projects").select("*").eq("id", id).single();
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const { data: version } = await supabase
    .from("carpintero_project_versions")
    .select("design_json")
    .eq("id", project.current_version_id!)
    .single();
  if (!version) return NextResponse.json({ error: "Sin versión" }, { status: 404 });

  const payload = { name: project.name, design: version.design_json };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^\w.-]+/g, "_")}.json"`,
    },
  });
}
