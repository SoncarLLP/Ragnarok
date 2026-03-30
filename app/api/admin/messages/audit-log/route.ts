import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/display-name";

// GET /api/admin/messages/audit-log — view edit/delete audit log (super_admin only)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action"); // "edit" | "delete" | null (all)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const admin = createAdminClient();

  let query = admin
    .from("message_audit_log")
    .select("id, message_id, original_content, new_content, action, performed_by, performed_at")
    .order("performed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action === "edit" || action === "delete") {
    query = query.eq("action", action);
  }

  const { data: logs } = await query;
  if (!logs || logs.length === 0) return NextResponse.json({ logs: [] });

  // Get performer profiles
  const performerIds = [...new Set(logs.map((l) => l.performed_by))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, username, display_name_preference")
    .in("id", performerIds);
  const pMap: Record<string, { full_name: string | null; username: string | null; display_name_preference: string | null }> = {};
  for (const p of profiles ?? []) pMap[p.id] = p;

  // Get conversation info for messages
  const msgIds = [...new Set(logs.map((l) => l.message_id))];
  const { data: messages } = await admin
    .from("messages")
    .select("id, conversation_id")
    .in("id", msgIds);
  const msgMap: Record<string, { conversation_id: string }> = {};
  for (const m of messages ?? []) msgMap[m.id] = m;

  const shaped = logs.map((l) => ({
    id: l.id,
    message_id: l.message_id,
    conversation_id: msgMap[l.message_id]?.conversation_id ?? null,
    original_content: l.original_content,
    new_content: l.new_content,
    action: l.action,
    performed_by_name: pMap[l.performed_by] ? getDisplayName(pMap[l.performed_by]) : "Unknown",
    performed_at: l.performed_at,
  }));

  return NextResponse.json({ logs: shaped });
}
