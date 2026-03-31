import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/members/tier/history — super_admin only
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: logs, error } = await admin
    .from("tier_promotion_log")
    .select("id, member_id, previous_tier, new_tier, promoted_by, note, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve member and promoter names
  const userIds = [
    ...new Set([
      ...(logs ?? []).map((l) => l.member_id),
      ...(logs ?? []).map((l) => l.promoted_by),
    ]),
  ];

  const profileMap: Record<string, { full_name: string | null; username: string | null; member_id: number | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, username, member_id")
      .in("id", userIds);
    for (const p of profiles ?? []) profileMap[p.id] = p;
  }

  const enriched = (logs ?? []).map((l) => {
    const member = profileMap[l.member_id];
    const promoter = profileMap[l.promoted_by];
    return {
      ...l,
      member_name: member?.full_name || member?.username || "Unknown",
      member_username: member?.username ?? null,
      member_member_id: member?.member_id ?? null,
      promoter_name: promoter?.full_name || promoter?.username || "Super Admin",
    };
  });

  return NextResponse.json({ logs: enriched });
}
