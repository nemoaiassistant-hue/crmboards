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
    .eq("accepted_at", "not.null") // only accepted invitations
    .single();

  if (!member) throw new Error("No organization");

  return member.org_id;
}
