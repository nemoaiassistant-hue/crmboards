import { createClient } from "@/lib/supabase/server";
import { getOrgId, getAllOrgIds } from "@/lib/auth";
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
            .single();

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const { data: columns, error } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ columns: columns ?? [] });
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

    const { name, column_type, settings } = body;
    if (!name || !column_type) {
      return NextResponse.json(
        { error: "name and column_type are required" },
        { status: 400 }
      );
    }

    // Get current max sort_order
    const { data: existing } = await supabase
      .from("columns")
      .select("sort_order")
      .eq("board_id", boardId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data: column, error } = await supabase
      .from("columns")
      .insert({
        board_id: boardId,
        name: name.trim(),
        column_type,
        settings: settings ?? {},
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ column }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
