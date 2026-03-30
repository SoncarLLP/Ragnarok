import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/messages/conversations/[id]/leave
export async function POST(
  _req: NextRequest,
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

  // Verify it's a group (can't leave a DM)
  const { data: conv } = await supabase
    .from("conversations")
    .select("type")
    .eq("id", convId)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.type !== "group") {
    return NextResponse.json({ error: "Cannot leave a direct message conversation" }, { status: 400 });
  }

  const { error: delErr } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", convId)
    .eq("user_id", user.id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
