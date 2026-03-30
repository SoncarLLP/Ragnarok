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

  const callerRole = callerProfile?.role ?? "";
  if (!["admin", "super_admin"].includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { type: "post" | "comment"; id: string };

  if (!body.id || !["post", "comment"].includes(body.type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // For posts, check if it's a Ragnarök Team post — only super_admins can delete those
  if (body.type === "post") {
    const { data: post } = await admin
      .from("posts")
      .select("post_as_role")
      .eq("id", body.id)
      .single();

    if (post?.post_as_role && callerRole !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can delete Ragnarök Team posts" },
        { status: 403 }
      );
    }
  }

  const table = body.type === "post" ? "posts" : "comments";
  const { error } = await admin.from(table).delete().eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
