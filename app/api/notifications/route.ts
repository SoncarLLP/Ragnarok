import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications?tab=unread|all|archived&limit=10
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") ?? "all";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  let query = supabase
    .from("notifications")
    .select("id, type, message, link, read_at, created_at, admin_notice, archived")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tab === "unread") {
    query = query.is("read_at", null).eq("archived", false);
  } else if (tab === "archived") {
    query = query.eq("archived", true);
  } else {
    // "all" — non-archived (includes read and unread)
    query = query.eq("archived", false);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also return the total unread count (for badge)
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null)
    .eq("archived", false);

  return NextResponse.json({ notifications: data ?? [], unreadCount: unreadCount ?? 0 });
}
