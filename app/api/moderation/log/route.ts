import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/moderation/log?type=&limit=50&offset=0
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("type");
  const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const dateFrom = searchParams.get("from");
  const dateTo   = searchParams.get("to");

  let query = admin
    .from("moderation_log")
    .select("id, user_id, content_type, excerpt, reason, blocked_words, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (contentType) query = query.eq("content_type", contentType);
  if (dateFrom)    query = query.gte("created_at", dateFrom);
  if (dateTo)      query = query.lte("created_at", dateTo);

  const { data: logs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve user names
  const userIds = [...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean))];
  const userMap: Record<string, { full_name: string | null; username: string | null; member_id: number | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, username, member_id")
      .in("id", userIds);
    for (const p of profiles ?? []) userMap[p.id] = p;
  }

  const enriched = (logs ?? []).map((l) => {
    const u = l.user_id ? userMap[l.user_id] : null;
    return {
      ...l,
      user_name:      u?.full_name || u?.username || "Unknown",
      user_username:  u?.username ?? null,
      user_member_id: u?.member_id ?? null,
    };
  });

  return NextResponse.json({ logs: enriched, total: enriched.length });
}
