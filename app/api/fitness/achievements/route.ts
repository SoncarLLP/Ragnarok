import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/achievements
 * Returns all achievements with the user's earned status.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [{ data: allAchievements }, { data: earned }] = await Promise.all([
    supabase
      .from("fitness_achievements")
      .select("*")
      .order("category")
      .order("requirement_value"),
    supabase
      .from("member_achievements")
      .select("achievement_id, earned_at")
      .eq("user_id", user.id),
  ]);

  const earnedMap = Object.fromEntries(
    (earned ?? []).map((e) => [e.achievement_id, e.earned_at])
  );

  const achievementsWithStatus = (allAchievements ?? []).map((a) => ({
    ...a,
    earned: !!earnedMap[a.id],
    earnedAt: earnedMap[a.id] ?? null,
  }));

  return NextResponse.json({ achievements: achievementsWithStatus });
}
