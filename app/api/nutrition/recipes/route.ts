import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sumNutrients, scaleNutrients, NUTRITION_POINTS } from "@/lib/nutrition";

/**
 * GET /api/nutrition/recipes?public=true|mine=true&limit=20&offset=0
 * POST /api/nutrition/recipes — Create a new recipe
 * PATCH /api/nutrition/recipes — Rate/comment on a public recipe
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const isPublic = searchParams.get("public") === "true";
  const mine = searchParams.get("mine") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("recipes")
      .select("*, recipe_ratings(rating, comment, created_at, profiles!user_id(full_name, username))")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  let query = supabase.from("recipes")
    .select("id,user_id,name,description,servings,photo_url,is_public,created_at,nutrient_data", { count: "exact" });

  if (isPublic) {
    query = query.eq("is_public", true);
  } else if (mine) {
    query = query.eq("user_id", user.id);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipes: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { name, description, servings = 1, ingredients, photo_url, is_public = false } = body;

  if (!name || !ingredients || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: "name and ingredients array required" }, { status: 400 });
  }

  // Compute total nutrients and divide by servings
  const allNutrients = ingredients.map((ing: { nutrient_data: Record<string, number>; serving_grams?: number; base_grams?: number }) => {
    if (ing.serving_grams && ing.base_grams && ing.base_grams > 0) {
      return scaleNutrients(ing.nutrient_data, ing.base_grams, ing.serving_grams);
    }
    return ing.nutrient_data;
  });

  const totalNutrients = sumNutrients(allNutrients);
  const perServingNutrients = scaleNutrients(totalNutrients, servings, 1);

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      name,
      description: description ?? null,
      servings,
      ingredients,
      nutrient_data: perServingNutrients,
      photo_url: photo_url ?? null,
      is_public,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, nutrient_data: perServingNutrients });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { recipe_id, rating, comment } = body;

  if (!recipe_id) return NextResponse.json({ error: "recipe_id required" }, { status: 400 });

  // Verify recipe is public
  const { data: recipe } = await supabase
    .from("recipes")
    .select("is_public, user_id")
    .eq("id", recipe_id)
    .single();

  if (!recipe?.is_public) {
    return NextResponse.json({ error: "Can only rate public recipes" }, { status: 400 });
  }

  const { error } = await supabase
    .from("recipe_ratings")
    .upsert({ recipe_id, user_id: user.id, rating, comment: comment ?? null }, { onConflict: "recipe_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if recipe author earns points (per 10 likes)
  const { count } = await supabase
    .from("recipe_ratings")
    .select("*", { count: "exact" })
    .eq("recipe_id", recipe_id);

  if (count && count % 10 === 0 && recipe.user_id) {
    await supabase.rpc("award_nutrition_points", {
      p_user_id: recipe.user_id,
      p_reward_type: `recipe_likes_${recipe_id}_${count}`,
      p_points: NUTRITION_POINTS.recipe_per_10_likes,
      p_date: new Date().toISOString().split("T")[0],
    });
  }

  return NextResponse.json({ success: true });
}
