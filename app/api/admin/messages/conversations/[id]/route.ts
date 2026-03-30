import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/display-name";

// GET /api/admin/messages/conversations/[id] — review reported conversation (super_admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: convId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Verify there's a pending report (access is report-gated)
  const { data: report } = await admin
    .from("conversation_reports")
    .select("id, reason, reported_by, status, created_at")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!report) {
    return NextResponse.json({ error: "No report found for this conversation" }, { status: 403 });
  }

  // Fetch conversation + messages
  const [{ data: conv }, { data: messages }] = await Promise.all([
    admin
      .from("conversations")
      .select(`
        id, type, name, created_at,
        conversation_participants (
          user_id,
          profiles ( id, full_name, username, display_name_preference )
        )
      `)
      .eq("id", convId)
      .single(),
    admin
      .from("messages")
      .select("id, sender_id, content, message_type, file_url, file_name, edited_at, deleted_at, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build sender map
  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  const { data: senderProfiles } = await admin
    .from("profiles")
    .select("id, full_name, username, display_name_preference")
    .in("id", senderIds);
  const spMap: Record<string, { full_name: string | null; username: string | null; display_name_preference: string | null }> = {};
  for (const p of senderProfiles ?? []) spMap[p.id] = p;

  const participants = (conv.conversation_participants as unknown as Array<{
    user_id: string;
    profiles: { full_name: string | null; username: string | null; display_name_preference: string | null } | null;
  }>).map((p) => ({
    user_id: p.user_id,
    display_name: p.profiles ? getDisplayName(p.profiles) : "Unknown",
  }));

  const shapedMessages = (messages ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    sender_name: spMap[m.sender_id] ? getDisplayName(spMap[m.sender_id]) : "Unknown",
    content: m.content,
    message_type: m.message_type,
    file_url: m.file_url,
    file_name: m.file_name,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    created_at: m.created_at,
  }));

  return NextResponse.json({
    conversation: {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      created_at: conv.created_at,
      participants,
    },
    messages: shapedMessages,
    report: {
      id: report.id,
      reason: report.reason,
      status: report.status,
      created_at: report.created_at,
    },
  });
}

// DELETE /api/admin/messages/conversations/[id] — delete conversation (super_admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: convId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("conversations").delete().eq("id", convId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
