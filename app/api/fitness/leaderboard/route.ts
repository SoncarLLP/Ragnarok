import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/leaderboard
 * Returns leaderboard data.
 * Query params: type (xp|streak|prestige), period (week|month|alltime), classSlug, limit
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type      = searchParams.get("type") ?? "xp";
  const period    = searchParams.get("period") ?? "week";
  const classSlug = searchParams.get("classSlug");
  const limit     = parseInt(searchParams.get("limit") ?? "20");

  let data: unknown[] = [];

  if (type === "xp" && period === "week") {
    // Top XP earners this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const { data: workouts } = await supabase
      .from("workout_logs")
      .select("user_id, xp_earned")
      .gte("workout_date", weekStart.toISOString());

    const xpByUser: Record<string, number> = {};
    for (const w of workouts ?? []) {
      xpByUser[w.user_id] = (xpByUser[w.user_id] ?? 0) + w.xp_earned;
    }

    const topUsers = Object.entries(xpByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    if (topUsers.length > 0) {
      const userIds = topUsers.map(([uid]) => uid);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, tier, active_class_id")
        .in("id", userIds);

      const { data: fitnessProfiles } = await supabase
        .from("member_fitness_profiles")
        .select("user_id, active_class_id, fitness_classes(name, icon, slug)")
        .in("user_id", userIds);

      const { data: classProgress } = await supabase
        .from("member_class_progress")
        .select("user_id, class_id, current_level")
        .in("user_id", userIds);

      const profileMap  = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      const fpMap       = Object.fromEntries((fitnessProfiles ?? []).map((fp) => [fp.user_id, fp]));
      const cpMap: Record<string, number> = {};
      for (const cp of classProgress ?? []) {
        if (!cpMap[cp.user_id] || cp.current_level > cpMap[cp.user_id]) {
          cpMap[cp.user_id] = cp.current_level;
        }
      }

      data = topUsers.map(([uid, xp], idx) => {
        const p  = profileMap[uid];
        const fp = fpMap[uid];
        const fc = fp?.fitness_classes as { name: string; icon: string; slug: string } | null;
        return {
          rank: idx + 1,
          userId: uid,
          displayName: p?.full_name ?? "Unknown",
          tier: p?.tier ?? "Thrall I",
          className: fc?.name ?? "—",
          classIcon: fc?.icon ?? "💪",
          classSlug: fc?.slug ?? "",
          classLevel: cpMap[uid] ?? 1,
          value: xp,
          isCurrentUser: uid === user.id,
        };
      });
    }
  } else if (type === "streak") {
    const { data: streaks } = await supabase
      .from("fitness_streaks")
      .select("user_id, current_streak, longest_streak")
      .order("current_streak", { ascending: false })
      .limit(limit);

    if (streaks && streaks.length > 0) {
      const userIds = streaks.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, tier")
        .in("id", userIds);

      const { data: fps } = await supabase
        .from("member_fitness_profiles")
        .select("user_id, fitness_classes(name, icon)")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      const fpMap = Object.fromEntries((fps ?? []).map((fp) => [fp.user_id, fp]));

      data = streaks.map((s, idx) => {
        const p = profileMap[s.user_id];
        const fp = fpMap[s.user_id];
        const fc = fp?.fitness_classes as { name: string; icon: string } | null;
        return {
          rank: idx + 1,
          userId: s.user_id,
          displayName: p?.full_name ?? "Unknown",
          tier: p?.tier ?? "Thrall I",
          className: fc?.name ?? "—",
          classIcon: fc?.icon ?? "💪",
          value: s.current_streak,
          longestStreak: s.longest_streak,
          isCurrentUser: s.user_id === user.id,
        };
      });
    }
  } else if (type === "prestige") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, tier, fitness_prestige_total")
      .order("fitness_prestige_total", { ascending: false })
      .gt("fitness_prestige_total", 0)
      .limit(limit);

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map((p) => p.id);
      const { data: fps } = await supabase
        .from("member_fitness_profiles")
        .select("user_id, fitness_classes(name, icon)")
        .in("user_id", userIds);

      const fpMap = Object.fromEntries((fps ?? []).map((fp) => [fp.user_id, fp]));

      data = profiles.map((p, idx) => {
        const fp = fpMap[p.id];
        const fc = fp?.fitness_classes as { name: string; icon: string } | null;
        return {
          rank: idx + 1,
          userId: p.id,
          displayName: p.full_name ?? "Unknown",
          tier: p.tier ?? "Thrall I",
          className: fc?.name ?? "—",
          classIcon: fc?.icon ?? "💪",
          value: p.fitness_prestige_total,
          isCurrentUser: p.id === user.id,
        };
      });
    }
  }

  return NextResponse.json({ leaderboard: data, type, period });
}
