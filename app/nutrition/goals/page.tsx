"use client";

import { useState, useEffect } from "react";
import { CLASS_MACRO_SPLITS, ALLERGENS, DIETARY_PREFERENCES, type GoalType, type Allergen, type DietaryPreference } from "@/lib/nutrition";

const ACTIVITY_OPTIONS = [
  { key: "sedentary",   label: "Sedentary",    desc: "Little to no exercise" },
  { key: "light",       label: "Light",        desc: "1–3 days/week" },
  { key: "moderate",    label: "Moderate",     desc: "3–5 days/week" },
  { key: "active",      label: "Active",       desc: "6–7 days/week" },
  { key: "very_active", label: "Very Active",  desc: "Twice a day" },
];

const GOAL_OPTIONS: { key: GoalType; label: string; desc: string }[] = [
  { key: "lose_weight",        label: "Lose Weight",        desc: "Calorie deficit (~20%)" },
  { key: "maintain",           label: "Maintain",           desc: "Match TDEE" },
  { key: "gain_muscle",        label: "Gain Muscle",        desc: "Slight surplus (~10%)" },
  { key: "improve_performance",label: "Improve Performance",desc: "Optimise for training" },
];

const FITNESS_CLASSES = [
  "warrior","ranger","mage","rogue","paladin","druid","berserker","monk","shaman","viking"
];

export default function GoalsPage() {
  const [tab, setTab] = useState<"manual" | "calculator" | "allergens">("manual");
  const [goals, setGoals] = useState({ calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, fibre_g: 30, water_ml: 2000, goal_type: "maintain" as GoalType, class_split: "" });
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [dietPrefs, setDietPrefs] = useState<DietaryPreference[]>([]);
  const [calc, setCalc] = useState({ age: "", gender: "male", heightCm: "", weightKg: "", activityLevel: "moderate", goal: "maintain" as GoalType, classSlug: "" });
  const [calcResult, setCalcResult] = useState<{ bmr: number; tdee: number; recommended: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number; water_ml: number } } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/nutrition/goals").then(r => r.json()),
      fetch("/api/nutrition/allergens").then(r => r.json()),
    ]).then(([g, a]) => {
      setGoals({ calories: g.calories, protein_g: g.protein_g, carbs_g: g.carbs_g, fat_g: g.fat_g, fibre_g: g.fibre_g ?? 30, water_ml: g.water_ml, goal_type: g.goal_type ?? "maintain", class_split: g.class_split ?? "" });
      setAllergens(a.allergens ?? []);
      setDietPrefs(a.dietary_preferences ?? []);
    });
  }, []);

  const applyClassSplit = (slug: string) => {
    const split = CLASS_MACRO_SPLITS[slug];
    if (!split) return;
    const cal = goals.calories;
    setGoals(g => ({
      ...g,
      class_split: slug,
      protein_g: Math.round((cal * split.protein / 100) / 4),
      carbs_g:   Math.round((cal * split.carbs / 100) / 4),
      fat_g:     Math.round((cal * split.fat / 100) / 9),
    }));
  };

  const runCalculator = async () => {
    const res = await fetch("/api/nutrition/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age: parseInt(calc.age), gender: calc.gender, heightCm: parseFloat(calc.heightCm),
        weightKg: parseFloat(calc.weightKg), activityLevel: calc.activityLevel,
        goal: calc.goal, classSlug: calc.classSlug || undefined,
      }),
    });
    const data = await res.json();
    setCalcResult(data);
  };

  const applyCalcResult = () => {
    if (!calcResult) return;
    setGoals(g => ({ ...g, ...calcResult.recommended, goal_type: calc.goal }));
    setTab("manual");
  };

  const saveGoals = async () => {
    setSaving(true);
    await Promise.all([
      fetch("/api/nutrition/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      }),
      fetch("/api/nutrition/allergens", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergens, dietary_preferences: dietPrefs }),
      }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleAllergen = (a: Allergen) => setAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const toggleDietPref = (p: DietaryPreference) => setDietPrefs(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const inputStyle = { background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--nrs-text)" }}>Nutrition Goals</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>Set your daily targets and dietary preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--nrs-panel)" }}>
        {[
          { key: "manual" as const,     label: "Set Goals" },
          { key: "calculator" as const, label: "Smart Calculator" },
          { key: "allergens" as const,  label: "Allergens & Diet" },
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

      {/* Manual goals */}
      {tab === "manual" && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Goal Type</label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setGoals(g => ({ ...g, goal_type: opt.key }))}
                  className="p-3 rounded-lg text-left transition"
                  style={{
                    border: `1px solid ${goals.goal_type === opt.key ? "var(--nrs-accent-border)" : "var(--nrs-border)"}`,
                    background: goals.goal_type === opt.key ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                  }}
                >
                  <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{opt.label}</div>
                  <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {[
            { key: "calories", label: "Daily Calories", unit: "kcal", min: 500, max: 10000 },
            { key: "protein_g", label: "Protein", unit: "g", min: 0, max: 500 },
            { key: "carbs_g", label: "Carbohydrates", unit: "g", min: 0, max: 1000 },
            { key: "fat_g", label: "Fat", unit: "g", min: 0, max: 300 },
            { key: "fibre_g", label: "Fibre", unit: "g", min: 0, max: 100 },
            { key: "water_ml", label: "Water", unit: "ml", min: 500, max: 10000 },
          ].map(({ key, label, unit, min, max }) => (
            <div key={key}>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>
                {label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={(goals as unknown as Record<string, number>)[key]}
                  onChange={e => setGoals(g => ({ ...g, [key]: parseInt(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
                <span className="text-sm w-8" style={{ color: "var(--nrs-text-muted)" }}>{unit}</span>
              </div>
            </div>
          ))}

          {/* Class macro split */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "var(--nrs-text-muted)" }}>
              RPG Class Macro Split
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FITNESS_CLASSES.map(slug => {
                const split = CLASS_MACRO_SPLITS[slug];
                return (
                  <button
                    key={slug}
                    onClick={() => applyClassSplit(slug)}
                    className="p-2 rounded-lg text-left transition"
                    style={{
                      border: `1px solid ${goals.class_split === slug ? "var(--nrs-accent-border)" : "var(--nrs-border)"}`,
                      background: goals.class_split === slug ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                    }}
                  >
                    <div className="text-xs font-medium capitalize" style={{ color: "var(--nrs-text)" }}>{slug}</div>
                    <div className="text-[10px]" style={{ color: "var(--nrs-text-muted)" }}>
                      P:{split.protein}% C:{split.carbs}% F:{split.fat}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Calculator tab */}
      {tab === "calculator" && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
            Uses the Mifflin-St Jeor formula to calculate your BMR and TDEE.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Age</label>
              <input type="number" min={16} max={100} value={calc.age} onChange={e => setCalc(c => ({ ...c, age: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Gender</label>
              <select value={calc.gender} onChange={e => setCalc(c => ({ ...c, gender: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Height (cm)</label>
              <input type="number" min={100} max={250} value={calc.heightCm} onChange={e => setCalc(c => ({ ...c, heightCm: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Weight (kg)</label>
              <input type="number" min={30} max={300} value={calc.weightKg} onChange={e => setCalc(c => ({ ...c, weightKg: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Activity Level</label>
            {ACTIVITY_OPTIONS.map(a => (
              <button key={a.key} onClick={() => setCalc(c => ({ ...c, activityLevel: a.key }))}
                className="w-full flex justify-between p-2 rounded-lg mb-1 transition text-left"
                style={{ border: `1px solid ${calc.activityLevel === a.key ? "var(--nrs-accent-border)" : "var(--nrs-border)"}`, background: calc.activityLevel === a.key ? "var(--nrs-accent-dim)" : "transparent" }}>
                <span className="text-sm" style={{ color: "var(--nrs-text)" }}>{a.label}</span>
                <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{a.desc}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>Goal</label>
            <select value={calc.goal} onChange={e => setCalc(c => ({ ...c, goal: e.target.value as GoalType }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              {GOAL_OPTIONS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--nrs-text-muted)" }}>RPG Class (optional)</label>
            <select value={calc.classSlug} onChange={e => setCalc(c => ({ ...c, classSlug: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              <option value="">No class / generic</option>
              {FITNESS_CLASSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <button onClick={runCalculator} className="w-full py-2.5 rounded-lg font-semibold text-sm" style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}>
            Calculate
          </button>

          {calcResult && (
            <div className="p-4 rounded-lg" style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)" }}>
              <div className="text-sm font-medium mb-2" style={{ color: "var(--nrs-text)" }}>Your Results</div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div><span style={{ color: "var(--nrs-text-muted)" }}>BMR: </span><strong style={{ color: "var(--nrs-text)" }}>{calcResult.bmr} kcal</strong></div>
                <div><span style={{ color: "var(--nrs-text-muted)" }}>TDEE: </span><strong style={{ color: "var(--nrs-text)" }}>{calcResult.tdee} kcal</strong></div>
              </div>
              <div className="text-xs mb-3" style={{ color: "var(--nrs-text-muted)" }}>
                Recommended: {calcResult.recommended.calories}kcal · {calcResult.recommended.protein_g}g P · {calcResult.recommended.carbs_g}g C · {calcResult.recommended.fat_g}g F
              </div>
              <button onClick={applyCalcResult} className="w-full py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}>
                Apply These Goals
              </button>
            </div>
          )}
        </div>
      )}

      {/* Allergens tab */}
      {tab === "allergens" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
            <h3 className="font-medium mb-3 text-sm" style={{ color: "var(--nrs-text)" }}>Allergens</h3>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map(a => (
                <button
                  key={a}
                  onClick={() => toggleAllergen(a)}
                  className="px-3 py-1.5 rounded-full text-sm transition capitalize"
                  style={{
                    background: allergens.includes(a) ? "#fee2e2" : "var(--nrs-panel)",
                    color: allergens.includes(a) ? "#dc2626" : "var(--nrs-text-muted)",
                    border: `1px solid ${allergens.includes(a) ? "#fca5a5" : "var(--nrs-border)"}`,
                    fontWeight: allergens.includes(a) ? 600 : 400,
                  }}
                >
                  {allergens.includes(a) ? "✗ " : "+ "}{a}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
            <h3 className="font-medium mb-3 text-sm" style={{ color: "var(--nrs-text)" }}>Dietary Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {DIETARY_PREFERENCES.map(p => (
                <button
                  key={p}
                  onClick={() => toggleDietPref(p)}
                  className="px-3 py-1.5 rounded-full text-sm transition"
                  style={{
                    background: dietPrefs.includes(p) ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                    color: dietPrefs.includes(p) ? "var(--nrs-accent)" : "var(--nrs-text-muted)",
                    border: `1px solid ${dietPrefs.includes(p) ? "var(--nrs-accent-border)" : "var(--nrs-border)"}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={saveGoals}
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-sm transition"
        style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
      >
        {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Goals & Preferences"}
      </button>
    </div>
  );
}
