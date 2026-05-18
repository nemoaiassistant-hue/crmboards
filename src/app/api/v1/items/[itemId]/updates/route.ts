import { createClient } from "@/lib/supabase/server";
import { getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();

    // Verify item belongs to a board in this org
    const { data: item } = await supabase
      .from("items")
      .select("id, board_id, boards!inner(org_id)")
      .eq("id", itemId)
      .single();

    if (!item || !(await getAllOrgIds()).includes((item.boards as unknown as { org_id: string }).org_id)) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { data: updates, error } = await supabase
      .from("updates")
      .select("*, users:user_id(id, name, email, avatar_url)")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updates: updates ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify item belongs to a board in this org
    const { data: item } = await supabase
      .from("items")
      .select("id, board_id, boards!inner(org_id)")
      .eq("id", itemId)
      .single();

    if (!item || !(await getAllOrgIds()).includes((item.boards as unknown as { org_id: string }).org_id)) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { body: updateBody } = body;
    if (!updateBody || typeof updateBody !== "string") {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    const { data: update, error } = await supabase
      .from("updates")
      .insert({
        item_id: itemId,
        user_id: user.id,
        body: updateBody.trim(),
      })
      .select("*, users:user_id(id, name, email, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ update }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
