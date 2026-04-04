import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateWorkoutXp,
  calculateWorkoutPoints,
  xpPerLevel,
  levelUpXpReward,
  levelUpPointsReward,
  isClassMatch as checkClassMatch,
  XP_CAPS,
  isSuspiciousDuration,
} from "@/lib/fitness";

/**
 * POST /api/fitness/workouts
 * Log a new workout.
 *
 * Body:
 *   exerciseName, exerciseCategory, exerciseId?,
 *   sets?, reps?, weightKg?,
 *   durationMinutes?, distanceKm?,
 *   intensity, notes?,
 *   workoutDate (ISO — cannot be > 24h in the past),
 *   dataSource? (web|mobile|strava|etc)
 *
 * Returns: { workoutId, xpEarned, pointsEarned, leveledUp, newLevel, newXp }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    exerciseName,
    exerciseCategory,
    exerciseId,
    sets,
    reps,
    weightKg,
    durationMinutes,
    distanceKm,
    intensity = "moderate",
    notes,
    workoutDate,
    dataSource = "web",
  } = body;

  if (!exerciseName || !exerciseCategory) {
    return NextResponse.json({ error: "exerciseName and exerciseCategory required" }, { status: 400 });
  }

  // Anti-backdating: reject workouts more than 25 hours in the past
  const wDate = workoutDate ? new Date(workoutDate) : new Date();
  const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000);
  if (wDate < cutoff) {
    return NextResponse.json({ error: "Workouts cannot be backdated more than 24 hours" }, { status: 400 });
  }

  // Check if fitness points are frozen
  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("fitness_points_frozen, active_class_id")
    .eq("id", user.id)
    .single();

  const frozen = profileCheck?.fitness_points_frozen ?? false;

  // Get active class
  const { data: fitnessProfile } = await supabase
    .from("member_fitness_profiles")
    .select("active_class_id, fitness_classes(id, name, slug, xp_bonus_multiplier, off_class_reduction, special_abilities)")
    .eq("user_id", user.id)
    .maybeSingle();

  const activeClass = (Array.isArray(fitnessProfile?.fitness_classes)
    ? fitnessProfile?.fitness_classes[0]
    : fitnessProfile?.fitness_classes) as {
    id: string; name: string; slug: string;
    xp_bonus_multiplier: number; off_class_reduction: number;
    special_abilities: Record<string, unknown>;
  } | null;

  const isPaladin = activeClass?.slug === "paladin";
  const classMatch = activeClass
    ? checkClassMatch(exerciseCategory, activeClass.slug)
    : false;

  // Get active XP event multiplier
  const { data: activeEvents } = await supabase
    .from("xp_events")
    .select("multiplier, event_type, class_id, exercise_category")
    .eq("is_active", true)
    .lte("start_date", new Date().toISOString())
    .gte("end_date", new Date().toISOString());

  let eventMultiplier = 1.0;
  for (const ev of activeEvents ?? []) {
    if (ev.event_type === "global" || ev.event_type === "double_xp") {
      eventMultiplier = Math.max(eventMultiplier, ev.multiplier);
    } else if (ev.event_type === "class" && ev.class_id === activeClass?.id) {
      eventMultiplier = Math.max(eventMultiplier, ev.multiplier);
    } else if (ev.event_type === "exercise_category" && ev.exercise_category === exerciseCategory) {
      eventMultiplier = Math.max(eventMultiplier, ev.multiplier);
    }
  }

  // Calculate XP
  const xpEarned = frozen ? 0 : calculateWorkoutXp({
    durationMinutes: durationMinutes ?? 25,
    intensity,
    isClassMatch: classMatch,
    isOffClass: !classMatch,
    classBonusMultiplier: activeClass?.xp_bonus_multiplier ?? 1.0,
    offClassReduction: activeClass?.off_class_reduction ?? 0.6,
    isPaladin,
    activeEventMultiplier: eventMultiplier,
  });

  const pointsEarned = frozen ? 0 : calculateWorkoutPoints(classMatch);

  // Insert workout log
  const { data: workout, error: wError } = await supabase
    .from("workout_logs")
    .insert({
      user_id: user.id,
      exercise_id: exerciseId ?? null,
      class_id: activeClass?.id ?? null,
      exercise_name: exerciseName,
      exercise_category: exerciseCategory,
      sets: sets ?? null,
      reps: reps ?? null,
      weight_kg: weightKg ?? null,
      duration_minutes: durationMinutes ?? null,
      distance_km: distanceKm ?? null,
      intensity,
      notes: notes ?? null,
      xp_earned: xpEarned,
      points_earned: pointsEarned,
      workout_date: wDate.toISOString(),
      data_source: dataSource,
    })
    .select("id")
    .single();

  if (wError) return NextResponse.json({ error: wError.message }, { status: 500 });

  if (!activeClass || xpEarned === 0) {
    return NextResponse.json({ workoutId: workout.id, xpEarned: 0, pointsEarned, leveledUp: false });
  }

  // Update class progress XP
  const { data: progress } = await supabase
    .from("member_class_progress")
    .select("current_level, current_xp, total_xp_earned")
    .eq("user_id", user.id)
    .eq("class_id", activeClass.id)
    .maybeSingle();

  if (!progress) {
    // No progress row yet — create it
    await supabase.from("member_class_progress").insert({
      user_id: user.id,
      class_id: activeClass.id,
      current_xp: xpEarned,
      total_xp_earned: xpEarned,
    });
    return NextResponse.json({ workoutId: workout.id, xpEarned, pointsEarned, leveledUp: false, newLevel: 1 });
  }

  let currentLevel = progress.current_level;
  let currentXp    = progress.current_xp + xpEarned;
  let leveledUp    = false;
  let levelsGained = 0;

  // Process level ups
  while (currentLevel < 50 && currentXp >= xpPerLevel(currentLevel)) {
    currentXp   -= xpPerLevel(currentLevel);
    currentLevel += 1;
    levelsGained += 1;
    leveledUp = true;
  }
  if (currentLevel >= 50) {
    currentXp = Math.min(currentXp, xpPerLevel(49)); // cap at max level XP
  }

  // Save updated progress
  await supabase
    .from("member_class_progress")
    .update({
      current_level: currentLevel,
      current_xp: currentXp,
      total_xp_earned: progress.total_xp_earned + xpEarned,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("class_id", activeClass.id);

  // Update highest level on profile (best effort)
  try { await supabase.rpc("recalculate_member_tier", { p_user_id: user.id }); } catch { /* best effort */ }

  // Award level-up XP and points bonuses if leveled up
  if (leveledUp && !frozen) {
    const levelBonusXp  = levelUpXpReward(currentLevel);
    const levelBonusPts = levelUpPointsReward(currentLevel);

    // Award level up XP to class progress
    await supabase
      .from("member_class_progress")
      .update({ current_xp: currentXp + levelBonusXp, total_xp_earned: progress.total_xp_earned + xpEarned + levelBonusXp })
      .eq("user_id", user.id)
      .eq("class_id", activeClass.id);

    // Award loyalty points
    await supabase
      .from("loyalty_events")
      .insert({ user_id: user.id, delta: levelBonusPts, reason: "fitness_level_up" });

    // Viking bonus
    if (activeClass.slug === "viking") {
      await supabase
        .from("loyalty_events")
        .insert({ user_id: user.id, delta: 10, reason: "fitness_viking_level_bonus" });
    }

    // Update profile highest level
    const { data: allProgress } = await supabase
      .from("member_class_progress")
      .select("current_level")
      .eq("user_id", user.id)
      .order("current_level", { ascending: false })
      .limit(1);

    const highestLevel = allProgress?.[0]?.current_level ?? currentLevel;
    await supabase
      .from("profiles")
      .update({ fitness_level_highest: highestLevel })
      .eq("id", user.id);

    // Recalculate tier with new fitness level
    try { await supabase.rpc("recalculate_member_tier", { p_user_id: user.id }); } catch { /* best effort */ }
  }

  return NextResponse.json({
    workoutId: workout.id,
    xpEarned,
    pointsEarned,
    leveledUp,
    newLevel: currentLevel,
    newXp: currentXp,
    levelsGained,
  });
}

/**
 * GET /api/fitness/workouts
 * Returns the current user's workout history.
 * Query params: limit, offset, category, startDate, endDate
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit     = parseInt(searchParams.get("limit") ?? "20");
  const offset    = parseInt(searchParams.get("offset") ?? "0");
  const category  = searchParams.get("category");
  const startDate = searchParams.get("startDate");
  const endDate   = searchParams.get("endDate");

  let query = supabase
    .from("workout_logs")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("exercise_category", category);
  if (startDate) query = query.gte("workout_date", startDate);
  if (endDate)   query = query.lte("workout_date", endDate);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ workouts: data ?? [], total: count ?? 0, offset, limit });
}
