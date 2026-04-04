"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { MEAL_CATEGORIES, sumNutrients, macroPercent, type NutritionLog, type MealCategory } from "@/lib/nutrition";
import WaterTracker from "@/components/nutrition/WaterTracker";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";
import { addPendingWaterLog, getPendingWaterLogs } from "@/lib/offline/db";
import { syncAllPending } from "@/lib/offline/sync";

// Haptic feedback helper
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export default function DiaryPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<{ id: string; amount_ml: number }[]>([]);
  const [totalWater, setTotalWater] = useState(0);
  const [goals, setGoals] = useState<{ calories: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ name: string; calories: number; protein: number; reason: string }[]>([]);
  const [suggestRemaining, setSuggestRemaining] = useState<{ calories: number; protein: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingWaterMl, setPendingWaterMl] = useState(0); // offline water pending

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isToday = date === new Date().toISOString().split("T")[0];
  const canGoForward = date < new Date().toISOString().split("T")[0];
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const canGoBack = date > cutoff;

  // Track online/offline state
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = async () => {
      setIsOffline(false);
      const userId = localStorage.getItem("ragnarok_user_id");
      if (userId) {
        await syncAllPending(userId).catch(() => {});
      }
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const loadDiary = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const [diaryRes, goalsRes] = await Promise.all([
        fetch(`/api/nutrition/diary?date=${d}`),
        fetch("/api/nutrition/goals"),
      ]);
      const diaryData = await diaryRes.json();
      const goalsData = await goalsRes.json();
      setLogs(diaryData.logs ?? []);
      setWaterLogs(diaryData.water_logs ?? []);
      setTotalWater(diaryData.total_water_ml ?? 0);
      setGoals(goalsData);

      // Add offline pending water to total for today
      if (d === new Date().toISOString().split("T")[0]) {
        try {
          const userId = localStorage.getItem("ragnarok_user_id") ?? "";
          const pending = await getPendingWaterLogs(userId);
          const todayPending = pending
            .filter((l) => l.loggedDate === d && l.syncStatus === "pending")
            .reduce((sum, l) => sum + l.amountMl, 0);
          setPendingWaterMl(todayPending);
        } catch {
          setPendingWaterMl(0);
        }
      } else {
        setPendingWaterMl(0);
      }
    } catch {
      // Network error while offline — show cached state
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDiary(date); }, [date, loadDiary]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split("T")[0];
    if (delta > 0 && !canGoForward) return;
    if (delta < 0 && !canGoBack) return;
    vibrate(20);
    setDate(newDate);
  };

  // Swipe gesture handlers for date navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe (not vertical scroll)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && canGoForward) changeDate(1);  // swipe left = next day
      if (dx > 0 && canGoBack) changeDate(-1);    // swipe right = prev day
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/nutrition/diary?id=${id}`, { method: "DELETE" });
    setLogs(prev => prev.filter(l => l.id !== id));
    setDeletingId(null);
  };

  const addWater = async (amount: number) => {
    if (!navigator.onLine) {
      // Store offline
      try {
        const userId = localStorage.getItem("ragnarok_user_id") ?? "unknown";
        await addPendingWaterLog({ userId, amountMl: amount, loggedDate: date });
        setPendingWaterMl(prev => prev + amount);
        setTotalWater(prev => prev + amount);
        vibrate(30);
      } catch {
        // Silent fail
      }
      return;
    }

    await fetch("/api/nutrition/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_ml: amount }),
    });
    await loadDiary(date);
  };

  const getSuggestions = async () => {
    setSuggesting(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/nutrition/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setSuggestRemaining(data.remaining ?? null);
    } finally {
      setSuggesting(false);
    }
  };

  const totalNutrients = sumNutrients(logs.map(l => l.nutrient_data));
  const calorieTarget  = goals?.calories ?? 2000;
  const proteinTarget  = goals?.protein_g ?? 150;
  const carbsTarget    = goals?.carbs_g ?? 250;
  const fatTarget      = goals?.fat_g ?? 65;
  const waterTarget    = goals?.water_ml ?? 2000;

  const dateLabel = isToday ? "Today" :
    new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div
      className="space-y-5"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Offline badge */}
      {isOffline && (
        <div
          className="rounded-lg px-3 py-2 flex items-center gap-2 text-sm"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}
        >
          <span>⚡</span>
          <span>Offline mode · Water and food logging still works. Changes sync when you reconnect.</span>
        </div>
      )}

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => changeDate(-1)}
          disabled={!canGoBack}
          className="px-3 py-2 rounded-lg text-sm font-medium transition"
          style={{
            background: "var(--nrs-panel)",
            color: canGoBack ? "var(--nrs-text)" : "var(--nrs-text-muted)",
            border: "1px solid var(--nrs-border)",
            opacity: canGoBack ? 1 : 0.4,
            minHeight: "44px",
            minWidth: "70px",
          }}
        >
          ← Prev
        </button>
        <div className="text-center">
          <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>{dateLabel}</div>
          <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{date}</div>
          {(canGoBack || canGoForward) && (
            <div className="text-[10px] mt-0.5" style={{ color: "var(--nrs-text-muted)", opacity: 0.5 }}>
              swipe to navigate
            </div>
          )}
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={!canGoForward}
          className="px-3 py-2 rounded-lg text-sm font-medium transition"
          style={{
            background: "var(--nrs-panel)",
            color: canGoForward ? "var(--nrs-text)" : "var(--nrs-text-muted)",
            border: "1px solid var(--nrs-border)",
            opacity: canGoForward ? 1 : 0.4,
            minHeight: "44px",
            minWidth: "70px",
          }}
        >
          Next →
        </button>
      </div>

      {/* Daily summary */}
      <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>
              {Math.round(totalNutrients.calories ?? 0)} kcal
            </div>
            <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              / {calorieTarget} target · {Math.max(0, calorieTarget - Math.round(totalNutrients.calories ?? 0))} remaining
            </div>
          </div>
          <Link
            href={`/nutrition/search?date=${date}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)", minHeight: "44px", display: "flex", alignItems: "center" }}
          >
            + Add Food
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Protein", val: totalNutrients.protein ?? 0, target: proteinTarget,  unit: "g", color: "#60a5fa" },
            { label: "Carbs",   val: totalNutrients.carbs ?? 0,   target: carbsTarget,    unit: "g", color: "#fbbf24" },
            { label: "Fat",     val: totalNutrients.fat ?? 0,     target: fatTarget,       unit: "g", color: "#f97316" },
          ].map(({ label, val, target, unit, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--nrs-text-muted)" }}>{label}</span>
                <span style={{ color: "var(--nrs-text)" }}>{Math.round(val)}{unit}</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: "var(--nrs-panel)" }}>
                <div className="h-1.5 rounded-full" style={{ width: `${macroPercent(val, target)}%`, background: color }} />
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                / {target}{unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Water tracker */}
      <WaterTracker
        totalMl={totalWater}
        targetMl={waterTarget}
        date={date}
        onAdd={addWater}
      />
      {pendingWaterMl > 0 && (
        <div className="text-xs text-center" style={{ color: "var(--nrs-text-muted)" }}>
          ⏳ +{pendingWaterMl}ml water pending offline sync
        </div>
      )}

      {/* AI Suggestions (today only, online only) */}
      {isToday && !isOffline && (
        <div className="rounded-xl p-4" style={{ border: "1px dashed var(--nrs-border)", background: "var(--nrs-bg-2)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>🤖</span>
              <span className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>AI Meal Suggestions</span>
            </div>
            <button
              onClick={getSuggestions}
              disabled={suggesting}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)", minHeight: "36px" }}
            >
              {suggesting ? "Thinking..." : "Get Suggestions"}
            </button>
          </div>
          {suggestRemaining && (
            <p className="text-xs mb-3" style={{ color: "var(--nrs-text-muted)" }}>
              You have {suggestRemaining.calories} kcal and {suggestRemaining.protein}g protein remaining today.
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{s.name}</span>
                    <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                      ~{s.calories}kcal · {s.protein}g protein
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>{s.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meal sections */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden animate-pulse"
              style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)", height: "80px" }}
            />
          ))}
        </div>
      ) : (
        MEAL_CATEGORIES.map((cat) => {
          const catLogs = logs.filter(l => l.meal_category === cat.key);
          const catCals = Math.round(catLogs.reduce((s, l) => s + (l.nutrient_data.calories ?? 0), 0));
          const catProtein = Math.round(catLogs.reduce((s, l) => s + (l.nutrient_data.protein ?? 0), 0));

          return (
            <div key={cat.key} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--nrs-border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>{cat.label}</span>
                  {catLogs.length > 0 && (
                    <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                      {catCals} kcal · {catProtein}g protein
                    </span>
                  )}
                </div>
                <Link
                  href={`/nutrition/search?date=${date}&category=${cat.key}`}
                  className="text-xs px-3 py-1 rounded-lg transition"
                  style={{
                    background: "var(--nrs-panel)",
                    color: "var(--nrs-accent)",
                    border: "1px solid var(--nrs-accent-border)",
                    minHeight: "32px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  + Add
                </Link>
              </div>
              {catLogs.length === 0 ? (
                <div className="px-4 py-3 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
                  Nothing logged yet
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--nrs-border-subtle)" }}>
                  {catLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--nrs-text)" }}>
                          {log.food_name}
                          {log.ragnarok_product_id && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}>
                              ✓ Ragnarök
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                          {log.serving_quantity} {log.serving_unit}
                          {log.food_brand && ` · ${log.food_brand}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
                            {Math.round(log.nutrient_data.calories ?? 0)} kcal
                          </div>
                          <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                            P: {Math.round(log.nutrient_data.protein ?? 0)}g
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id}
                          className="text-xs px-2 py-1 rounded transition"
                          style={{ color: "#f87171", background: "transparent", minHeight: "44px", minWidth: "36px" }}
                          aria-label="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
