import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/display-name";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorised", supabase, user: null, role: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? "member";
  if (role !== "admin" && role !== "super_admin") {
    return { error: "Forbidden", supabase, user: null, role: null };
  }
  return { error: null, supabase, user, role };
}

// GET /api/messages/conversations — list current user's conversations
export async function GET() {
  const { error, supabase, user } = await requireAdmin();
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorised" ? 401 : 403 });

  // Fetch all conversations the user participates in
  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user!.id);

  if (!participantRows || participantRows.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const convIds = participantRows.map((p) => p.conversation_id);
  const lastReadMap: Record<string, string> = {};
  for (const p of participantRows) lastReadMap[p.conversation_id] = p.last_read_at;

  // Fetch conversations with participants and last message
  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      id, type, name, description, created_by, created_at, updated_at,
      conversation_participants (
        user_id, joined_at, last_read_at,
        profiles ( id, full_name, username, avatar_url, display_name_preference, role )
      )
    `)
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (!conversations) return NextResponse.json({ conversations: [] });

  // Fetch last message per conversation
  const lastMessages: Record<string, { id: string; content: string | null; message_type: string; sender_id: string; created_at: string; deleted_at: string | null }> = {};
  for (const convId of convIds) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, content, message_type, sender_id, created_at, deleted_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (msgs) lastMessages[convId] = msgs;
  }

  // Fetch unread counts per conversation
  const unreadCounts: Record<string, number> = {};
  for (const convId of convIds) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convId)
      .neq("sender_id", user!.id)
      .gt("created_at", lastReadMap[convId])
      .is("deleted_at", null);
    unreadCounts[convId] = count ?? 0;
  }

  // Shape the response
  const result = conversations.map((conv) => {
    const participants = (conv.conversation_participants as unknown as Array<{
      user_id: string;
      joined_at: string;
      last_read_at: string;
      profiles: { id: string; full_name: string | null; username: string | null; avatar_url: string | null; display_name_preference: string | null; role: string } | null;
    }>).map((p) => ({
      user_id: p.user_id,
      joined_at: p.joined_at,
      last_read_at: p.last_read_at,
      display_name: p.profiles ? getDisplayName(p.profiles) : "Unknown",
      username: p.profiles?.username ?? null,
      avatar_url: p.profiles?.avatar_url ?? null,
      role: p.profiles?.role ?? "member",
    }));

    const lastMsg = lastMessages[conv.id];
    const otherParticipants = participants.filter((p) => p.user_id !== user!.id);

    return {
      id: conv.id,
      type: conv.type,
      name: conv.type === "group" ? (conv.name ?? "Group Chat") : null,
      description: conv.description,
      created_by: conv.created_by,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants,
      other_participants: otherParticipants,
      last_message: lastMsg
        ? {
            id: lastMsg.id,
            content: lastMsg.deleted_at ? null : lastMsg.content,
            message_type: lastMsg.message_type,
            deleted: !!lastMsg.deleted_at,
            created_at: lastMsg.created_at,
            sender_name:
              participants.find((p) => p.user_id === lastMsg.sender_id)?.display_name ??
              "Unknown",
          }
        : null,
      unread_count: unreadCounts[conv.id] ?? 0,
    };
  });

  return NextResponse.json({ conversations: result });
}

// POST /api/messages/conversations — create a new DM or group chat
export async function POST(req: NextRequest) {
  const { error, supabase, user, role } = await requireAdmin();
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorised" ? 401 : 403 });

  const body = await req.json();
  const { type, participant_ids, name, description } = body as {
    type: "direct" | "group";
    participant_ids: string[];
    name?: string;
    description?: string;
  };

  if (!type || !Array.isArray(participant_ids) || participant_ids.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only super_admins can create groups
  if (type === "group" && role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can create group chats" }, { status: 403 });
  }

  // Validate that all participants are admin/super_admin
  const allParticipantIds = [...new Set([user!.id, ...participant_ids])];
  const { data: participantProfiles } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", allParticipantIds);

  const invalidParticipants = participantProfiles?.filter(
    (p) => p.role !== "admin" && p.role !== "super_admin"
  );
  if (invalidParticipants && invalidParticipants.length > 0) {
    return NextResponse.json(
      { error: "All participants must be admin or super admin" },
      { status: 400 }
    );
  }

  // For DMs: check if a conversation already exists between these two users
  if (type === "direct") {
    if (participant_ids.length !== 1) {
      return NextResponse.json({ error: "DM requires exactly one other participant" }, { status: 400 });
    }
    const otherId = participant_ids[0];

    // Find existing DM
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user!.id);

    if (myConvs && myConvs.length > 0) {
      const myConvIds = myConvs.map((c) => c.conversation_id);
      const { data: otherConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherId)
        .in("conversation_id", myConvIds);

      if (otherConvs && otherConvs.length > 0) {
        const sharedIds = otherConvs.map((c) => c.conversation_id);
        const { data: existingDm } = await supabase
          .from("conversations")
          .select("id")
          .eq("type", "direct")
          .in("id", sharedIds)
          .limit(1)
          .single();

        if (existingDm) {
          return NextResponse.json({ conversation_id: existingDm.id, existing: true });
        }
      }
    }

    // Check if recipient has disabled direct messages.
    // Super admins are always allowed to message anyone.
    if (role !== "super_admin") {
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("messaging_disabled")
        .eq("id", participant_ids[0])
        .single();
      if (otherProfile?.messaging_disabled) {
        return NextResponse.json(
          { error: "This user has disabled direct messages" },
          { status: 403 }
        );
      }
    }
  }

  // Pre-generate the UUID so we don't need .select() after insert.
  // (Supabase applies SELECT RLS to RETURNING, but the participant row
  //  doesn't exist yet — is_conversation_participant() would return false
  //  and the insert would appear to fail even though it succeeded.)
  const convId = crypto.randomUUID();

  const { error: convErr } = await supabase
    .from("conversations")
    .insert({
      id: convId,
      type,
      name: type === "group" ? (name ?? "Group Chat") : null,
      description: type === "group" ? (description ?? null) : null,
      created_by: user!.id,
    });

  if (convErr) {
    console.error("Conversation insert error:", convErr);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  const conv = { id: convId };

  // Add participants
  const participantInserts = allParticipantIds.map((uid) => ({
    conversation_id: conv.id,
    user_id: uid,
  }));
  await supabase.from("conversation_participants").insert(participantInserts);

  return NextResponse.json({ conversation_id: conv.id, existing: false }, { status: 201 });
}
