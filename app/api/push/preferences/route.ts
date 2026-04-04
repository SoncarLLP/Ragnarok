import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("push_notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Return defaults if no preferences stored yet
    return NextResponse.json(
      data ?? {
        reaction_enabled: true,
        mention_enabled: true,
        message_enabled: true,
        workout_reminder_enabled: true,
        nutrition_reminder_enabled: true,
        level_up_enabled: true,
        challenge_enabled: true,
        warning_enabled: true,
      }
    );
  } catch (err) {
    console.error("/api/push/preferences GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const { error } = await supabase
      .from("push_notification_preferences")
      .upsert(
        { user_id: user.id, ...body, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/push/preferences PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
