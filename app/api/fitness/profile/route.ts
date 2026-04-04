import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/profile
 * Returns the current user's full fitness profile:
 * - Active class + all class progress
 * - Streak data
 * - Recent achievements
 * - Active XP events
 *
 * Supports both session cookie auth (web) and Bearer token (future mobile app).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [
    { data: fitnessProfile },
    { data: classProgress },
    { data: streak },
    { data: achievements },
    { data: activeEvents },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("member_fitness_profiles")
      .select("*, fitness_classes(*)")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("member_class_progress")
      .select("*, fitness_classes(id, name, slug, icon, xp_bonus_multiplier, off_class_reduction, special_abilities)")
      .eq("user_id", user.id)
      .order("total_xp_earned", { ascending: false }),

    supabase
      .from("fitness_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("member_achievements")
      .select("*, fitness_achievements(*)")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(10),

    supabase
      .from("xp_events")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString()),

    supabase
      .from("profiles")
      .select("total_fitness_xp, fitness_points_frozen, fitness_level_highest, fitness_prestige_total, tier")
      .eq("id", user.id)
      .single(),
  ]);

  return NextResponse.json({
    fitnessProfile,
    classProgress: classProgress ?? [],
    streak,
    achievements: achievements ?? [],
    activeEvents: activeEvents ?? [],
    profile,
  });
}

/**
 * POST /api/fitness/profile
 * Set or change the user's active fitness class.
 * Body: { classId: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { classId } = body;

  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  // Validate class exists
  const { data: fitnessClass } = await supabase
    .from("fitness_classes")
    .select("id, name")
    .eq("id", classId)
    .single();

  if (!fitnessClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  // Upsert fitness profile
  const { error } = await supabase
    .from("member_fitness_profiles")
    .upsert({ user_id: user.id, active_class_id: classId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update profiles.active_class_id
  await supabase
    .from("profiles")
    .update({ active_class_id: classId })
    .eq("id", user.id);

  // Ensure class progress row exists for this class
  await supabase
    .from("member_class_progress")
    .upsert(
      { user_id: user.id, class_id: classId },
      { onConflict: "user_id,class_id", ignoreDuplicates: true }
    );

  return NextResponse.json({ success: true, className: fitnessClass.name });
}
