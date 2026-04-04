import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/challenges
 * Returns active challenges with the current user's progress.
 * Query params: type (weekly|monthly|class|community), classSlug
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type      = searchParams.get("type");
  const classSlug = searchParams.get("classSlug");

  let query = supabase
    .from("fitness_challenges")
    .select("*, fitness_classes(name, slug, icon)")
    .eq("is_active", true)
    .gte("end_date", new Date().toISOString())
    .order("end_date", { ascending: true });

  if (type) query = query.eq("challenge_type", type);

  const { data: challenges, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!challenges || challenges.length === 0) {
    return NextResponse.json({ challenges: [] });
  }

  // Attach user's progress
  const challengeIds = challenges.map((c) => c.id);
  const { data: userProgress } = await supabase
    .from("member_challenge_progress")
    .select("challenge_id, current_value, completed, completed_at")
    .eq("user_id", user.id)
    .in("challenge_id", challengeIds);

  const progressMap = Object.fromEntries(
    (userProgress ?? []).map((p) => [p.challenge_id, p])
  );

  const challengesWithProgress = challenges.map((c) => ({
    ...c,
    userProgress: progressMap[c.id] ?? { current_value: 0, completed: false },
    progressPercent: progressMap[c.id]
      ? Math.min(100, (progressMap[c.id].current_value / c.target_value) * 100)
      : 0,
  }));

  return NextResponse.json({ challenges: challengesWithProgress });
}
