import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapOffProduct, mapUsdaFood, countNonNullFields, type FoodItem } from "@/lib/nutrition";

const OFF_BASE = "https://world.openfoodfacts.org/api/v2";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_KEY = process.env.USDA_API_KEY ?? "DEMO_KEY";

// ── Synonym map — UK terminology first ──────────────────────
// Maps a query term to additional terms to also search for
const SYNONYMS: Record<string, string[]> = {
  courgette:        ["zucchini"],
  zucchini:         ["courgette"],
  aubergine:        ["eggplant"],
  eggplant:         ["aubergine"],
  mince:            ["minced beef", "ground beef", "beef mince"],
  "ground beef":    ["mince", "minced beef", "beef mince"],
  "minced beef":    ["mince", "ground beef", "beef mince"],
  chips:            ["french fries", "fries"],
  crisps:           ["chips", "potato chips"],
  prawn:            ["shrimp"],
  shrimp:           ["prawn"],
  rocket:           ["arugula"],
  arugula:          ["rocket"],
  coriander:        ["cilantro"],
  cilantro:         ["coriander"],
  "spring onion":   ["scallion", "green onion"],
  scallion:         ["spring onion", "green onion"],
  swede:            ["rutabaga"],
  rutabaga:         ["swede"],
  courgetti:        ["courgette", "zucchini noodles"],
  "tinned tuna":    ["canned tuna", "tuna in water", "tuna in brine"],
  "canned tuna":    ["tinned tuna"],
  marmite:          ["yeast extract"],
  "porridge oats":  ["rolled oats", "oatmeal", "oats"],
  "jacket potato":  ["baked potato", "white potato baked"],
  "sweet potato":   ["yam"],
  "chicken breast": ["breast of chicken"],
  "breast of chicken": ["chicken breast"],
};

/** Expand a query term with UK synonyms */
function expandQuery(q: string): string[] {
  const lower = q.toLowerCase().trim();
  const extras = SYNONYMS[lower] ?? [];
  return [lower, ...extras];
}

/** Escape special regex characters */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score how relevant a food item name is to the search query.
 * Higher = more relevant. Used to sort results.
 */
function scoreRelevance(
  name: string,
  brand: string | undefined,
  source: string,
  isVerified: boolean,
  isUk: boolean,
  nonNullFields: number,
  query: string,
): number {
  const nameLower = name.toLowerCase();
  const q = query.toLowerCase().trim();
  let score = 0;

  // ── Name match scoring ──
  if (nameLower === q) {
    score += 100;
  } else if (nameLower.startsWith(q + " ") || nameLower.startsWith(q + ",") || nameLower.startsWith(q + "(")) {
    score += 50;
  } else {
    // Whole-word boundary match
    const wordBoundary = new RegExp(`(^|[\\s,(])${escapeRegex(q)}([\\s,)]|$)`, "i");
    if (wordBoundary.test(nameLower)) {
      score += 25;
    } else if (nameLower.includes(q)) {
      score += 10;
    }
  }

  // ── Source/verification bonuses ──
  if (isVerified) score += 80;          // Curated UK library always near top
  if (isUk) score += 30;               // UK products over global
  if (source === "open_food_facts") score += 10;  // OFN over USDA by default

  // ── Generic food bonus (no brand) ──
  const hasBrand = !!(brand && brand.trim().length > 0);
  if (!hasBrand) score += 20;

  // ── Short name bonus ──
  if (name.length <= 30) score += 15;

  // ── Data completeness ──
  if (nonNullFields >= 4) score += 10;

  // ── Branded product penalties ──
  if (hasBrand && source === "usda") score -= 15;  // US branded foods — least relevant
  if (hasBrand) score -= 5;

  // ── Long name penalty ──
  if (name.length > q.length + 25) score -= 20;

  return score;
}

/**
 * GET /api/nutrition/search?q=chicken+breast&limit=20&most_common=true
 *
 * Result order:
 *   1. Verified UK Foods (uk_food_library)
 *   2. Open Food Facts UK results
 *   3. Open Food Facts Global (fallback)
 *   4. USDA Foundation / SR Legacy
 *   5. USDA Branded (only if nothing else matches)
 *
 * Returns `suggestions` array when 0 results found.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 40);
  const mostCommon = searchParams.get("most_common") === "true";

  // Most Common mode — return user's frequently logged foods
  if (mostCommon) {
    const { data: commonFoods } = await supabase
      .from("nutrition_logs")
      .select("food_name, food_brand, nutrient_data")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(100);

    if (commonFoods && commonFoods.length > 0) {
      // Count frequency
      const freq: Record<string, { count: number; item: typeof commonFoods[0] }> = {};
      for (const row of commonFoods) {
        const key = `${row.food_name}|${row.food_brand ?? ""}`;
        if (!freq[key]) freq[key] = { count: 0, item: row };
        freq[key].count++;
      }
      const topFoods = Object.values(freq)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(({ item }, i) => ({
          id: `common_${i}`,
          name: item.food_name,
          brand: item.food_brand ?? undefined,
          source: "custom" as const,
          serving_size: 100,
          serving_unit: "g",
          nutrient_data: item.nutrient_data ?? {},
          group: "most_common" as const,
          is_verified: false,
          is_uk: false,
          non_null_fields: countNonNullFields(item.nutrient_data ?? {}),
        }));
      return NextResponse.json({ results: topFoods, fromCache: false, mostCommon: true });
    }
    return NextResponse.json({ results: [], fromCache: false, mostCommon: true });
  }

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], fromCache: false });
  }

  const expandedTerms = expandQuery(q);

  // ── 1. Search UK food library (Supabase) ──────────────────
  const ukLibraryItems = await searchUkLibrary(supabase, expandedTerms, q);

  // ── 2. Check food_cache ────────────────────────────────────
  const { data: cached } = await supabase
    .from("food_cache")
    .select("*")
    .textSearch("name", q, { type: "plain" })
    .gt("expires_at", new Date().toISOString())
    .limit(limit);

  const cachedItems: Omit<FoodItem, "id">[] = (cached ?? []).map(
    (c: Record<string, unknown>) => ({
      name: c.name as string,
      brand: (c.brand as string | undefined) ?? undefined,
      source: (c.source as FoodItem["source"]) ?? "open_food_facts",
      serving_size: (c.serving_size as number) ?? 100,
      serving_unit: (c.serving_unit as string) ?? "g",
      nutrient_data: (c.nutrient_data as Record<string, number>) ?? {},
      nutri_score: (c.nutri_score as string | null) ?? null,
      allergens: (c.allergens as string[]) ?? [],
      image_url: (c.image_url as string | null) ?? null,
      non_null_fields: (c.non_null_fields as number) ?? 0,
      is_uk: (c.is_uk as boolean) ?? (c.source === "open_food_facts"),
      is_verified: false,
    }),
  );

  // Skip external API calls if UK library + cache is already sufficient
  const alreadyHave = ukLibraryItems.length + cachedItems.length;
  let offUkItems: Omit<FoodItem, "id">[] = [];
  let offGlobalItems: Omit<FoodItem, "id">[] = [];
  let usdaItems: Omit<FoodItem, "id">[] = [];

  if (alreadyHave < limit) {
    // ── 3. Fetch Open Food Facts (UK first, global fallback) ──
    const [offUkResult, usdaResult] = await Promise.allSettled([
      fetchOpenFoodFactsUk(q, limit),
      fetchUsdaNonBranded(q, limit),
    ]);
    offUkItems = offUkResult.status === "fulfilled" ? offUkResult.value : [];
    usdaItems = usdaResult.status === "fulfilled" ? usdaResult.value : [];

    // Global OFN fallback if UK results are sparse
    if (offUkItems.length < 5) {
      const offGlobalResult = await fetchOpenFoodFactsGlobal(q, limit);
      offGlobalItems = offGlobalResult.map(item => ({ ...item, is_uk: false }));
    }
  }

  // ── 4. Merge & score all results ──────────────────────────
  // Priority: uk_library > OFN UK > OFN Global > USDA non-branded > USDA branded > cache
  const allItems: Omit<FoodItem, "id">[] = [
    ...ukLibraryItems,
    ...offUkItems,
    ...offGlobalItems,
    ...usdaItems,
    ...cachedItems.filter(c =>
      !ukLibraryItems.some(u => u.name.toLowerCase() === c.name.toLowerCase()),
    ),
  ];

  // Deduplicate by name+brand, keeping highest non_null_fields
  const deduped = deduplicateResults(allItems);

  // Apply relevance scores
  const scored = deduped.map(item => ({
    ...item,
    relevance_score: scoreRelevance(
      item.name,
      item.brand,
      item.source,
      item.is_verified ?? false,
      item.is_uk ?? false,
      item.non_null_fields ?? 0,
      q,
    ),
  }));

  // Sort by relevance score descending
  scored.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));

  // Assign display groups
  const grouped = scored.map(item => ({
    ...item,
    group: resolveGroup(item),
  }));

  const finalResults = grouped.slice(0, limit);

  // ── 5. Cache new external results ─────────────────────────
  const toCache = [...offUkItems, ...offGlobalItems, ...usdaItems].map(item => ({
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
    is_uk: item.is_uk ?? false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));
  if (toCache.length > 0) {
    await supabase.from("food_cache").upsert(toCache, { ignoreDuplicates: true });
  }

  // ── 6. Did you mean suggestions (when 0 results) ──────────
  let suggestions: string[] = [];
  if (finalResults.length === 0) {
    suggestions = await buildSuggestions(supabase, q);
  }

  // Assign stable IDs for the frontend
  const resultsWithIds = finalResults.map((item, i) => ({
    ...item,
    id: `result_${i}_${item.source}`,
  }));

  return NextResponse.json({
    results: resultsWithIds,
    fromCache: false,
    suggestions,
  });
}

// ── UK Food Library search ────────────────────────────────────

async function searchUkLibrary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  terms: string[],
  originalQuery: string,
): Promise<Omit<FoodItem, "id">[]> {
  // Build OR conditions for name ILIKE across all synonym terms
  const likeConditions = terms
    .map(t => `name.ilike.%${t}%,name_aliases.cs.{${t}}`)
    .join(",");

  const { data, error } = await supabase
    .from("uk_food_library")
    .select("*")
    .or(likeConditions)
    .eq("is_active", true)
    .limit(20);

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(row => ({
    name: row.name,
    brand: row.brand ?? undefined,
    source: "uk_verified" as const,
    serving_size: row.serving_size,
    serving_unit: row.serving_unit,
    nutrient_data: row.nutrient_data ?? {},
    nutri_score: null,
    allergens: row.allergens ?? [],
    image_url: null,
    non_null_fields: countNonNullFields(row.nutrient_data ?? {}),
    is_verified: true,
    is_uk: true,
    relevance_score: scoreRelevance(
      row.name, row.brand, "uk_verified", true, true,
      countNonNullFields(row.nutrient_data ?? {}),
      originalQuery,
    ),
  }));
}

// ── Open Food Facts (UK priority) ────────────────────────────

async function fetchOpenFoodFactsUk(query: string, limit: number): Promise<Omit<FoodItem, "id">[]> {
  const fields = [
    "code", "product_name", "product_name_en", "brands",
    "serving_quantity", "serving_quantity_unit",
    "nutriments", "nutriscore_grade", "allergens_tags",
    "image_url", "image_front_url", "countries_tags",
  ].join(",");

  // UK-targeted query
  const url = `${OFF_BASE}/search?search_terms=${encodeURIComponent(query)}&countries_tags=en:united-kingdom&fields=${fields}&page_size=${limit}&sort_by=popularity_key&json=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Ragnarok-Nutrition/1.0 (hello@soncar.co.uk)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.products ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({ ...mapOffProduct(p), is_uk: true, is_verified: false }))
    .filter((p: Omit<FoodItem, "id">) => p.name !== "Unknown" && p.name.trim() !== "");
}

async function fetchOpenFoodFactsGlobal(query: string, limit: number): Promise<Omit<FoodItem, "id">[]> {
  const fields = [
    "code", "product_name", "product_name_en", "brands",
    "serving_quantity", "serving_quantity_unit",
    "nutriments", "nutriscore_grade", "allergens_tags",
    "image_url", "image_front_url",
  ].join(",");

  const url = `${OFF_BASE}/search?search_terms=${encodeURIComponent(query)}&fields=${fields}&page_size=${limit}&sort_by=popularity_key&json=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Ragnarok-Nutrition/1.0 (hello@soncar.co.uk)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.products ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({ ...mapOffProduct(p), is_uk: false, is_verified: false }))
    .filter((p: Omit<FoodItem, "id">) => p.name !== "Unknown" && p.name.trim() !== "");
}

// ── USDA (Foundation + SR Legacy preferred, then Branded) ────

async function fetchUsdaNonBranded(query: string, limit: number): Promise<Omit<FoodItem, "id">[]> {
  // Fetch Foundation and SR Legacy first (generic whole foods)
  const primaryUrl = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${limit}&api_key=${USDA_KEY}&dataType=Foundation,SR%20Legacy`;
  const primaryRes = await fetch(primaryUrl, { next: { revalidate: 0 } });

  let primary: Omit<FoodItem, "id">[] = [];
  if (primaryRes.ok) {
    const data = await primaryRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primary = (data.foods ?? []).map((f: any) => ({
      ...mapUsdaFood(f),
      is_uk: false,
      is_verified: false,
    })).filter((f: Omit<FoodItem, "id">) => f.name !== "Unknown");
  }

  // Only fetch Branded USDA if we have very few generic results
  if (primary.length < 5) {
    const brandedUrl = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${limit}&api_key=${USDA_KEY}&dataType=Branded`;
    const brandedRes = await fetch(brandedUrl, { next: { revalidate: 0 } });
    if (brandedRes.ok) {
      const data = await brandedRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const branded = (data.foods ?? []).map((f: any) => ({
        ...mapUsdaFood(f),
        is_uk: false,
        is_verified: false,
      })).filter((f: Omit<FoodItem, "id">) => f.name !== "Unknown");
      return [...primary, ...branded];
    }
  }

  return primary;
}

// ── Helpers ───────────────────────────────────────────────────

function deduplicateResults(items: Omit<FoodItem, "id">[]): Omit<FoodItem, "id">[] {
  const map = new Map<string, Omit<FoodItem, "id">>();
  for (const item of items) {
    const key = `${item.name.toLowerCase().trim()}|${(item.brand ?? "").toLowerCase().trim()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      // Keep whichever has more complete data, but prefer verified/UK sources
      const existingScore = (existing.is_verified ? 100 : 0) + (existing.non_null_fields ?? 0);
      const newScore = (item.is_verified ? 100 : 0) + (item.non_null_fields ?? 0);
      if (newScore > existingScore) map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function resolveGroup(item: Omit<FoodItem, "id"> & { relevance_score?: number }): FoodItem["group"] {
  if (item.is_verified) return "uk_verified";
  if (item.source === "open_food_facts" && item.is_uk) return "open_food_facts_uk";
  if (item.source === "open_food_facts") return "open_food_facts_global";
  return "usda";
}

async function buildSuggestions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  query: string,
): Promise<string[]> {
  // Try to suggest items from uk_food_library with partial match
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return [];

  const suggestions: string[] = [];
  for (const word of words.slice(0, 3)) {
    const { data } = await supabase
      .from("uk_food_library")
      .select("name")
      .ilike("name", `%${word}%`)
      .eq("is_active", true)
      .limit(3);
    if (data) suggestions.push(...(data as { name: string }[]).map(r => r.name));
  }

  // Also check synonyms
  const lowerQuery = query.toLowerCase().trim();
  const synonymExpansions = SYNONYMS[lowerQuery] ?? [];
  suggestions.push(...synonymExpansions);

  // Deduplicate and limit
  return [...new Set(suggestions)].slice(0, 5);
}
