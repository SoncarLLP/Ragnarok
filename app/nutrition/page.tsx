import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MEAL_CATEGORIES, sumNutrients, macroPercent } from "@/lib/nutrition";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";

export default async function NutritionDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = new Date().toISOString().split("T")[0];

  const [
    { data: todayLogs },
    { data: goals },
    { data: streak },
    { data: waterLogs },
    { data: ragnarokProfiles },
    { data: recentAchievements },
  ] = await Promise.all([
    supabase.from("nutrition_logs").select("*").eq("user_id", user.id).eq("logged_date", today),
    supabase.from("nutrition_goals").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("nutrition_streaks").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("water_logs").select("amount_ml").eq("user_id", user.id)
      .gte("logged_at", `${today}T00:00:00.000Z`).lte("logged_at", `${today}T23:59:59.999Z`),
    supabase.from("ragnarok_nutrition_profiles").select("product_name,product_slug,nutrient_data,serving_size,serving_unit").limit(3),
    supabase.from("member_nutrition_achievements").select("nutrition_achievements(name,icon)").eq("user_id", user.id)
      .order("earned_at", { ascending: false }).limit(3),
  ]);

  const logs = todayLogs ?? [];
  const totalNutrients = sumNutrients(logs.map((l: { nutrient_data: Record<string, number> }) => l.nutrient_data));
  const totalWater = (waterLogs ?? []).reduce((s: number, w: { amount_ml: number }) => s + w.amount_ml, 0);

  const calorieTarget  = goals?.calories ?? 2000;
  const proteinTarget  = goals?.protein_g ?? 150;
  const carbsTarget    = goals?.carbs_g ?? 250;
  const fatTarget      = goals?.fat_g ?? 65;
  const waterTarget    = goals?.water_ml ?? 2000;

  const loggedCategories = new Set(logs.map((l: { meal_category: string }) => l.meal_category));

  return (
    <div className="space-y-6">
      {/* Daily summary card */}
      <div className="rounded-2xl p-6" style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--nrs-text)" }}>
              Today&apos;s Nutrition
            </h2>
            <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: "var(--nrs-text)" }}>
              {Math.round(totalNutrients.calories ?? 0)}
            </div>
            <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>/ {calorieTarget} kcal</div>
          </div>
        </div>

        {/* Macro bars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Protein",      val: totalNutrients.protein ?? 0, target: proteinTarget,  unit: "g", color: "#60a5fa" },
            { label: "Carbs",        val: totalNutrients.carbs ?? 0,   target: carbsTarget,    unit: "g", color: "#fbbf24" },
            { label: "Fat",          val: totalNutrients.fat ?? 0,     target: fatTarget,       unit: "g", color: "#f97316" },
            { label: "Water",        val: totalWater,                   target: waterTarget,    unit: "ml", color: "#34d399" },
          ].map(({ label, val, target, unit, color }) => {
            const pct = macroPercent(val, target);
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "var(--nrs-text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--nrs-text)" }}>{Math.round(val)}{unit}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "var(--nrs-panel)" }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <div className="text-[10px] mt-0.5 text-right" style={{ color: "var(--nrs-text-muted)" }}>
                  {pct}% of {target}{unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak + quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard emoji="🔥" label="Nutrition Streak" value={`${streak?.current_streak ?? 0} days`} />
        <StatCard emoji="💧" label="Water Today" value={`${totalWater}ml`} />
        <StatCard emoji="📔" label="Meals Logged" value={`${loggedCategories.size} / 7`} />
        <StatCard emoji="🌟" label="Best Streak" value={`${streak?.longest_streak ?? 0} days`} />
      </div>

      {/* Meal log summary */}
      <div className="rounded-xl" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--nrs-border-subtle)" }}>
          <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Today&apos;s Meals</h2>
          <Link
            href="/nutrition/diary"
            className="text-sm font-medium"
            style={{ color: "var(--nrs-accent)" }}
          >
            Open diary →
          </Link>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--nrs-border-subtle)" }}>
          {MEAL_CATEGORIES.map((cat) => {
            const catLogs = logs.filter((l: { meal_category: string }) => l.meal_category === cat.key);
            const catCals = catLogs.reduce((s: number, l: { nutrient_data: { calories?: number } }) => s + (l.nutrient_data.calories ?? 0), 0);
            return (
              <div key={cat.key} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span className="text-sm" style={{ color: catLogs.length > 0 ? "var(--nrs-text)" : "var(--nrs-text-muted)" }}>
                    {cat.label}
                  </span>
                  {catLogs.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}>
                      {catLogs.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {catLogs.length > 0 && (
                    <span className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
                      {Math.round(catCals)} kcal
                    </span>
                  )}
                  <Link
                    href={`/nutrition/diary?category=${cat.key}`}
                    className="text-xs px-3 py-1 rounded-lg transition"
                    style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)", border: "1px solid var(--nrs-border)" }}
                  >
                    + Add
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Ragnarök supplements */}
        <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }}>
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--nrs-text)" }}>
            🌿 Ragnarök Products
          </h2>
          <div className="space-y-2">
            {(ragnarokProfiles ?? []).map((p: { product_slug: string; product_name: string; nutrient_data: { calories?: number; protein?: number }; serving_size: number; serving_unit: string }) => (
              <Link
                key={p.product_slug}
                href={`/nutrition/search?q=${encodeURIComponent(p.product_name)}`}
                className="flex items-center justify-between p-3 rounded-lg transition hover:opacity-80"
                style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)" }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{p.product_name}</div>
                  <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                    {p.nutrient_data.calories ?? 0}kcal · {p.nutrient_data.protein ?? 0}g protein
                    · per {p.serving_size}{p.serving_unit}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}>
                  ✓ Verified
                </span>
              </Link>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--nrs-text-muted)" }}>
            Log Ragnarök products to earn +25 loyalty points per day per product.
          </p>
        </div>

        {/* AI Suggestion CTA + recent achievements */}
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
            <h2 className="font-semibold mb-1" style={{ color: "var(--nrs-text)" }}>🤖 AI Meal Suggestions</h2>
            <p className="text-sm mb-3" style={{ color: "var(--nrs-text-muted)" }}>
              Get personalised suggestions to hit your remaining targets.
            </p>
            <Link
              href="/nutrition/diary"
              className="block text-center py-2 rounded-lg text-sm font-semibold transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
            >
              Get Suggestions
            </Link>
          </div>

          {recentAchievements && recentAchievements.length > 0 && (
            <div className="rounded-xl p-4" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
              <h2 className="font-semibold mb-2 text-sm" style={{ color: "var(--nrs-text)" }}>Recent Achievements</h2>
              <div className="flex flex-wrap gap-2">
                {recentAchievements.map((ra: { nutrition_achievements: { name: string; icon: string } | { name: string; icon: string }[] | null }, i: number) => {
                  const ach = Array.isArray(ra.nutrition_achievements) ? ra.nutrition_achievements[0] : ra.nutrition_achievements;
                  if (!ach) return null;
                  return (
                    <span key={i} className="text-xl" title={ach.name}>{ach.icon}</span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/nutrition/diary",   emoji: "📔", label: "Food Diary" },
          { href: "/nutrition/goals",   emoji: "🎯", label: "Set Goals" },
          { href: "/nutrition/planner", emoji: "📅", label: "Meal Planner" },
          { href: "/nutrition/recipes", emoji: "👨‍🍳", label: "Recipes" },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition hover:opacity-80"
            style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
          >
            <span className="text-2xl">{link.emoji}</span>
            <span className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>{label}</div>
    </div>
  );
}
