import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    let query = supabase
      .from("boards")
      .select("*")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: boards, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ boards });
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

    const { name, description, board_type, workspace_id } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Board name is required" },
        { status: 400 }
      );
    }

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Verify workspace belongs to this org
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspace_id)
      .eq("org_id", orgId)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Get current max sort_order for boards in this workspace
    const { data: existing } = await supabase
      .from("boards")
      .select("sort_order")
      .eq("workspace_id", workspace_id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data: board, error } = await supabase
      .from("boards")
      .insert({
        workspace_id,
        org_id: orgId,
        name: name.trim(),
        description: description || null,
        board_type: board_type || "project",
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ board }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
