import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") return null;
  return { user, admin };
}

export async function POST(request: Request) {
  const ctx = await getSuperAdmin();
  if (!ctx) return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  const { user, admin } = ctx;

  const body = await request.json() as {
    member_id: string;
    blocked_admin_id: string;
    reason?: string;
  };
  const { member_id, blocked_admin_id, reason } = body;

  if (!member_id || !blocked_admin_id) {
    return NextResponse.json({ error: "member_id and blocked_admin_id required" }, { status: 400 });
  }

  // Verify blocked_admin_id is actually an admin (not super_admin — those can't be blocked)
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", blocked_admin_id)
    .single();

  if (targetProfile?.role !== "admin") {
    return NextResponse.json(
      { error: "blocked_admin_id must be an admin (not super_admin or member)" },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("admin_block_authorisations")
    .insert({
      super_admin_id: user.id,
      member_id,
      blocked_admin_id,
      reason: reason || null,
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "An authorisation for this pair already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await getSuperAdmin();
  if (!ctx) return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  const { admin } = ctx;

  const body = await request.json() as { id: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await admin
    .from("admin_block_authorisations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
