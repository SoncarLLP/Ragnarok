import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/nutrition/achievements
 * Returns all nutrition achievements with earned status for the current user.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [{ data: achievements }, { data: earned }] = await Promise.all([
    supabase.from("nutrition_achievements").select("*").order("points_reward", { ascending: false }),
    supabase.from("member_nutrition_achievements").select("achievement_id, earned_at").eq("user_id", user.id),
  ]);

  const earnedSet = new Set((earned ?? []).map((e: { achievement_id: string }) => e.achievement_id));
  const earnedDates = new Map((earned ?? []).map((e: { achievement_id: string; earned_at: string }) => [e.achievement_id, e.earned_at]));

  const combined = (achievements ?? []).map((a: { id: string }) => ({
    ...a,
    earned: earnedSet.has(a.id),
    earned_at: earnedDates.get(a.id) ?? null,
  }));

  return NextResponse.json({ achievements: combined });
}
