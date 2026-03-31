import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/moderation/strikes — reset a member's strike count
// Body: { userId: string, action: 'reset' }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — super_admin only" }, { status: 403 });
  }

  const body = (await req.json()) as { userId: string; action: "reset" };
  if (!body.userId || body.action !== "reset") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ moderation_strikes: 0 })
    .eq("id", body.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
