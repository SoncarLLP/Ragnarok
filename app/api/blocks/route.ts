import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { blocked_id: string };
  const { blocked_id } = body;
  if (!blocked_id) return NextResponse.json({ error: "blocked_id required" }, { status: 400 });
  if (blocked_id === user.id) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });

  const admin = createAdminClient();

  // Check if target is an admin or super_admin
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", blocked_id)
    .single();

  const targetRole = targetProfile?.role;
  if (targetRole === "super_admin") {
    return NextResponse.json({ error: "Super admins cannot be blocked." }, { status: 403 });
  }

  if (targetRole === "admin") {
    // Check if a super admin has authorised this specific block
    const { data: auth } = await admin
      .from("admin_block_authorisations")
      .select("id")
      .eq("member_id", user.id)
      .eq("blocked_admin_id", blocked_id)
      .is("revoked_at", null)
      .maybeSingle();

    if (!auth) {
      return NextResponse.json(
        { error: "Admins cannot be blocked without super admin authorisation." },
        { status: 403 }
      );
    }
  }

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also remove any follow relationship in both directions
  await supabase
    .from("follows")
    .delete()
    .or(
      `and(follower_id.eq.${user.id},following_id.eq.${blocked_id}),and(follower_id.eq.${blocked_id},following_id.eq.${user.id})`
    );

  // Remove any pending follow requests in both directions
  await supabase
    .from("follow_requests")
    .delete()
    .or(
      `and(requester_id.eq.${user.id},target_id.eq.${blocked_id}),and(requester_id.eq.${blocked_id},target_id.eq.${user.id})`
    );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { blocked_id: string };
  const { blocked_id } = body;
  if (!blocked_id) return NextResponse.json({ error: "blocked_id required" }, { status: 400 });

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blocked_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
