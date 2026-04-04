import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapOffProduct, mapUsdaFood, countNonNullFields, type FoodItem } from "@/lib/nutrition";

const OFF_BASE = "https://world.openfoodfacts.org/api/v2";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_KEY = process.env.USDA_API_KEY ?? "DEMO_KEY";

/**
 * GET /api/nutrition/search?q=chicken+breast&limit=10
 * Searches Open Food Facts + USDA simultaneously, returns best combined results.
 * Results are cached in food_cache table for 30 days.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 40);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], fromCache: false });
  }

  // 1. Check cache first (full-text search)
  const { data: cached } = await supabase
    .from("food_cache")
    .select("*")
    .textSearch("name", q, { type: "plain" })
    .gt("expires_at", new Date().toISOString())
    .limit(limit);

  if (cached && cached.length >= limit / 2) {
    return NextResponse.json({ results: cached, fromCache: true });
  }

  // 2. Fetch from both APIs in parallel
  const [offResults, usdaResults] = await Promise.allSettled([
    fetchOpenFoodFacts(q, limit),
    fetchUsda(q, limit),
  ]);

  const offItems: Omit<FoodItem, 'id'>[] = offResults.status === 'fulfilled' ? offResults.value : [];
  const usdaItems: Omit<FoodItem, 'id'>[] = usdaResults.status === 'fulfilled' ? usdaResults.value : [];

  // 3. Merge: prefer whichever source has more data for the same item (by name+brand)
  const merged = mergeResults(offItems, usdaItems, limit);

  // 4. Cache new results
  if (merged.length > 0) {
    const toCache = merged.map(item => ({
      name: item.name,
      brand: item.brand ?? null,
      source: item.source,
      serving_size: item.serving_size,
      serving_unit: item.serving_unit,
      nutrient_data: item.nutrient_data,
      nutri_score: item.nutri_score ?? null,
      allergens: item.allergens ?? [],
      image_url: item.image_url ?? null,
      non_null_fields: item.non_null_fields ?? countNonNullFields(item.nutrient_data),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    // Upsert by name+brand to avoid bloat (best effort)
    await supabase.from("food_cache").upsert(toCache, { ignoreDuplicates: true });
  }

  // 5. Combine with any existing cache hits
  const existingIds = new Set((cached ?? []).map((c: { name: string; brand?: string }) => `${c.name}|${c.brand}`));
  const newItems = merged.filter(m => !existingIds.has(`${m.name}|${m.brand ?? ''}`));
  const combined = [...(cached ?? []), ...newItems.map((m, i) => ({ ...m, id: `new_${i}` }))].slice(0, limit);

  return NextResponse.json({ results: combined, fromCache: false });
}

async function fetchOpenFoodFacts(query: string, limit: number): Promise<Omit<FoodItem, 'id'>[]> {
  const fields = [
    "code","product_name","product_name_en","brands","serving_quantity","serving_quantity_unit",
    "nutriments","nutriscore_grade","allergens_tags","image_url","image_front_url",
  ].join(",");

  const url = `${OFF_BASE}/search?search_terms=${encodeURIComponent(query)}&countries_tags=en:united-kingdom&fields=${fields}&page_size=${limit}&json=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Ragnarok-Nutrition/1.0 (hello@soncar.co.uk)" },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.products ?? []).map((p: any) => mapOffProduct(p)).filter((p: Omit<FoodItem, 'id'>) => p.name !== 'Unknown');
}

async function fetchUsda(query: string, limit: number): Promise<Omit<FoodItem, 'id'>[]> {
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${limit}&api_key=${USDA_KEY}&dataType=Branded,Foundation,SR%20Legacy`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.foods ?? []).map((f: any) => mapUsdaFood(f)).filter((f: Omit<FoodItem, 'id'>) => f.name !== 'Unknown');
}

function mergeResults(
  off: Omit<FoodItem, 'id'>[],
  usda: Omit<FoodItem, 'id'>[],
  limit: number
): Omit<FoodItem, 'id'>[] {
  // Build a map from normalised name to best item
  const map = new Map<string, Omit<FoodItem, 'id'>>();

  for (const item of [...off, ...usda]) {
    const key = `${item.name.toLowerCase().trim()}|${(item.brand ?? '').toLowerCase().trim()}`;
    const existing = map.get(key);
    if (!existing || (item.non_null_fields ?? 0) > (existing.non_null_fields ?? 0)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values()).slice(0, limit);
}
