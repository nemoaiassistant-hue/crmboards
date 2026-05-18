import { createClient } from "@/lib/supabase/server";
import { getOrgId, getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ boardId: string; itemId: string }> }
) {
  try {
    const { boardId, itemId } = await params;
    const orgId = await getOrgId();
    const supabase = await createClient();
    const body = await request.json();

    // Verify board belongs to org
    const { data: board } = await supabase
      .from("boards")
      .select("id")
      .eq("id", boardId)
            .single();

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.group_id !== undefined) updates.group_id = body.group_id;
    if (body.position !== undefined) updates.position = body.position;

    const { data: item, error } = await supabase
      .from("items")
      .update(updates)
      .eq("id", itemId)
      .eq("board_id", boardId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ boardId: string; itemId: string }> }
) {
  try {
    const { boardId, itemId } = await params;
    const orgId = await getOrgId();
    const supabase = await createClient();

    // Verify board belongs to org
    const { data: board } = await supabase
      .from("boards")
      .select("id")
      .eq("id", boardId)
            .single();

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId)
      .eq("board_id", boardId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
