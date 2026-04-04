import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NutritionAchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: achievements }, { data: earned }] = await Promise.all([
    supabase.from("nutrition_achievements").select("*").order("points_reward", { ascending: false }),
    supabase.from("member_nutrition_achievements").select("achievement_id, earned_at").eq("user_id", user.id),
  ]);

  const earnedSet = new Set((earned ?? []).map((e: { achievement_id: string }) => e.achievement_id));
  const earnedDates = new Map((earned ?? []).map((e: { achievement_id: string; earned_at: string }) => [e.achievement_id, e.earned_at]));

  const totalEarned = earnedSet.size;
  const totalAchs   = (achievements ?? []).length;

  const combined = (achievements ?? []).map((a: { id: string; name: string; description: string; icon: string; points_reward: number }) => ({
    ...a,
    earned: earnedSet.has(a.id),
    earned_at: earnedDates.get(a.id) ?? null,
  }));

  const earnedAchs  = combined.filter(a => a.earned);
  const unearnedAchs = combined.filter(a => !a.earned);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--nrs-text)" }}>Nutrition Achievements</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
            {totalEarned} / {totalAchs} earned
          </p>
        </div>
        <div
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}
        >
          {Math.round((totalEarned / Math.max(totalAchs, 1)) * 100)}% complete
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full" style={{ background: "var(--nrs-panel)" }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${(totalEarned / Math.max(totalAchs, 1)) * 100}%`, background: "var(--nrs-accent)" }}
        />
      </div>

      {/* Earned achievements */}
      {earnedAchs.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--nrs-text-muted)" }}>
            Earned ({earnedAchs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {earnedAchs.map(a => (
              <div
                key={a.id}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }}
              >
                <div className="text-3xl">{a.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>{a.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>{a.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium" style={{ color: "var(--nrs-accent)" }}>+{a.points_reward} pts</span>
                    {a.earned_at && (
                      <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                        Earned {new Date(a.earned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-green-400 text-sm">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unearned achievements */}
      {unearnedAchs.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--nrs-text-muted)" }}>
            Locked ({unearnedAchs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unearnedAchs.map(a => (
              <div
                key={a.id}
                className="flex items-start gap-3 p-4 rounded-xl opacity-60"
                style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
              >
                <div className="text-3xl grayscale">{a.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>{a.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>{a.description}</div>
                  <span className="text-xs font-medium" style={{ color: "var(--nrs-text-muted)" }}>+{a.points_reward} pts</span>
                </div>
                <span className="text-xl">🔒</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
