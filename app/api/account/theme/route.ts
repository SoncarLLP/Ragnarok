import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_THEMES = new Set(["bronze", "silver", "gold", "platinum", "fire", "diamond"]);

// Minimum tier required to use each theme
const THEME_REQUIREMENTS: Record<string, string[]> = {
  bronze:   [],
  silver:   ["Silver 1", "Silver 2", "Silver 3", "Gold 1", "Gold 2", "Gold 3", "Platinum 1", "Platinum 2", "Platinum 3", "Diamond"],
  gold:     ["Gold 1", "Gold 2", "Gold 3", "Platinum 1", "Platinum 2", "Platinum 3", "Diamond"],
  platinum: ["Platinum 1", "Platinum 2", "Platinum 3", "Diamond"],
  fire:     ["Platinum 3", "Diamond"],
  diamond:  ["Diamond"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const theme = body?.theme as string | undefined;

    if (!theme || !VALID_THEMES.has(theme)) {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Fetch user's current tier to validate they can use this theme
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    const allowedTiers = THEME_REQUIREMENTS[theme];
    const tierName = profile?.tier ?? "";
    const formatted = tierName.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    // bronze has no requirements; others check tier list
    if (theme !== "bronze" && allowedTiers.length > 0 && !allowedTiers.includes(formatted)) {
      return NextResponse.json({ error: "Tier requirement not met" }, { status: 403 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ active_theme: theme })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, theme });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
