import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Only super_admins may unpin posts
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
    return NextResponse.json({ error: "Only super admins can unpin posts" }, { status: 403 });
  }

  const body = (await req.json()) as { post_id: string };
  if (!body.post_id) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }

  const { error } = await admin
    .from("posts")
    .update({ pinned_until: null, pin_indefinite: false })
    .eq("id", body.post_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
