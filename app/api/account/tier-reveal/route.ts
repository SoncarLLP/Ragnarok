import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tier = body?.tier as string | undefined;

    if (!tier) {
      return NextResponse.json({ error: "Missing tier" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Fetch existing tier_reveals_seen
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier_reveals_seen")
      .eq("id", user.id)
      .single();

    const existing = (profile?.tier_reveals_seen as Record<string, boolean>) ?? {};
    const updated  = { ...existing, [tier]: true };

    const { error } = await supabase
      .from("profiles")
      .update({ tier_reveals_seen: updated })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
