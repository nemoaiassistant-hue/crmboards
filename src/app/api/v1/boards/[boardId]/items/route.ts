import { createClient } from "@/lib/supabase/server";
import { getOrgId, getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";
import { executeAutomations } from "@/lib/automations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
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

    const { data: items, error } = await supabase
      .from("items")
      .select("*, values:item_values(*)")
      .eq("board_id", boardId)
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
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

    const { name, group_id } = body;
    if (!name || !group_id) {
      return NextResponse.json(
        { error: "name and group_id are required" },
        { status: 400 }
      );
    }

    // Get current max position in group
    const { data: existing } = await supabase
      .from("items")
      .select("position")
      .eq("board_id", boardId)
      .eq("group_id", group_id)
      .order("position", { ascending: false })
      .limit(1);

    const position = (existing?.[0]?.position ?? -1) + 1;

    const { data: item, error } = await supabase
      .from("items")
      .insert({
        board_id: boardId,
        group_id,
        name: name.trim(),
        position,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire item_created automation triggers (non-blocking)
    if (item) {
      executeAutomations(boardId, "item_created", {
        itemId: item.id,
        groupId: group_id,
        boardId,
      }).catch(() => {
        // Silently swallow automation errors
      });
    }

    // Return with empty values array
    return NextResponse.json({ item: { ...item, values: [] } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
