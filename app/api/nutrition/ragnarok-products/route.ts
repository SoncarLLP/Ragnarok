import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/nutrition/ragnarok-products
 * Returns all Ragnarök product nutrition profiles (for supplement search results)
 *
 * PUT /api/nutrition/ragnarok-products/[slug] — super_admin only, updates a profile
 * Body: { nutrient_data, serving_size, serving_unit, allergens, nutri_score }
 */

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await supabase
    .from("ragnarok_nutrition_profiles")
    .select("*")
    .order("product_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // super_admin only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { product_slug, product_name, nutrient_data, serving_size, serving_unit, allergens, nutri_score } = body;

  if (!product_slug || !product_name || !nutrient_data) {
    return NextResponse.json({ error: "product_slug, product_name, and nutrient_data required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ragnarok_nutrition_profiles")
    .upsert({
      product_slug,
      product_name,
      nutrient_data,
      serving_size: serving_size ?? 100,
      serving_unit: serving_unit ?? "ml",
      allergens: allergens ?? [],
      nutri_score: nutri_score ?? null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: "product_slug" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
