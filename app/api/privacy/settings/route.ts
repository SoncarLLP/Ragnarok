import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergePrivacySettings, mergeExtendedVisibility } from "@/lib/privacy";
import type { AccountMode } from "@/lib/privacy";

const VALID_MODES: AccountMode[] = ["public", "followers_only", "private"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    account_mode?: string;
    privacy_settings?: unknown;
    extended_profile_visibility?: unknown;
  };

  const { account_mode, privacy_settings, extended_profile_visibility } = body;

  if (account_mode && !VALID_MODES.includes(account_mode as AccountMode)) {
    return NextResponse.json({ error: "Invalid account_mode" }, { status: 400 });
  }

  const validatedPs = mergePrivacySettings(privacy_settings);
  const validatedEv = mergeExtendedVisibility(extended_profile_visibility);

  const update: Record<string, unknown> = {
    privacy_settings: validatedPs,
    extended_profile_visibility: validatedEv,
    updated_at: new Date().toISOString(),
  };
  if (account_mode) update.account_mode = account_mode;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
