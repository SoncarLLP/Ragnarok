"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";
import FoodSourceBadge from "@/components/nutrition/FoodSourceBadge";
import AllergenBadge from "@/components/nutrition/AllergenBadge";
import { scaleNutrients, MEAL_CATEGORIES, type FoodItem, type MealCategory } from "@/lib/nutrition";

interface LogForm {
  meal_category: MealCategory;
  serving_quantity: number;
  serving_unit: string;
}

// ── Group display config ───────────────────────────────────────
const GROUP_CONFIG: Record<string, { label: string; color: string }> = {
  uk_verified:           { label: "✅ Verified UK Foods",      color: "#16a34a" },
  ragnarok:              { label: "✓ Ragnarök Products",       color: "var(--nrs-accent)" },
  open_food_facts_uk:    { label: "Open Food Facts — UK",      color: "#e37b00" },
  open_food_facts_global:{ label: "Open Food Facts — Global",  color: "#c96a00" },
  usda:                  { label: "USDA Database",             color: "#1e4d8c" },
  most_common:           { label: "Your Most Logged Foods",    color: "var(--nrs-text-muted)" },
};

// Preferred display order for groups
const GROUP_ORDER = [
  "uk_verified",
  "ragnarok",
  "open_food_facts_uk",
  "open_food_facts_global",
  "usda",
  "most_common",
] as const;

type GroupKey = (typeof GROUP_ORDER)[number];

function groupResults(results: FoodItem[]): Record<GroupKey, FoodItem[]> {
  const grouped: Record<GroupKey, FoodItem[]> = {
    uk_verified: [],
    ragnarok: [],
    open_food_facts_uk: [],
    open_food_facts_global: [],
    usda: [],
    most_common: [],
  };
  for (const item of results) {
    const g = (item.source === "ragnarok" ? "ragnarok" : item.group ?? "usda") as GroupKey;
    if (g in grouped) grouped[g].push(item);
    else grouped.usda.push(item);
  }
  return grouped;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ   = searchParams.get("q") ?? "";
  const initialCat = (searchParams.get("category") ?? "breakfast") as MealCategory;
  const logDate    = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ragnarokProducts, setRagnarokProducts] = useState<(FoodItem & { product_slug: string })[]>([]);
  const [memberAllergens, setMemberAllergens] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostCommonMode, setMostCommonMode] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [logForm, setLogForm] = useState<LogForm>({ meal_category: initialCat, serving_quantity: 1, serving_unit: "serving" });
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Ragnarök products and allergens
  useEffect(() => {
    Promise.all([
      fetch("/api/nutrition/ragnarok-products").then(r => r.json()),
      fetch("/api/nutrition/allergens").then(r => r.json()),
    ]).then(([rpData, allergenData]) => {
      const rp = (rpData.products ?? []).map((p: { product_slug: string; product_name: string; nutrient_data: Record<string, number>; serving_size: number; serving_unit: string; allergens?: string[]; nutri_score?: string }) => ({
        id: `ragnarok_${p.product_slug}`,
        name: p.product_name,
        brand: "Ragnarök",
        source: "ragnarok" as const,
        serving_size: p.serving_size,
        serving_unit: p.serving_unit,
        nutrient_data: p.nutrient_data,
        allergens: p.allergens ?? [],
        nutri_score: p.nutri_score ?? null,
        product_slug: p.product_slug,
        group: "ragnarok" as const,
        is_verified: false,
        is_uk: true,
      }));
      setRagnarokProducts(rp);
      setMemberAllergens(allergenData.allergens ?? []);
    });
  }, []);

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = async (q: string) => {
    if (!q || q.length < 2) { setResults([]); setSuggestions([]); return; }
    setLoading(true);
    setMostCommonMode(false);
    try {
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}&limit=30`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSuggestions(data.suggestions ?? []);
    } finally {
      setLoading(false);
    }
  };

  const doMostCommon = async () => {
    setLoading(true);
    setMostCommonMode(true);
    setQuery("");
    setSuggestions([]);
    try {
      const res = await fetch("/api/nutrition/search?most_common=true&limit=20");
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setMostCommonMode(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const selectFood = (food: FoodItem) => {
    setSelected(food);
    setLogForm({ meal_category: initialCat, serving_quantity: 1, serving_unit: food.serving_unit });
    setLogSuccess(false);
  };

  const computedNutrients = selected
    ? scaleNutrients(selected.nutrient_data, selected.serving_size, logForm.serving_quantity * selected.serving_size)
    : {};

  const handleLog = async () => {
    if (!selected || logging) return;
    setLogging(true);
    try {
      const isRagnarok = selected.source === "ragnarok";
      const body = {
        food_cache_id: isRagnarok ? null : selected.id,
        ragnarok_product_id: isRagnarok ? (selected as FoodItem & { product_slug?: string }).id?.replace("ragnarok_", "") : null,
        meal_category: logForm.meal_category,
        serving_quantity: logForm.serving_quantity,
        serving_unit: logForm.serving_unit,
        serving_grams: logForm.serving_quantity * selected.serving_size,
        nutrient_data: computedNutrients,
        food_name: selected.name,
        food_brand: selected.brand ?? null,
        logged_date: logDate,
      };

      const res = await fetch("/api/nutrition/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setLogSuccess(true);
        setTimeout(() => router.push("/nutrition/diary"), 1200);
      }
    } finally {
      setLogging(false);
    }
  };

  // Filter Ragnarök products by search query
  const filteredRagnarok = ragnarokProducts.filter(p =>
    !query || p.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Group all non-ragnarok results
  const grouped = groupResults(results);

  // Build the ordered list of sections to display
  const hasAnyResults = results.length > 0 || filteredRagnarok.length > 0;

  return (
    <div className="space-y-5">
      {/* Search bar + Most Common toggle */}
      <div className="space-y-2">
        <input
          type="search"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Search for a food, brand, or product..."
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{
            background: "var(--nrs-panel)",
            color: "var(--nrs-text)",
            border: "1px solid var(--nrs-border)",
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            Searches verified UK foods, Open Food Facts and USDA databases
          </p>
          <button
            onClick={doMostCommon}
            className="text-xs px-3 py-1 rounded-lg transition"
            style={{
              background: mostCommonMode ? "var(--nrs-accent)" : "var(--nrs-panel)",
              color: mostCommonMode ? "var(--nrs-bg)" : "var(--nrs-text-muted)",
              border: "1px solid var(--nrs-border)",
            }}
          >
            Most Common
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Results panel */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-6 text-sm" style={{ color: "var(--nrs-text-muted)" }}>Searching...</div>
          ) : mostCommonMode ? (
            /* Most Common mode — flat list */
            <>
              {results.length > 0 ? (
                <div>
                  <GroupHeader label={GROUP_CONFIG.most_common.label} color={GROUP_CONFIG.most_common.color} />
                  {results.map((food, i) => (
                    <FoodResultCard
                      key={food.id ?? i}
                      food={food}
                      memberAllergens={memberAllergens}
                      isSelected={selected?.id === food.id}
                      onClick={() => selectFood(food)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
                  No logged foods yet — start tracking to see your most common foods here.
                </div>
              )}
            </>
          ) : hasAnyResults ? (
            /* Normal search results — grouped */
            <>
              {/* Ragnarök products first */}
              {filteredRagnarok.length > 0 && (
                <div>
                  <GroupHeader label={GROUP_CONFIG.ragnarok.label} color={GROUP_CONFIG.ragnarok.color} />
                  {filteredRagnarok.map(food => (
                    <FoodResultCard
                      key={food.id}
                      food={food}
                      memberAllergens={memberAllergens}
                      isSelected={selected?.id === food.id}
                      onClick={() => selectFood(food)}
                    />
                  ))}
                </div>
              )}

              {/* Grouped database results */}
              {GROUP_ORDER.filter(g => g !== "ragnarok" && g !== "most_common").map(group => {
                const items = grouped[group];
                if (!items || items.length === 0) return null;
                const config = GROUP_CONFIG[group];
                return (
                  <div key={group}>
                    <GroupHeader label={config.label} color={config.color} />
                    {items.map((food, i) => (
                      <FoodResultCard
                        key={food.id ?? `${group}_${i}`}
                        food={food}
                        memberAllergens={memberAllergens}
                        isSelected={selected?.id === food.id}
                        onClick={() => selectFood(food)}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          ) : query.length >= 2 ? (
            /* No results state */
            <div className="text-center py-6">
              <div className="text-sm mb-2" style={{ color: "var(--nrs-text-muted)" }}>
                No results found for &quot;{query}&quot;
              </div>
              {suggestions.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>Did you mean:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => { setQuery(s); doSearch(s); }}
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ background: "var(--nrs-panel)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <a
                href="/nutrition/search?submit_custom=true"
                className="text-sm mt-3 inline-block"
                style={{ color: "var(--nrs-accent)" }}
              >
                Submit a custom food →
              </a>
            </div>
          ) : (
            /* Empty state */
            <div className="text-center py-8 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              Start typing to search the food database
            </div>
          )}
        </div>

        {/* Log panel */}
        <div>
          {selected ? (
            <div className="rounded-xl p-5 sticky top-4" style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--nrs-text)" }}>{selected.name}</h3>
                  {selected.brand && <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{selected.brand}</div>}
                  <div className="flex items-center gap-2 mt-1">
                    <FoodSourceBadge source={selected.source} isVerified={selected.is_verified} />
                    {selected.nutri_score && <NutriScoreBadge score={selected.nutri_score} size="sm" />}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>✕</button>
              </div>

              {/* Serving selector */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Servings</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={logForm.serving_quantity}
                    onChange={e => setLogForm(f => ({ ...f, serving_quantity: parseFloat(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}
                  />
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                    1 serving = {selected.serving_size}{selected.serving_unit}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Meal</label>
                  <select
                    value={logForm.meal_category}
                    onChange={e => setLogForm(f => ({ ...f, meal_category: e.target.value as MealCategory }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}
                  >
                    {MEAL_CATEGORIES.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nutrient preview */}
              <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-lg" style={{ background: "var(--nrs-panel)" }}>
                {[
                  ["Calories", Math.round((computedNutrients as Record<string, number>).calories ?? 0), "kcal"],
                  ["Protein",  Math.round((computedNutrients as Record<string, number>).protein  ?? 0), "g"],
                  ["Carbs",    Math.round((computedNutrients as Record<string, number>).carbs    ?? 0), "g"],
                  ["Fat",      Math.round((computedNutrients as Record<string, number>).fat      ?? 0), "g"],
                ].map(([label, val, unit]) => (
                  <div key={label as string} className="text-center">
                    <div className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>{val}{unit}</div>
                    <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Allergen warning */}
              <AllergenBadge allergens={selected.allergens ?? []} memberAllergens={memberAllergens} className="mb-3" />

              {logSuccess ? (
                <div className="text-center py-3 rounded-lg text-sm font-semibold" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399" }}>
                  ✓ Logged! Redirecting to diary...
                </div>
              ) : (
                <button
                  onClick={handleLog}
                  disabled={logging}
                  className="w-full py-3 rounded-lg font-semibold text-sm transition"
                  style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
                >
                  {logging ? "Logging..." : `Add to ${MEAL_CATEGORIES.find(c => c.key === logForm.meal_category)?.label}`}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ border: "1px dashed var(--nrs-border)", background: "var(--nrs-card)" }}>
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
                Select a food to log it
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function GroupHeader({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="text-xs font-semibold uppercase tracking-wide mb-1.5 px-1"
      style={{ color }}
    >
      {label}
    </div>
  );
}

function FoodResultCard({
  food, memberAllergens, isSelected, onClick,
}: { food: FoodItem; memberAllergens: string[]; isSelected: boolean; onClick: () => void }) {
  const hasAllergenConflict = (food.allergens ?? []).some(a =>
    memberAllergens.some(ma => a.toLowerCase().includes(ma.toLowerCase()) || ma.toLowerCase().includes(a.toLowerCase())),
  );

  const n = food.nutrient_data;
  const cal  = n.calories != null ? Math.round(n.calories) : null;
  const prot = n.protein  != null ? Math.round(n.protein)  : null;
  const carb = n.carbs    != null ? Math.round(n.carbs)    : null;
  const fat  = n.fat      != null ? Math.round(n.fat)      : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg mb-1.5 transition"
      style={{
        background: isSelected ? "var(--nrs-accent-dim)" : "var(--nrs-card)",
        border: `1px solid ${isSelected ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
            {hasAllergenConflict && <span className="text-red-400 mr-1">⚠️</span>}
            {food.name}
          </div>
          {food.brand && (
            <div className="text-xs truncate" style={{ color: "var(--nrs-text-muted)" }}>{food.brand}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <FoodSourceBadge source={food.source} isVerified={food.is_verified} />
            {food.nutri_score && <NutriScoreBadge score={food.nutri_score} size="sm" />}
          </div>
          {/* Macros preview row */}
          {(cal != null || prot != null || carb != null || fat != null) && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: "var(--nrs-text-muted)" }}>
              {cal  != null && <span><span style={{ color: "var(--nrs-text)" }} className="font-medium">{cal}</span> kcal</span>}
              {prot != null && <span>·  <span style={{ color: "var(--nrs-text)" }} className="font-medium">{prot}g</span> P</span>}
              {carb != null && <span>·  <span style={{ color: "var(--nrs-text)" }} className="font-medium">{carb}g</span> C</span>}
              {fat  != null && <span>·  <span style={{ color: "var(--nrs-text)" }} className="font-medium">{fat}g</span> F</span>}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            per {food.serving_size}{food.serving_unit}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
