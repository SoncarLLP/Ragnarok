import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateBMR, calculateTDEE, calculateRecommendedGoals, type ActivityLevel, type Gender, type WeightGoal } from "@/lib/nutrition";

/**
 * GET /api/nutrition/goals — Returns current user's nutrition goals
 * PUT /api/nutrition/goals — Upserts nutrition goals
 * POST /api/nutrition/goals/calculate — Calculates recommended goals from biometrics
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return defaults if no goals set
  if (!data) {
    return NextResponse.json({
      calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, fibre_g: 30,
      water_ml: 2000, custom_targets: {}, goal_type: "maintain", class_split: null,
    });
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    calories = 2000,
    protein_g = 150,
    carbs_g = 250,
    fat_g = 65,
    fibre_g = 30,
    water_ml = 2000,
    custom_targets = {},
    goal_type = "maintain",
    class_split,
  } = body;

  const { data, error } = await supabase
    .from("nutrition_goals")
    .upsert({
      user_id: user.id,
      calories: Math.max(500, Math.min(10000, calories)),
      protein_g: Math.max(0, Math.min(500, protein_g)),
      carbs_g: Math.max(0, Math.min(1000, carbs_g)),
      fat_g: Math.max(0, Math.min(300, fat_g)),
      fibre_g: Math.max(0, Math.min(200, fibre_g)),
      water_ml: Math.max(500, Math.min(10000, water_ml)),
      custom_targets,
      goal_type,
      class_split: class_split ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { age, gender, heightCm, weightKg, activityLevel, goal, classSlug } = body;

  if (!age || !gender || !heightCm || !weightKg || !activityLevel || !goal) {
    return NextResponse.json({ error: "age, gender, heightCm, weightKg, activityLevel, goal required" }, { status: 400 });
  }

  const bmr = calculateBMR(weightKg, heightCm, age, gender as Gender);
  const tdee = calculateTDEE(bmr, activityLevel as ActivityLevel);
  const recommended = calculateRecommendedGoals(tdee, weightKg, goal as WeightGoal, classSlug);

  return NextResponse.json({ bmr, tdee, recommended });
}
