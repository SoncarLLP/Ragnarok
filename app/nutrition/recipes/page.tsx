"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  is_public: boolean;
  photo_url: string | null;
  created_at: string;
  nutrient_data: { calories?: number; protein?: number; carbs?: number; fat?: number };
}

export default function RecipesPage() {
  const [tab, setTab] = useState<"mine" | "community">("mine");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = tab === "mine" ? "mine=true" : "public=true";
    fetch(`/api/nutrition/recipes?${params}`)
      .then(r => r.json())
      .then(d => { setRecipes(d.recipes ?? []); setLoading(false); });
  }, [tab]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--nrs-text)" }}>Recipes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>Build and share custom recipes</p>
        </div>
        <Link
          href="/nutrition/recipes/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
        >
          + New Recipe
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--nrs-panel)" }}>
        {[
          { key: "mine" as const,       label: "My Recipes" },
          { key: "community" as const,  label: "Community" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 text-sm font-medium rounded-md transition"
            style={{
              background: tab === t.key ? "var(--nrs-card)" : "transparent",
              color: tab === t.key ? "var(--nrs-text)" : "var(--nrs-text-muted)",
              border: tab === t.key ? "1px solid var(--nrs-border)" : "1px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm" style={{ color: "var(--nrs-text-muted)" }}>Loading...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ border: "1px dashed var(--nrs-border)", background: "var(--nrs-card)" }}>
          <div className="text-4xl mb-3">👨‍🍳</div>
          <div className="text-sm mb-4" style={{ color: "var(--nrs-text-muted)" }}>
            {tab === "mine" ? "No recipes yet — create your first!" : "No public recipes yet. Be the first to share!"}
          </div>
          <Link href="/nutrition/recipes/new" className="text-sm font-semibold" style={{ color: "var(--nrs-accent)" }}>
            Create Recipe →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
            >
              {recipe.photo_url && (
                <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${recipe.photo_url})` }} />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>{recipe.name}</h3>
                    {recipe.description && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--nrs-text-muted)" }}>{recipe.description}</p>
                    )}
                  </div>
                  {recipe.is_public && (
                    <span className="shrink-0 text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}>
                      Public
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                  <span>🍽️ {recipe.servings} servings</span>
                  <span>⚡ {Math.round(recipe.nutrient_data.calories ?? 0)} kcal</span>
                  <span>💪 {Math.round(recipe.nutrient_data.protein ?? 0)}g P</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link
                    href={`/nutrition/recipes/${recipe.id}`}
                    className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition"
                    style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}
                  >
                    View Recipe
                  </Link>
                  <Link
                    href={`/nutrition/search?recipe=${recipe.id}`}
                    className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition"
                    style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
                  >
                    Log to Diary
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
