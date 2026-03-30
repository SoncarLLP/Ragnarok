import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/display-name";

// GET /api/admin/messages/reports — list all conversation reports (super_admin only)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("conversation_reports")
    .select("id, conversation_id, reported_by, reason, status, resolved_by, resolved_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!reports || reports.length === 0) return NextResponse.json({ reports: [] });

  // Resolve profile names
  const profileIds = [
    ...new Set([
      ...reports.map((r) => r.reported_by),
      ...reports.map((r) => r.resolved_by).filter(Boolean) as string[],
    ]),
  ];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, username, display_name_preference")
    .in("id", profileIds);
  const pMap: Record<string, { full_name: string | null; username: string | null; display_name_preference: string | null }> = {};
  for (const p of profiles ?? []) pMap[p.id] = p;

  // Get conversation details
  const convIds = [...new Set(reports.map((r) => r.conversation_id))];
  const { data: convs } = await admin
    .from("conversations")
    .select("id, type, name")
    .in("id", convIds);
  const convMap: Record<string, { type: string; name: string | null }> = {};
  for (const c of convs ?? []) convMap[c.id] = c;

  const shaped = reports.map((r) => ({
    id: r.id,
    conversation_id: r.conversation_id,
    conversation_type: convMap[r.conversation_id]?.type ?? "direct",
    conversation_name: convMap[r.conversation_id]?.name ?? null,
    reported_by_name: pMap[r.reported_by] ? getDisplayName(pMap[r.reported_by]) : "Unknown",
    reason: r.reason,
    status: r.status,
    resolved_by_name: r.resolved_by && pMap[r.resolved_by] ? getDisplayName(pMap[r.resolved_by]) : null,
    resolved_at: r.resolved_at,
    created_at: r.created_at,
  }));

  return NextResponse.json({ reports: shaped });
}
