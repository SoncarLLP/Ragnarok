import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/display-name";

// GET /api/messages/conversations/[id]/search?q=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: convId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", convId)
    .eq("user_id", user.id)
    .single();
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, message_type, created_at, deleted_at")
    .eq("conversation_id", convId)
    .is("deleted_at", null)
    .ilike("content", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!messages || messages.length === 0) return NextResponse.json({ results: [] });

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, display_name_preference")
    .in("id", senderIds);
  const profileMap: Record<string, { full_name: string | null; username: string | null; display_name_preference: string | null }> = {};
  for (const p of profiles ?? []) profileMap[p.id] = p;

  const results = messages.map((m) => ({
    id: m.id,
    content: m.content,
    message_type: m.message_type,
    created_at: m.created_at,
    sender_name: profileMap[m.sender_id] ? getDisplayName(profileMap[m.sender_id]) : "Unknown",
  }));

  return NextResponse.json({ results });
}
