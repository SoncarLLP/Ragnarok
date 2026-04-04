import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NutritionHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [{ data: logs }, { data: streak }, { data: goals }, { data: waterLogs }] = await Promise.all([
    supabase.from("nutrition_logs").select("logged_date, nutrient_data").eq("user_id", user.id).gte("logged_date", thirtyDaysAgo).order("logged_date", { ascending: true }),
    supabase.from("nutrition_streaks").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("nutrition_goals").select("calories,protein_g,carbs_g,fat_g,water_ml").eq("user_id", user.id).maybeSingle(),
    supabase.from("water_logs").select("logged_at, amount_ml").eq("user_id", user.id).gte("logged_at", `${thirtyDaysAgo}T00:00:00.000Z`),
  ]);

  // Group by date
  const byDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number; count: number }>();
  for (const log of (logs ?? [])) {
    const d = log.logged_date;
    if (!byDate.has(d)) byDate.set(d, { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
    const e = byDate.get(d)!;
    e.calories += log.nutrient_data.calories ?? 0;
    e.protein  += log.nutrient_data.protein ?? 0;
    e.carbs    += log.nutrient_data.carbs ?? 0;
    e.fat      += log.nutrient_data.fat ?? 0;
    e.count    += 1;
  }

  const waterByDate = new Map<string, number>();
  for (const w of (waterLogs ?? [])) {
    const d = w.logged_at.split("T")[0];
    waterByDate.set(d, (waterByDate.get(d) ?? 0) + w.amount_ml);
  }

  const daily = Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    calories: Math.round(data.calories),
    protein: Math.round(data.protein),
    carbs: Math.round(data.carbs),
    fat: Math.round(data.fat),
    water: waterByDate.get(date) ?? 0,
    count: data.count,
  })).reverse();

  const avgCalories = daily.length > 0 ? Math.round(daily.reduce((s, d) => s + d.calories, 0) / daily.length) : 0;
  const avgProtein  = daily.length > 0 ? Math.round(daily.reduce((s, d) => s + d.protein, 0) / daily.length) : 0;
  const daysLogged  = byDate.size;

  const calorieTarget = goals?.calories ?? 2000;
  const proteinTarget = goals?.protein_g ?? 150;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--nrs-text)" }}>Nutrition History</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>Last 30 days</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Current Streak", value: `${streak?.current_streak ?? 0} days`, emoji: "🔥" },
          { label: "Best Streak", value: `${streak?.longest_streak ?? 0} days`, emoji: "🏆" },
          { label: "Days Logged", value: `${daysLogged} / 30`, emoji: "📔" },
          { label: "Avg Calories", value: `${avgCalories} kcal`, emoji: "⚡" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4 text-center" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
            <div className="text-2xl mb-1">{stat.emoji}</div>
            <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>{stat.value}</div>
            <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Averages vs targets */}
      <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <h2 className="font-semibold mb-4" style={{ color: "var(--nrs-text)" }}>30-Day Averages vs Targets</h2>
        <div className="space-y-3">
          {[
            { label: "Calories", avg: avgCalories, target: calorieTarget, unit: "kcal", color: "#60a5fa" },
            { label: "Protein",  avg: avgProtein,  target: proteinTarget, unit: "g",    color: "#34d399" },
          ].map(({ label, avg, target, unit, color }) => {
            const pct = target > 0 ? Math.min(100, Math.round((avg / target) * 100)) : 0;
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "var(--nrs-text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--nrs-text)" }}>avg {avg}{unit} / {target}{unit} target</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "var(--nrs-panel)" }}>
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily log table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--nrs-border-subtle)" }}>
          <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Daily Log</h2>
        </div>
        {daily.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--nrs-text-muted)" }}>
            No nutrition data logged in the last 30 days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--nrs-border-subtle)" }}>
                  {["Date", "Calories", "Protein", "Carbs", "Fat", "Water", "Entries"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--nrs-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daily.map((d, i) => {
                  const calOk = calorieTarget > 0 && d.calories >= calorieTarget * 0.85 && d.calories <= calorieTarget * 1.15;
                  return (
                    <tr key={d.date} style={{ borderBottom: i < daily.length - 1 ? "1px solid var(--nrs-border-subtle)" : "none" }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                        {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: calOk ? "#34d399" : "var(--nrs-text)" }}>
                        {d.calories}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--nrs-text)" }}>{d.protein}g</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--nrs-text)" }}>{d.carbs}g</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--nrs-text)" }}>{d.fat}g</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--nrs-text-muted)" }}>{d.water}ml</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--nrs-text-muted)" }}>{d.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
