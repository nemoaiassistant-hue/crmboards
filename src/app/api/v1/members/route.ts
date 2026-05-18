import { createClient } from "@/lib/supabase/server";
import { getOrgId, getAllOrgIds } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const orgIds = await getAllOrgIds();
    const supabase = await createClient();

    const { data: members, error } = await supabase
      .from("org_members")
      .select("user_id, users:id(id, name, email, avatar_url)")
            .eq("accepted_at", "not.null");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users =
      members
        ?.map((m) => m.users as unknown as { id: string; name: string; email: string; avatar_url: string | null })
        .filter(Boolean) ?? [];

    return NextResponse.json({ members: users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
