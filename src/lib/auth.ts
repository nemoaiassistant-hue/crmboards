import { createClient } from "@/lib/supabase/server";

export async function getOrgId(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .single();

  if (!member) throw new Error("No organization");

  return member.org_id;
}

export async function getAllOrgIds(): Promise<string[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null);

  if (!memberships || memberships.length === 0) throw new Error("No organization");

  return memberships.map((m) => m.org_id);
}
