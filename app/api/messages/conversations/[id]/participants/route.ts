import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT /api/messages/conversations/[id]/participants — add participant(s) (super_admin only)
export async function PUT(
  req: NextRequest,
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

  // Must be a group
  const { data: conv } = await supabase
    .from("conversations").select("type").eq("id", convId).single();
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.type !== "group") {
    return NextResponse.json({ error: "Can only add participants to group chats" }, { status: 400 });
  }

  const body = await req.json();
  const { user_ids } = body as { user_ids: string[] };
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: "user_ids required" }, { status: 400 });
  }

  // Validate all are admin/super_admin
  const { data: profiles } = await supabase
    .from("profiles").select("id, role").in("id", user_ids);
  const invalid = profiles?.filter((p) => p.role !== "admin" && p.role !== "super_admin");
  if (invalid && invalid.length > 0) {
    return NextResponse.json({ error: "All participants must be admin or super admin" }, { status: 400 });
  }

  // Upsert (ignore already-participants)
  const inserts = user_ids.map((uid) => ({
    conversation_id: convId,
    user_id: uid,
  }));

  const { error: insErr } = await supabase
    .from("conversation_participants")
    .upsert(inserts, { onConflict: "conversation_id,user_id", ignoreDuplicates: true });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
