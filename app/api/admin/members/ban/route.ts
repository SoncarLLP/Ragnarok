import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify caller is admin or super_admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "super_admin"].includes(callerProfile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { userId: string; action: "ban" | "unban" };
  if (!body.userId || !["ban", "unban"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Admins cannot ban super_admins
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", body.userId)
    .single();

  if (target?.role === "super_admin") {
    return NextResponse.json({ error: "Cannot ban a super_admin" }, { status: 403 });
  }

  const newStatus = body.action === "ban" ? "banned" : "active";

  // Update profile status
  const { error: profileErr } = await admin
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", body.userId);

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

  // Disable/enable the auth account so they cannot log in while banned
  const { error: authErr } = await admin.auth.admin.updateUserById(body.userId, {
    ban_duration: body.action === "ban" ? "876600h" : "none", // 100 years vs none
  });

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
