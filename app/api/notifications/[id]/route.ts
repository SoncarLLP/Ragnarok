import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/notifications/[id] — mark read or archive
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    read?: boolean;
    archived?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (body.read !== undefined) {
    updates.read_at = body.read ? new Date().toISOString() : null;
  }
  if (body.archived !== undefined) {
    updates.archived = body.archived;
    // Archiving also marks as read
    if (body.archived) updates.read_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("notifications")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications/[id] — permanently delete (non-admin notices only)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS also enforces admin_notice = false, but we guard here too
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("admin_notice", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
