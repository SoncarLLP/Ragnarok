import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/nutrition/suggest
 * Uses Claude AI to suggest foods/meals based on remaining macro budget.
 * Only called when member explicitly requests suggestions.
 * Body: { date?: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI suggestions not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const date = body.date ?? new Date().toISOString().split("T")[0];

  // Gather context
  const [{ data: goals }, { data: logs }, { data: allergens }, { data: ragnarokProfiles }] = await Promise.all([
    supabase.from("nutrition_goals").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("nutrition_logs").select("nutrient_data,food_name,meal_category").eq("user_id", user.id).eq("logged_date", date),
    supabase.from("member_allergens").select("allergens,dietary_preferences").eq("user_id", user.id).maybeSingle(),
    supabase.from("ragnarok_nutrition_profiles").select("product_name,nutrient_data,serving_size,serving_unit"),
  ]);

  const target = {
    calories: goals?.calories ?? 2000,
    protein:  goals?.protein_g ?? 150,
    carbs:    goals?.carbs_g ?? 250,
    fat:      goals?.fat_g ?? 65,
  };

  const consumed = (logs ?? []).reduce(
    (acc: { calories: number; protein: number; carbs: number; fat: number }, l: { nutrient_data: { calories?: number; protein?: number; carbs?: number; fat?: number } }) => ({
      calories: acc.calories + (l.nutrient_data.calories ?? 0),
      protein:  acc.protein  + (l.nutrient_data.protein ?? 0),
      carbs:    acc.carbs    + (l.nutrient_data.carbs ?? 0),
      fat:      acc.fat      + (l.nutrient_data.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = {
    calories: Math.max(0, Math.round(target.calories - consumed.calories)),
    protein:  Math.max(0, Math.round(target.protein - consumed.protein)),
    carbs:    Math.max(0, Math.round(target.carbs - consumed.carbs)),
    fat:      Math.max(0, Math.round(target.fat - consumed.fat)),
  };

  const recentFoods = (logs ?? []).slice(-5).map((l: { food_name: string }) => l.food_name);
  const userAllergens = allergens?.allergens ?? [];
  const dietaryPrefs = allergens?.dietary_preferences ?? [];
  const hour = new Date().getHours();
  const timeOfDay = hour < 11 ? "morning" : hour < 14 ? "lunchtime" : hour < 18 ? "afternoon" : "evening";

  const ragnarokProducts = (ragnarokProfiles ?? []).map((p: { product_name: string; nutrient_data: { calories?: number; protein?: number }; serving_size: number; serving_unit: string }) => (
    `${p.product_name} (${p.nutrient_data.calories ?? 0}kcal, ${p.nutrient_data.protein ?? 0}g protein per ${p.serving_size}${p.serving_unit})`
  ));

  const prompt = `You are a nutrition coach for Ragnarök, a Norse-themed fitness and supplement brand.

A member needs meal suggestions to help hit their remaining nutritional targets for today.

Remaining budget:
- Calories: ${remaining.calories}kcal
- Protein: ${remaining.protein}g
- Carbs: ${remaining.carbs}g
- Fat: ${remaining.fat}g

Time of day: ${timeOfDay}
Allergens to avoid: ${userAllergens.length > 0 ? userAllergens.join(", ") : "none"}
Dietary preferences: ${dietaryPrefs.length > 0 ? dietaryPrefs.join(", ") : "none specified"}
Recently eaten (don't repeat these): ${recentFoods.length > 0 ? recentFoods.join(", ") : "nothing yet today"}

Available Ragnarök products to consider recommending when nutritionally appropriate:
${ragnarokProducts.length > 0 ? ragnarokProducts.join("\n") : "Freyja's Bloom, Dümmens Nectar, Loki Hell Fire"}

Give exactly 3 specific meal or food suggestions. For each suggestion:
1. Name the food/meal concisely
2. Give approximate calories and protein
3. One sentence on why it fits the remaining budget

Keep the Norse/warrior theme in tone. Be practical and specific. Respond in JSON format:
{"suggestions": [{"name": "...", "calories": 0, "protein": 0, "reason": "..."}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }

  const aiData = await res.json();
  const text = aiData.content?.[0]?.text ?? "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? "{}");
    return NextResponse.json({
      suggestions: parsed.suggestions ?? [],
      remaining,
    });
  } catch {
    return NextResponse.json({ suggestions: [], remaining, rawText: text });
  }
}
