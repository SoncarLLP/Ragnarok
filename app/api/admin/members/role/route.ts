import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify caller is super_admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { userId: string; role: string };
  if (!body.userId || !["member", "admin", "super_admin"].includes(body.role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // super_admins cannot be demoted by anyone other than themselves
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", body.userId)
    .single();

  if (target?.role === "super_admin" && body.userId !== user.id) {
    return NextResponse.json({ error: "Cannot demote another super_admin" }, { status: 403 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ role: body.role })
    .eq("id", body.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
