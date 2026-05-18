import { createClient } from "@/lib/supabase/server";
import { getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";
import { executeAutomations } from "@/lib/automations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { column_id, value } = body;
    if (!column_id) {
      return NextResponse.json(
        { error: "column_id is required" },
        { status: 400 }
      );
    }

    // Verify the item belongs to a board in this org
    const { data: item } = await supabase
      .from("items")
      .select("id, board_id, boards!inner(org_id)")
      .eq("id", itemId)
      .single();

    if (!item || !(await getAllOrgIds()).includes((item.boards as unknown as { org_id: string }).org_id)) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const boardId = item.board_id as string;

    // Fetch the column to check its type
    const { data: column } = await supabase
      .from("columns")
      .select("id, column_type")
      .eq("id", column_id)
      .single();

    // Fetch old value before upsert (for automation triggers)
    let oldValue: unknown = null;
    if (column) {
      const { data: existingValue } = await supabase
        .from("item_values")
        .select("value")
        .eq("item_id", itemId)
        .eq("column_id", column_id)
        .single();
      oldValue = existingValue?.value ?? null;
    }

    // Upsert the value
    const { data: itemValue, error } = await supabase
      .from("item_values")
      .upsert(
        {
          item_id: itemId,
          column_id,
          value,
        },
        { onConflict: "item_id,column_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire automation triggers based on column type
    if (column) {
      if (column.column_type === "status") {
        // Run automations in background — don't block the response
        executeAutomations(boardId, "status_change", {
          itemId,
          columnId: column_id,
          oldValue,
          newValue: value,
        }).catch(() => {
          // Silently swallow automation errors
        });
      } else if (column.column_type === "people") {
        executeAutomations(boardId, "assignee_changed", {
          itemId,
          columnId: column_id,
          oldValue,
          newValue: value,
        }).catch(() => {});
      } else if (column.column_type === "date") {
        executeAutomations(boardId, "date_arrives", {
          itemId,
          columnId: column_id,
          oldValue,
          newValue: value,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ value: itemValue });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
