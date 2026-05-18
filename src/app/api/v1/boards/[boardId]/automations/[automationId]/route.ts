import { createClient } from "@/lib/supabase/server";
import { getOrgId, getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ boardId: string; automationId: string }> }
) {
  try {
    const { boardId, automationId } = await params;
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

    // Build updates object from allowed fields
    const updates: Record<string, unknown> = {};
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.trigger_type !== undefined) updates.trigger_type = body.trigger_type;
    if (body.trigger_config !== undefined)
      updates.trigger_config = body.trigger_config;
    if (body.action_type !== undefined) updates.action_type = body.action_type;
    if (body.action_config !== undefined)
      updates.action_config = body.action_config;

    const { data: automation, error } = await supabase
      .from("automations")
      .update(updates)
      .eq("id", automationId)
      .eq("board_id", boardId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ automation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ boardId: string; automationId: string }> }
) {
  try {
    const { boardId, automationId } = await params;
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
      .from("automations")
      .delete()
      .eq("id", automationId)
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
