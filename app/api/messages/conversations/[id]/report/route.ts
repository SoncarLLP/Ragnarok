import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/messages/conversations/[id]/report
export async function POST(
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

  const body = await req.json();
  const { reason } = body as { reason: string };
  if (!reason || reason.trim().length === 0) {
    return NextResponse.json({ error: "Reason required" }, { status: 400 });
  }

  // Check for existing pending report from this user
  const { data: existing } = await supabase
    .from("conversation_reports")
    .select("id")
    .eq("conversation_id", convId)
    .eq("reported_by", user.id)
    .eq("status", "pending")
    .single();

  if (existing) {
    return NextResponse.json({ error: "You already have a pending report for this conversation" }, { status: 409 });
  }

  const { error: insertErr } = await supabase
    .from("conversation_reports")
    .insert({
      conversation_id: convId,
      reported_by: user.id,
      reason: reason.trim(),
    });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
