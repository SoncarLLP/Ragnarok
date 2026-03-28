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

  const body = (await req.json()) as { postId: string; action: "flag" | "unflag"; reason?: string };
  if (!body.postId || !["flag", "unflag"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "flag") {
    // Check if already flagged
    const { data: existing } = await admin
      .from("post_flags")
      .select("id")
      .eq("post_id", body.postId)
      .is("cleared_at", null)
      .maybeSingle();

    if (!existing) {
      const { error } = await admin.from("post_flags").insert({
        post_id: body.postId,
        flagged_by: user.id,
        reason: body.reason?.trim() || null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Clear all active flags for this post
    const { error } = await admin
      .from("post_flags")
      .update({ cleared_at: new Date().toISOString() })
      .eq("post_id", body.postId)
      .is("cleared_at", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
