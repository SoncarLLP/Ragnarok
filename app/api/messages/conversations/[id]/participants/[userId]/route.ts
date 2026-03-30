import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/messages/conversations/[id]/participants/[userId] — remove participant (super_admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: convId, userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  // Cannot remove yourself via this endpoint (use /leave for that)
  if (userId === user.id) {
    return NextResponse.json({ error: "Use /leave to remove yourself" }, { status: 400 });
  }

  const { error: delErr } = await supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", convId)
    .eq("user_id", userId);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
