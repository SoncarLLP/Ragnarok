import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/nutrition/history?days=30&offset=0
 * Returns daily nutrition summaries for the past N days.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 90);

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: logs, error } = await supabase
    .from("nutrition_logs")
    .select("logged_date, nutrient_data, meal_category")
    .eq("user_id", user.id)
    .gte("logged_date", cutoff)
    .order("logged_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by date and sum nutrients
  const byDate = new Map<string, {
    calories: number; protein: number; carbs: number; fat: number;
    fibre: number; sugar: number; log_count: number; meal_categories: Set<string>
  }>();

  for (const log of (logs ?? [])) {
    const d = log.logged_date;
    if (!byDate.has(d)) {
      byDate.set(d, { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0, log_count: 0, meal_categories: new Set() });
    }
    const entry = byDate.get(d)!;
    entry.calories += log.nutrient_data.calories ?? 0;
    entry.protein  += log.nutrient_data.protein ?? 0;
    entry.carbs    += log.nutrient_data.carbs ?? 0;
    entry.fat      += log.nutrient_data.fat ?? 0;
    entry.fibre    += log.nutrient_data.fibre ?? 0;
    entry.sugar    += log.nutrient_data.sugar ?? 0;
    entry.log_count += 1;
    entry.meal_categories.add(log.meal_category);
  }

  // Also get water for the same period
  const { data: waterLogs } = await supabase
    .from("water_logs")
    .select("logged_at, amount_ml")
    .eq("user_id", user.id)
    .gte("logged_at", `${cutoff}T00:00:00.000Z`)
    .order("logged_at", { ascending: true });

  const waterByDate = new Map<string, number>();
  for (const w of (waterLogs ?? [])) {
    const d = w.logged_at.split("T")[0];
    waterByDate.set(d, (waterByDate.get(d) ?? 0) + w.amount_ml);
  }

  // Get streak and goals
  const [{ data: streak }, { data: goals }] = await Promise.all([
    supabase.from("nutrition_streaks").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("nutrition_goals").select("calories,protein_g,carbs_g,fat_g,water_ml").eq("user_id", user.id).maybeSingle(),
  ]);

  const daily = Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    calories:        Math.round(data.calories),
    protein:         Math.round(data.protein),
    carbs:           Math.round(data.carbs),
    fat:             Math.round(data.fat),
    fibre:           Math.round(data.fibre),
    sugar:           Math.round(data.sugar),
    water_ml:        waterByDate.get(date) ?? 0,
    log_count:       data.log_count,
    meal_categories: Array.from(data.meal_categories),
  }));

  return NextResponse.json({
    daily,
    streak: streak ?? { current_streak: 0, longest_streak: 0 },
    goals: goals ?? null,
    days,
  });
}
