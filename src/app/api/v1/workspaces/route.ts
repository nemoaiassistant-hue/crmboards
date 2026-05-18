import { createClient } from "@/lib/supabase/server";
import { getOrgId, getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const orgIds = await getAllOrgIds();
    const supabase = await createClient();

    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select("*, boards(*), organizations(id, name)")
      .in("org_id", orgIds)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspaces });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    const supabase = await createClient();
    const body = await request.json();

    const { name, icon } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    // Get current max sort_order for this org
    const { data: existing } = await supabase
      .from("workspaces")
      .select("sort_order")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        org_id: orgId,
        name: name.trim(),
        icon: icon || null,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
