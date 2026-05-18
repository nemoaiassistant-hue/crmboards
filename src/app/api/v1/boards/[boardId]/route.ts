import { createClient } from "@/lib/supabase/server";
import { getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const orgIds = await getAllOrgIds();
    const supabase = await createClient();

    // Fetch board
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .in("org_id", orgIds)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Fetch columns
    const { data: columns } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("sort_order", { ascending: true });

    // Fetch groups
    const { data: groups } = await supabase
      .from("groups")
      .select("*")
      .eq("board_id", boardId)
      .order("position", { ascending: true });

    // Fetch items with values
    const { data: items } = await supabase
      .from("items")
      .select("*, values:item_values(*)")
      .eq("board_id", boardId)
      .order("position", { ascending: true });

    // Fetch board views
    const { data: views } = await supabase
      .from("board_views")
      .select("*")
      .eq("board_id", boardId);

    return NextResponse.json({
      board: {
        ...board,
        columns: columns ?? [],
        groups: groups ?? [],
        items: items ?? [],
        views: views ?? [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const orgIds = await getAllOrgIds();
    const supabase = await createClient();
    const body = await request.json();

    // Verify ownership
    const { data: existing } = await supabase
      .from("boards")
      .select("id")
      .eq("id", boardId)
      .in("org_id", orgIds)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon !== undefined) updates.icon = body.icon;

    const { data: board, error } = await supabase
      .from("boards")
      .update(updates)
      .eq("id", boardId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ board });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const orgIds = await getAllOrgIds();
    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("boards")
      .select("id")
      .eq("id", boardId)
      .in("org_id", orgIds)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("boards")
      .delete()
      .eq("id", boardId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
