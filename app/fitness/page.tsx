import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTierName } from "@/lib/loyalty";
import { xpPerLevel, xpToNextLevel, classTitle } from "@/lib/fitness";
import ClassBadge from "@/components/fitness/ClassBadge";
import XPBar from "@/components/fitness/XPBar";
import StreakBadge from "@/components/fitness/StreakBadge";
import WorkoutCard from "@/components/fitness/WorkoutCard";
import XPEventBanner from "@/components/fitness/XPEventBanner";

export default async function FitnessDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const now = new Date().toISOString();

  const [
    { data: fitnessProfile },
    { data: classProgress },
    { data: streak },
    { data: recentWorkouts },
    { data: activeEvents },
    { data: challenges },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("member_fitness_profiles")
      .select("*, fitness_classes(*)")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("member_class_progress")
      .select("*, fitness_classes(id, name, slug, icon)")
      .eq("user_id", user.id)
      .order("total_xp_earned", { ascending: false }),

    supabase
      .from("fitness_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("workout_date", { ascending: false })
      .limit(5),

    supabase
      .from("xp_events")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", now)
      .gte("end_date", now),

    supabase
      .from("fitness_challenges")
      .select("*, member_challenge_progress!left(current_value, completed)")
      .eq("is_active", true)
      .gte("end_date", now)
      .order("end_date", { ascending: true })
      .limit(3),

    supabase
      .from("profiles")
      .select("total_fitness_xp, tier, full_name")
      .eq("id", user.id)
      .single(),
  ]);

  const activeClass = fitnessProfile?.fitness_classes as {
    id: string; name: string; slug: string; icon: string;
  } | null;

  const activeProgress = classProgress?.find(
    (cp) => cp.class_id === (fitnessProfile?.active_class_id ?? "")
  );

  const tierName = formatTierName(profile?.tier ?? "Thrall I");
  const displayName = profile?.full_name ?? "Warrior";
  const hasClass = !!activeClass;

  return (
    <div className="space-y-6">
      {/* XP Event Banner */}
      {activeEvents && activeEvents.length > 0 && (
        <XPEventBanner events={activeEvents} />
      )}

      {/* Hero: Active class */}
      {!hasClass ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}
        >
          <div className="text-4xl mb-3">⚔️</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--nrs-text)" }}>
            Choose Your Class
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--nrs-text-muted)" }}>
            Your RPG fitness journey begins with choosing a class. Each class has unique bonuses and exercises.
          </p>
          <Link
            href="/fitness/classes"
            className="inline-block px-6 py-2.5 rounded-lg font-semibold transition"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
          >
            Choose Your Class →
          </Link>
        </div>
      ) : (
        <div
          className="rounded-2xl p-6"
          style={{ border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm mb-1" style={{ color: "var(--nrs-text-muted)" }}>
                Active Class · {tierName}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{activeClass.icon}</span>
                <div>
                  <div className="text-xl font-bold" style={{ color: "var(--nrs-text)" }}>
                    {classTitle(
                      activeClass.name,
                      activeProgress?.current_level ?? 1,
                      activeProgress?.prestige_count ?? 0
                    )}
                  </div>
                  <ClassBadge
                    className={activeClass.name}
                    classIcon={activeClass.icon}
                    level={activeProgress?.current_level ?? 1}
                    prestigeCount={activeProgress?.prestige_count ?? 0}
                    size="sm"
                  />
                </div>
              </div>
              <XPBar
                level={activeProgress?.current_level ?? 1}
                currentXp={activeProgress?.current_xp ?? 0}
                showNumbers
              />
            </div>
            <div className="text-right">
              <div className="text-xs mb-1" style={{ color: "var(--nrs-text-muted)" }}>Total Fitness XP</div>
              <div className="text-2xl font-bold" style={{ color: "var(--nrs-accent)" }}>
                {(profile?.total_fitness_xp ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Streak */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
        >
          <div className="text-2xl">{streak?.current_streak ? "🔥" : "📅"}</div>
          <div className="text-xl font-bold mt-1" style={{ color: "var(--nrs-text)" }}>
            {streak?.current_streak ?? 0}
          </div>
          <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>Day Streak</div>
        </div>

        {/* Classes levelled */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
        >
          <div className="text-2xl">⚔️</div>
          <div className="text-xl font-bold mt-1" style={{ color: "var(--nrs-text)" }}>
            {classProgress?.length ?? 0}
          </div>
          <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>Classes Tried</div>
        </div>

        {/* Prestige */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
        >
          <div className="text-2xl">⭐</div>
          <div className="text-xl font-bold mt-1" style={{ color: "var(--nrs-text)" }}>
            {classProgress?.reduce((s, cp) => s + (cp.prestige_count ?? 0), 0) ?? 0}
          </div>
          <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>Prestiges</div>
        </div>

        {/* Log Workout CTA */}
        <Link
          href="/fitness/log"
          className="rounded-xl p-4 text-center transition hover:scale-[1.02]"
          style={{ border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }}
        >
          <div className="text-2xl">➕</div>
          <div className="text-sm font-semibold mt-1" style={{ color: "var(--nrs-accent)" }}>Log Workout</div>
        </Link>
      </div>

      {/* Active challenges */}
      {challenges && challenges.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Active Challenges</h2>
            <Link href="/fitness/challenges" className="text-xs hover:underline" style={{ color: "var(--nrs-text-muted)" }}>
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {challenges.map((c) => {
              const progress = Array.isArray(c.member_challenge_progress)
                ? c.member_challenge_progress[0]
                : null;
              const pct = progress
                ? Math.min(100, (progress.current_value / c.target_value) * 100)
                : 0;
              return (
                <div
                  key={c.id}
                  className="rounded-lg p-3"
                  style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
                      {c.title}
                      {progress?.completed && (
                        <span className="ml-2 text-emerald-400 text-xs">✓ Complete</span>
                      )}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: "var(--nrs-accent)" }}>
                      +{c.xp_reward} XP
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--nrs-panel)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: progress?.completed ? "#34d399" : "var(--nrs-accent)",
                      }}
                    />
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
                    {progress?.current_value ?? 0} / {c.target_value} · Ends {new Date(c.end_date).toLocaleDateString("en-GB")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All classes progress */}
      {classProgress && classProgress.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>All Class Progress</h2>
            <Link href="/fitness/classes" className="text-xs hover:underline" style={{ color: "var(--nrs-text-muted)" }}>
              Change class →
            </Link>
          </div>
          <div className="space-y-2">
            {classProgress.map((cp) => {
              const fc = cp.fitness_classes as { name: string; icon: string; slug: string } | null;
              if (!fc) return null;
              const isActive = cp.class_id === fitnessProfile?.active_class_id;
              return (
                <div
                  key={cp.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    border: `1px solid ${isActive ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                    background: isActive ? "var(--nrs-accent-dim)" : "var(--nrs-card)",
                  }}
                >
                  <span className="text-lg shrink-0">{fc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
                        {fc.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full text-emerald-400 border border-emerald-400/30"
                          style={{ background: "rgba(52,211,153,0.1)" }}>
                          Active
                        </span>
                      )}
                      {(cp.prestige_count ?? 0) > 0 && (
                        <span className="text-amber-400 text-xs">
                          {"⭐".repeat(Math.min(cp.prestige_count ?? 0, 3))}
                          {(cp.prestige_count ?? 0) > 3 ? `×${cp.prestige_count}` : ""}
                        </span>
                      )}
                    </div>
                    <XPBar
                      level={cp.current_level}
                      currentXp={cp.current_xp}
                      showNumbers={false}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent workouts */}
      {recentWorkouts && recentWorkouts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Recent Workouts</h2>
            <Link href="/fitness/history" className="text-xs hover:underline" style={{ color: "var(--nrs-text-muted)" }}>
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <WorkoutCard
                key={w.id}
                id={w.id}
                exerciseName={w.exercise_name}
                exerciseCategory={w.exercise_category}
                durationMinutes={w.duration_minutes}
                sets={w.sets}
                reps={w.reps}
                weightKg={w.weight_kg}
                distanceKm={w.distance_km}
                intensity={w.intensity}
                xpEarned={w.xp_earned}
                pointsEarned={w.points_earned}
                workoutDate={w.workout_date}
                notes={w.notes}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick links if no workouts */}
      {(!recentWorkouts || recentWorkouts.length === 0) && hasClass && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
        >
          <div className="text-3xl mb-2">💪</div>
          <p className="text-sm mb-4" style={{ color: "var(--nrs-text-muted)" }}>
            No workouts logged yet. Start your journey!
          </p>
          <Link
            href="/fitness/log"
            className="inline-block px-5 py-2 rounded-lg font-semibold transition text-sm"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
          >
            Log Your First Workout →
          </Link>
        </div>
      )}
    </div>
  );
}
