import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/auth";
import { NextResponse } from "next/server";

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
      .eq("org_id", orgId)
      .single();

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const { data: automations, error } = await supabase
      .from("automations")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ automations: automations ?? [] });
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
      .eq("org_id", orgId)
      .single();

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const { trigger_type, trigger_config, action_type, action_config } = body;

    // Validate required fields
    const validTriggerTypes = [
      "status_change",
      "date_arrives",
      "item_created",
      "assignee_changed",
    ];
    const validActionTypes = [
      "move_to_group",
      "change_status",
      "notify",
      "create_item",
    ];

    if (!trigger_type || !validTriggerTypes.includes(trigger_type)) {
      return NextResponse.json(
        { error: "Valid trigger_type is required" },
        { status: 400 }
      );
    }

    if (!action_type || !validActionTypes.includes(action_type)) {
      return NextResponse.json(
        { error: "Valid action_type is required" },
        { status: 400 }
      );
    }

    const { data: automation, error } = await supabase
      .from("automations")
      .insert({
        board_id: boardId,
        trigger_type,
        trigger_config: trigger_config || {},
        action_type,
        action_config: action_config || {},
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ automation }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
