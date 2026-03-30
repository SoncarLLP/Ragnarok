import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/display-name";

// GET /api/messages/admin-search?q=... — search admin/super_admin users for DM/group creation
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  let query = supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, display_name_preference, role")
    .in("role", ["admin", "super_admin"])
    .neq("id", user.id);

  if (q.length > 0) {
    query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data: members } = await query.order("role", { ascending: false }).limit(20);

  const result = (members ?? []).map((m) => ({
    id: m.id,
    display_name: getDisplayName(m),
    username: m.username,
    avatar_url: m.avatar_url,
    role: m.role,
  }));

  return NextResponse.json({ members: result });
}
