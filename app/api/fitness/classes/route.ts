import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/classes
 * Returns all fitness classes with optional user progress attached.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: classes, error } = await supabase
    .from("fitness_classes")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach user's progress if signed in
  if (user) {
    const { data: progress } = await supabase
      .from("member_class_progress")
      .select("class_id, current_level, current_xp, total_xp_earned, prestige_count")
      .eq("user_id", user.id);

    const progressMap = Object.fromEntries(
      (progress ?? []).map((p) => [p.class_id, p])
    );

    const classesWithProgress = (classes ?? []).map((c) => ({
      ...c,
      userProgress: progressMap[c.id] ?? null,
    }));

    return NextResponse.json({ classes: classesWithProgress });
  }

  return NextResponse.json({ classes: classes ?? [] });
}
