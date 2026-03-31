import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/account/theme/mode
 * Persists the user's light/dark mode preference to their profile.
 * Body: { lightMode: boolean | null }
 *   true  = always light
 *   false = always dark
 *   null  = follow system preference
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lightMode } = body as { lightMode: unknown };

  if (lightMode !== null && typeof lightMode !== "boolean") {
    return NextResponse.json(
      { error: "lightMode must be boolean or null" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ light_mode_preference: lightMode })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lightMode });
}
