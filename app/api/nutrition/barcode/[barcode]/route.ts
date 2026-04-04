import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapOffProduct, countNonNullFields } from "@/lib/nutrition";

/**
 * GET /api/nutrition/barcode/[barcode]
 * Looks up a food item by barcode using Open Food Facts.
 * Results cached in food_cache. Ready for mobile barcode scanner integration.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { barcode } = await params;

  if (!barcode || !/^\d{8,14}$/.test(barcode)) {
    return NextResponse.json({ error: "Invalid barcode format" }, { status: 400 });
  }

  // Check cache first
  const { data: cached } = await supabase
    .from("food_cache")
    .select("*")
    .eq("barcode", barcode)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) return NextResponse.json({ food: cached, fromCache: true });

  // Fetch from Open Food Facts
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=code,product_name,brands,serving_quantity,serving_quantity_unit,nutriments,nutriscore_grade,allergens_tags,image_url,image_front_url`,
    { headers: { "User-Agent": "Ragnarok-Nutrition/1.0 (hello@soncar.co.uk)" } }
  );

  if (!res.ok) return NextResponse.json({ food: null }, { status: 404 });

  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    return NextResponse.json({ food: null }, { status: 404 });
  }

  const mapped = mapOffProduct(data.product);

  // Cache the result
  const { data: saved, error } = await supabase
    .from("food_cache")
    .insert({
      barcode,
      name: mapped.name,
      brand: mapped.brand ?? null,
      source: mapped.source,
      serving_size: mapped.serving_size,
      serving_unit: mapped.serving_unit,
      nutrient_data: mapped.nutrient_data,
      nutri_score: mapped.nutri_score ?? null,
      allergens: mapped.allergens ?? [],
      image_url: mapped.image_url ?? null,
      non_null_fields: countNonNullFields(mapped.nutrient_data),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ food: { ...mapped, id: "uncached" }, fromCache: false });

  return NextResponse.json({ food: saved, fromCache: false });
}
