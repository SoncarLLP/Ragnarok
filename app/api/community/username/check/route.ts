import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("username") ?? "";
  const username = raw.trim().toLowerCase();

  if (!username) {
    return NextResponse.json({ available: false, error: "No username provided" }, { status: 400 });
  }

  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json({ available: false, error: "Invalid username format" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check for an existing profile with this username (case-insensitive via lower())
  // We use a raw filter: lower(username) = <value>
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ available: false, error: error.message }, { status: 500 });
  }

  // Username is available if nobody has it, or only the current user has it
  const available = !data || (!!user && data.id === user.id);

  return NextResponse.json({ available });
}
