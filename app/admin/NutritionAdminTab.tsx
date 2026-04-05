"use client";

import { useState, useEffect } from "react";

interface PendingFood {
  id: string;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  nutrient_data: Record<string, number>;
  label_photo_url: string | null;
  submitted_by: string;
  created_at: string;
  profiles: { full_name: string | null; username: string | null } | null;
}

interface NutritionFlag {
  id: string;
  user_id: string;
  flag_type: string;
  details: Record<string, unknown>;
  flagged_at: string;
  reviewed_at: string | null;
}

interface RagnarokProfile {
  product_slug: string;
  product_name: string;
  serving_size: number;
  serving_unit: string;
  nutrient_data: Record<string, number>;
  nutri_score: string | null;
  updated_at: string;
}

export default function NutritionAdminTab() {
  const [section, setSection] = useState<"overview" | "foods" | "flags" | "products">("overview");
  const [pendingFoods, setPendingFoods] = useState<PendingFood[]>([]);
  const [flags, setFlags] = useState<NutritionFlag[]>([]);
  const [products, setProducts] = useState<RagnarokProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [editingProduct, setEditingProduct] = useState<RagnarokProfile | null>(null);
  const [productForm, setProductForm] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/nutrition/custom-foods?admin_review=true").then(r => r.json()),
      fetch("/api/nutrition/ragnarok-products").then(r => r.json()),
    ]).then(([foods, rp]) => {
      setPendingFoods(foods.foods ?? []);
      setProducts(rp.products ?? []);
      setLoading(false);
    });
  }, []);

  const reviewFood = async (id: string, status: "approved" | "rejected") => {
    await fetch("/api/nutrition/custom-foods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, review_notes: reviewNotes[id] ?? null }),
    });
    setPendingFoods(prev => prev.filter(f => f.id !== id));
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    await fetch("/api/nutrition/ragnarok-products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_slug: editingProduct.product_slug,
        product_name: editingProduct.product_name,
        serving_size: editingProduct.serving_size,
        serving_unit: editingProduct.serving_unit,
        nutri_score: editingProduct.nutri_score,
        nutrient_data: { ...editingProduct.nutrient_data, ...productForm },
      }),
    });
    const res = await fetch("/api/nutrition/ragnarok-products").then(r => r.json());
    setProducts(res.products ?? []);
    setEditingProduct(null);
    setProductForm({});
  };

  const startEditProduct = (p: RagnarokProfile) => {
    setEditingProduct(p);
    setProductForm(p.nutrient_data);
  };

  const SECTIONS = [
    { key: "overview" as const,  label: "Overview" },
    { key: "foods" as const,     label: `Food Submissions (${pendingFoods.length})` },
    { key: "flags" as const,     label: `Abuse Flags (${flags.length})` },
    { key: "products" as const,  label: "Ragnarök Products" },
  ];

  const inputStyle = { background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" };

  return (
    <div className="space-y-5">
      {/* Section tabs */}
      <div className="admin-tab-bar flex gap-2">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{
              background: section === s.key ? "var(--nrs-accent)" : "var(--nrs-panel)",
              color: section === s.key ? "var(--nrs-bg)" : "var(--nrs-text-muted)",
              border: "1px solid var(--nrs-border)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>Loading...</div>}

      {/* Overview */}
      {section === "overview" && (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Pending Food Submissions", value: pendingFoods.length, emoji: "🍽️" },
            { label: "Ragnarök Products", value: products.length, emoji: "🌿" },
            { label: "Nutrition Abuse Flags", value: flags.length, emoji: "⚠️" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
              <div className="text-2xl mb-1">{stat.emoji}</div>
              <div className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>{stat.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pending food submissions */}
      {section === "foods" && (
        <div className="space-y-4">
          <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Pending Custom Food Submissions</h2>
          {pendingFoods.length === 0 ? (
            <div className="text-sm py-4" style={{ color: "var(--nrs-text-muted)" }}>No pending submissions.</div>
          ) : pendingFoods.map(food => (
            <div key={food.id} className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>{food.name}</div>
                  {food.brand && <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>{food.brand}</div>}
                  <div className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
                    {food.serving_size}{food.serving_unit} · Submitted by {(food.profiles as { full_name: string | null; username: string | null } | null)?.full_name ?? "Unknown"}
                  </div>
                </div>
                {food.label_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={food.label_photo_url} alt="Label" className="w-16 h-16 object-cover rounded" />
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                {["calories", "protein", "carbs", "fat"].map(key => (
                  <div key={key} className="p-2 rounded text-center" style={{ background: "var(--nrs-panel)" }}>
                    <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>{food.nutrient_data[key] ?? "—"}</div>
                    <div style={{ color: "var(--nrs-text-muted)" }}>{key}</div>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Review notes (required if rejecting)"
                  value={reviewNotes[food.id] ?? ""}
                  onChange={e => setReviewNotes(prev => ({ ...prev, [food.id]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => reviewFood(food.id, "approved")}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "#16a34a", color: "#fff" }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => reviewFood(food.id, "rejected")}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "#dc2626", color: "#fff" }}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ragnarök product nutrition profiles */}
      {section === "products" && (
        <div className="space-y-4">
          <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Ragnarök Product Nutrition Profiles</h2>
          <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
            Edit the nutritional profiles for Ragnarök products. These appear as verified supplements in the nutrition tracker.
          </p>

          {editingProduct ? (
            <div className="rounded-xl p-5 space-y-3" style={{ border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }}>
              <div className="flex justify-between">
                <h3 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Editing: {editingProduct.product_name}</h3>
                <button onClick={() => setEditingProduct(null)} style={{ color: "var(--nrs-text-muted)" }}>✕</button>
              </div>
              <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                Serving: {editingProduct.serving_size}{editingProduct.serving_unit} — values per serving
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["calories","protein","carbs","fat","fibre","sugar","sodium","vitamin_c","vitamin_b6","vitamin_b12"].map(key => (
                  <div key={key}>
                    <label className="text-xs block mb-1" style={{ color: "var(--nrs-text-muted)" }}>{key}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={productForm[key] ?? ""}
                      onChange={e => setProductForm(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveProduct}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
                >
                  Save Profile
                </button>
                <button
                  onClick={() => { setEditingProduct(null); setProductForm({}); }}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            products.map(p => (
              <div key={p.product_slug} className="rounded-xl p-4 flex items-start justify-between" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>{p.product_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                    {p.serving_size}{p.serving_unit} · {p.nutrient_data.calories ?? 0}kcal · {p.nutrient_data.protein ?? 0}g P
                    · Updated {new Date(p.updated_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <button
                  onClick={() => startEditProduct(p)}
                  className="px-3 py-1.5 rounded-lg text-sm transition"
                  style={{ background: "var(--nrs-panel)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Abuse flags */}
      {section === "flags" && (
        <div>
          <h2 className="font-semibold mb-3" style={{ color: "var(--nrs-text)" }}>Nutrition Abuse Flags</h2>
          {flags.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No nutrition abuse flags to review.</div>
          ) : flags.map(f => (
            <div key={f.id} className="rounded-xl p-4 mb-2" style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}>
              <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{f.flag_type}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                User: {f.user_id} · {new Date(f.flagged_at).toLocaleString("en-GB")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
