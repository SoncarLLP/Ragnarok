import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const body = (await req.json()) as { type: "post" | "comment"; id: string };

  if (!body.id || !["post", "comment"].includes(body.type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const table = body.type === "post" ? "posts" : "comments";
  const { error } = await adminClient().from(table).delete().eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
