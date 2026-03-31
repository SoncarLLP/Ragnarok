import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/display-name";
import { checkTextContent, getModerationsFromDB, logModerationEvent, applyModerationStrike } from "@/lib/content-moderation";

async function requireParticipant(convId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorised", supabase, user: null };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return { error: "Forbidden", supabase, user: null };
  }

  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", convId)
    .eq("user_id", user.id)
    .single();

  if (!participant) return { error: "Not a participant", supabase, user: null };
  return { error: null, supabase, user };
}

// GET /api/messages/conversations/[id]/messages
// Query params: before (cursor for pagination), limit (default 50)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, supabase, user } = await requireParticipant(id);
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorised" ? 401 : 403 });

  const url = new URL(req.url);
  const before = url.searchParams.get("before");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, message_type, file_url, file_name, file_size, reply_to_message_id, edited_at, deleted_at, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: rawMessages } = await query;
  if (!rawMessages) return NextResponse.json({ messages: [], has_more: false });

  // Get sender profiles
  const senderIds = [...new Set(rawMessages.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, display_name_preference, role")
    .in("id", senderIds);

  const profileMap: Record<string, { full_name: string | null; username: string | null; avatar_url: string | null; display_name_preference: string | null; role: string }> = {};
  for (const p of profiles ?? []) profileMap[p.id] = p;

  // Get reply-to messages
  const replyIds = rawMessages
    .map((m) => m.reply_to_message_id)
    .filter(Boolean) as string[];
  const replyMap: Record<string, { id: string; content: string | null; message_type: string; sender_id: string; deleted_at: string | null }> = {};
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await supabase
      .from("messages")
      .select("id, content, message_type, sender_id, deleted_at")
      .in("id", replyIds);
    for (const r of replyMsgs ?? []) replyMap[r.id] = r;
  }

  // Get reactions per message
  const msgIds = rawMessages.map((m) => m.id);
  const { data: reactions } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", msgIds);

  const reactionMap: Record<string, { emoji: string; users: string[] }[]> = {};
  for (const r of reactions ?? []) {
    if (!reactionMap[r.message_id]) reactionMap[r.message_id] = [];
    const existing = reactionMap[r.message_id].find((e) => e.emoji === r.emoji);
    if (existing) existing.users.push(r.user_id);
    else reactionMap[r.message_id].push({ emoji: r.emoji, users: [r.user_id] });
  }

  const messages = rawMessages.reverse().map((m) => {
    const sender = profileMap[m.sender_id];
    const replyMsg = m.reply_to_message_id ? replyMap[m.reply_to_message_id] : null;
    const replySender = replyMsg ? profileMap[replyMsg.sender_id] : null;

    return {
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      sender_name: sender ? getDisplayName(sender) : "Unknown",
      sender_avatar: sender?.avatar_url ?? null,
      sender_role: sender?.role ?? "member",
      content: m.deleted_at ? null : m.content,
      message_type: m.message_type,
      file_url: m.deleted_at ? null : m.file_url,
      file_name: m.deleted_at ? null : m.file_name,
      file_size: m.deleted_at ? null : m.file_size,
      reply_to_message_id: m.reply_to_message_id,
      reply_to: replyMsg
        ? {
            id: replyMsg.id,
            content: replyMsg.deleted_at ? null : replyMsg.content,
            message_type: replyMsg.message_type,
            deleted: !!replyMsg.deleted_at,
            sender_name: replySender ? getDisplayName(replySender) : "Unknown",
          }
        : null,
      edited_at: m.edited_at,
      deleted_at: m.deleted_at,
      is_deleted: !!m.deleted_at,
      created_at: m.created_at,
      reactions: (reactionMap[m.id] ?? []).map((r) => ({
        emoji: r.emoji,
        count: r.users.length,
        user_reacted: r.users.includes(user!.id),
      })),
    };
  });

  return NextResponse.json({
    messages,
    has_more: rawMessages.length === limit,
  });
}

// POST /api/messages/conversations/[id]/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, supabase, user } = await requireParticipant(id);
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorised" ? 401 : 403 });

  const body = await req.json();
  const { content, message_type = "text", file_url, file_name, file_size, reply_to_message_id } = body as {
    content?: string;
    message_type?: "text" | "image" | "file";
    file_url?: string;
    file_name?: string;
    file_size?: number;
    reply_to_message_id?: string;
  };

  if (message_type === "text" && (!content || content.trim() === "")) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }
  if ((message_type === "image" || message_type === "file") && !file_url) {
    return NextResponse.json({ error: "File URL required for image/file messages" }, { status: 400 });
  }

  // ── Content moderation ────────────────────────────────────────────
  if (message_type === "text" && content?.trim()) {
    const admin = createAdminClient();
    const { blocked, whitelist } = await getModerationsFromDB(admin as Parameters<typeof getModerationsFromDB>[0]);
    const modResult = checkTextContent(content.trim(), blocked, whitelist);
    if (!modResult.allowed) {
      await logModerationEvent(
        admin as Parameters<typeof logModerationEvent>[0],
        user!.id, "dm", content.trim(), modResult.reason, modResult.blockedWords
      );
      await applyModerationStrike(admin as Parameters<typeof applyModerationStrike>[0], user!.id);
      return NextResponse.json({
        error: "Your message was blocked because it contains language that violates our community guidelines.",
      }, { status: 422 });
    }
  }

  const { data: msg, error: insertErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: user!.id,
      content: content?.trim() ?? null,
      message_type,
      file_url: file_url ?? null,
      file_name: file_name ?? null,
      file_size: file_size ?? null,
      reply_to_message_id: reply_to_message_id ?? null,
    })
    .select("id, created_at")
    .single();

  if (insertErr || !msg) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ message_id: msg.id, created_at: msg.created_at }, { status: 201 });
}
