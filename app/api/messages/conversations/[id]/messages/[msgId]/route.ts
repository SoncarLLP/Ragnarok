import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH — edit a message (sender only)
export async function PATCH(
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

  // Fetch the existing message
  const { data: msg } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, deleted_at")
    .eq("id", msgId)
    .eq("conversation_id", convId)
    .single();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (msg.sender_id !== user.id) return NextResponse.json({ error: "Can only edit own messages" }, { status: 403 });
  if (msg.deleted_at) return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });

  const body = await req.json();
  const { content } = body as { content: string };

  if (!content || content.trim() === "") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const originalContent = msg.content;

  // Update the message
  const { error: updateErr } = await supabase
    .from("messages")
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq("id", msgId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Write audit log
  await supabase.from("message_audit_log").insert({
    message_id: msgId,
    original_content: originalContent,
    new_content: content.trim(),
    action: "edit",
    performed_by: user.id,
  });

  return NextResponse.json({ success: true });
}

// DELETE — soft-delete a message (sender only)
export async function DELETE(
  _req: NextRequest,
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

  const { data: msg } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, deleted_at")
    .eq("id", msgId)
    .eq("conversation_id", convId)
    .single();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (msg.sender_id !== user.id) return NextResponse.json({ error: "Can only delete own messages" }, { status: 403 });
  if (msg.deleted_at) return NextResponse.json({ error: "Already deleted" }, { status: 400 });

  const { error: delErr } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", msgId);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // Write audit log
  await supabase.from("message_audit_log").insert({
    message_id: msgId,
    original_content: msg.content,
    new_content: null,
    action: "delete",
    performed_by: user.id,
  });

  return NextResponse.json({ success: true });
}
