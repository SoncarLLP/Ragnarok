import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/display-name";

async function requireParticipant(convId: string) {
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

  // Check participation
  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", convId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return { error: "Not a participant", supabase, user: null, role: null };
  }

  return { error: null, supabase, user, role };
}

// GET /api/messages/conversations/[id] — conversation details + participants
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, supabase, user } = await requireParticipant(id);
  if (error) return NextResponse.json({ error }, { status: error === "Unauthorised" ? 401 : 403 });

  const { data: conv } = await supabase
    .from("conversations")
    .select(`
      id, type, name, description, created_by, created_at, updated_at,
      conversation_participants (
        user_id, joined_at, last_read_at,
        profiles ( id, full_name, username, avatar_url, display_name_preference, role )
      )
    `)
    .eq("id", id)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    is_self: p.user_id === user!.id,
  }));

  return NextResponse.json({
    conversation: {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      description: conv.description,
      created_by: conv.created_by,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants,
    },
  });
}

// PATCH /api/messages/conversations/[id] — update group name/description (super_admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description } = body as { name?: string; description?: string };

  const { error } = await supabase
    .from("conversations")
    .update({ name, description })
    .eq("id", id)
    .eq("type", "group");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/messages/conversations/[id] — delete conversation (super_admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
