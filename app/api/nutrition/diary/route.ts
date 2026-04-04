import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scaleNutrients, NUTRITION_POINTS } from "@/lib/nutrition";

/**
 * GET /api/nutrition/diary?date=2026-04-07
 * Returns all food logs for the given date grouped by meal category.
 *
 * POST /api/nutrition/diary
 * Logs a food item to the diary.
 * Body: { food_cache_id?, custom_food_id?, ragnarok_product_id?, meal_category,
 *         serving_quantity, serving_unit, serving_grams, nutrient_data (per serving),
 *         food_name, food_brand?, logged_date, data_source? }
 *
 * DELETE /api/nutrition/diary?id=<log_id>
 * Removes a food log entry.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const { data: logs, error } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("logged_date", dateParam)
    .order("logged_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch water logs for this date
  const startOfDay = `${dateParam}T00:00:00.000Z`;
  const endOfDay   = `${dateParam}T23:59:59.999Z`;
  const { data: waterLogs } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", startOfDay)
    .lte("logged_at", endOfDay)
    .order("logged_at", { ascending: true });

  const totalWaterMl = (waterLogs ?? []).reduce((s: number, w: { amount_ml: number }) => s + w.amount_ml, 0);

  return NextResponse.json({
    logs: logs ?? [],
    water_logs: waterLogs ?? [],
    total_water_ml: totalWaterMl,
    date: dateParam,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    food_cache_id,
    custom_food_id,
    ragnarok_product_id,
    meal_category,
    serving_quantity = 1,
    serving_unit = "serving",
    serving_grams,
    nutrient_data,
    food_name,
    food_brand,
    logged_date = new Date().toISOString().split("T")[0],
    data_source = "web",
  } = body;

  if (!meal_category || !food_name || !nutrient_data) {
    return NextResponse.json({ error: "meal_category, food_name, and nutrient_data required" }, { status: 400 });
  }

  // Anti-backdating: max 7 days back
  const logDate = new Date(logged_date);
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (logDate < cutoff) {
    return NextResponse.json({ error: "Cannot log food more than 7 days in the past" }, { status: 400 });
  }
  if (logDate > new Date()) {
    return NextResponse.json({ error: "Cannot log food for a future date" }, { status: 400 });
  }

  // Scale nutrients based on serving
  let computedNutrients = nutrient_data;
  if (serving_grams && food_cache_id) {
    // nutrient_data is already per-serving (pre-computed by client)
    computedNutrients = nutrient_data;
  }

  const { data: log, error } = await supabase
    .from("nutrition_logs")
    .insert({
      user_id: user.id,
      food_cache_id: food_cache_id ?? null,
      custom_food_id: custom_food_id ?? null,
      ragnarok_product_id: ragnarok_product_id ?? null,
      meal_category,
      serving_quantity,
      serving_unit,
      serving_grams: serving_grams ?? null,
      nutrient_data: computedNutrients,
      food_name,
      food_brand: food_brand ?? null,
      logged_date,
      data_source,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award Ragnarök product loyalty points (25 pts, once per product per day)
  if (ragnarok_product_id) {
    await supabase.rpc("award_nutrition_points", {
      p_user_id: user.id,
      p_reward_type: `ragnarok_${ragnarok_product_id}`,
      p_points: NUTRITION_POINTS.ragnarok_product,
      p_date: logged_date,
    });
  }

  // Check if full day logged (at least 3 meal categories)
  await checkAndAwardDayPoints(supabase, user.id, logged_date);

  return NextResponse.json({ logId: log.id, success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("nutrition_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkAndAwardDayPoints(supabase: any, userId: string, date: string) {
  const { data: logs } = await supabase
    .from("nutrition_logs")
    .select("meal_category, nutrient_data")
    .eq("user_id", userId)
    .eq("logged_date", date);

  if (!logs || logs.length === 0) return;

  const categories = new Set(logs.map((l: { meal_category: string }) => l.meal_category));

  // Award full day logged (3+ categories)
  if (categories.size >= 3) {
    await supabase.rpc("award_nutrition_points", {
      p_user_id: userId,
      p_reward_type: "full_day_logged",
      p_points: NUTRITION_POINTS.full_day_logged,
      p_date: date,
    });
  }

  // Check macro targets
  const { data: goals } = await supabase
    .from("nutrition_goals")
    .select("calories, protein_g, carbs_g, fat_g")
    .eq("user_id", userId)
    .maybeSingle();

  if (goals) {
    const totals = logs.reduce(
      (acc: { calories: number; protein: number; carbs: number; fat: number }, l: { nutrient_data: { calories?: number; protein?: number; carbs?: number; fat?: number } }) => ({
        calories: acc.calories + (l.nutrient_data.calories ?? 0),
        protein:  acc.protein  + (l.nutrient_data.protein ?? 0),
        carbs:    acc.carbs    + (l.nutrient_data.carbs ?? 0),
        fat:      acc.fat      + (l.nutrient_data.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const inRange = (val: number, target: number) => target > 0 && val >= target * 0.9 && val <= target * 1.1;

    if (inRange(totals.calories, goals.calories)) {
      await supabase.rpc("award_nutrition_points", {
        p_user_id: userId, p_reward_type: "hit_calorie_target",
        p_points: NUTRITION_POINTS.hit_calorie_target, p_date: date,
      });
    }
    if (inRange(totals.protein, goals.protein_g)) {
      await supabase.rpc("award_nutrition_points", {
        p_user_id: userId, p_reward_type: "hit_protein_target",
        p_points: NUTRITION_POINTS.hit_protein_target, p_date: date,
      });
    }
    if (inRange(totals.calories, goals.calories) && inRange(totals.protein, goals.protein_g) &&
        inRange(totals.carbs, goals.carbs_g) && inRange(totals.fat, goals.fat_g)) {
      await supabase.rpc("award_nutrition_points", {
        p_user_id: userId, p_reward_type: "hit_all_macros",
        p_points: NUTRITION_POINTS.hit_all_macros, p_date: date,
      });
    }
  }
}

// Re-export scaleNutrients for use in client - not needed but keeps import clean
export { scaleNutrients };
