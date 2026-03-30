import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_EMOJIS = ["👍", "❤️", "💪", "🔥", "😮", "😂", "😢"];

// POST — toggle a reaction on a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { id: convId, msgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify participant
  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", convId)
    .eq("user_id", user.id)
    .single();
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const body = await req.json();
  const { emoji } = body as { emoji: string };

  if (!emoji || !VALID_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  // Check existing reaction
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("emoji")
    .eq("message_id", msgId)
    .eq("user_id", user.id)
    .single();

  if (existing?.emoji === emoji) {
    // Toggle off
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", msgId)
      .eq("user_id", user.id);
    return NextResponse.json({ action: "removed" });
  }

  // Remove any prior reaction then insert new one
  await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", msgId)
    .eq("user_id", user.id);

  await supabase.from("message_reactions").insert({
    message_id: msgId,
    user_id: user.id,
    emoji,
  });

  return NextResponse.json({ action: "added" });
}
