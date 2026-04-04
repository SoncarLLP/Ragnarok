"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function getWeekDates(weekStart: Date): string[] {
  return DAYS.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export default function MealPlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [planData, setPlanData] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);

  const weekDates = getWeekDates(weekStart);
  const planName = `Week of ${weekDates[0]}`;

  useEffect(() => {
    fetch(`/api/nutrition/planner?week=${weekDates[0]}`)
      .then(r => r.json())
      .then(d => {
        const plan = d.plans?.[0];
        if (plan) setPlanData(plan.plan_data ?? {});
        else setPlanData({});
      });
    fetch("/api/nutrition/planner?templates=true")
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []));
  }, [weekDates[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSlot = (date: string, slot: string, value: string) => {
    setPlanData(prev => ({
      ...prev,
      [date]: { ...(prev[date] ?? {}), [slot]: value },
    }));
  };

  const savePlan = async () => {
    setSaving(true);
    await fetch("/api/nutrition/planner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: planName, plan_data: planData }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const generateShoppingList = () => {
    const items: string[] = [];
    for (const date of weekDates) {
      const day = planData[date] ?? {};
      for (const slot of MEAL_SLOTS) {
        if (day[slot]) items.push(`${day[slot]} (${date})`);
      }
    }
    const text = items.length > 0 ? items.join("\n") : "No meals planned yet";
    navigator.clipboard.writeText(text).catch(() => null);
    alert("Shopping list copied to clipboard!");
  };

  const changeWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--nrs-text)" }}>Meal Planner</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>Plan your weekly meals</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateShoppingList}
            className="px-3 py-2 rounded-lg text-sm transition"
            style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}
          >
            🛒 Shopping List
          </button>
          <button
            onClick={savePlan}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
          >
            {saved ? "✓ Saved" : saving ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeWeek(-1)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}>
          ← Prev Week
        </button>
        <span className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
          {new Date(weekDates[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
          {new Date(weekDates[6]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <button onClick={() => changeWeek(1)} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}>
          Next Week →
        </button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          <span className="text-xs self-center shrink-0" style={{ color: "var(--nrs-text-muted)" }}>Templates:</span>
          {templates.map(t => (
            <button key={t.id} className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition"
              style={{ background: "var(--nrs-panel)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Weekly grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const date = weekDates[i];
            const isToday = date === new Date().toISOString().split("T")[0];
            return (
              <div key={day} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isToday ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`, background: "var(--nrs-card)" }}>
                <div
                  className="px-2 py-2 text-center text-xs font-semibold"
                  style={{
                    background: isToday ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                    color: isToday ? "var(--nrs-accent)" : "var(--nrs-text-muted)",
                  }}
                >
                  <div>{day.slice(0, 3)}</div>
                  <div>{new Date(date).getDate()}</div>
                </div>
                <div className="p-1.5 space-y-1">
                  {MEAL_SLOTS.map(slot => (
                    <div key={slot}>
                      <div className="text-[9px] mb-0.5 px-1" style={{ color: "var(--nrs-text-muted)" }}>{slot}</div>
                      <textarea
                        value={planData[date]?.[slot] ?? ""}
                        onChange={e => updateSlot(date, slot, e.target.value)}
                        placeholder="Add meal..."
                        rows={2}
                        className="w-full text-[10px] px-1.5 py-1 rounded resize-none"
                        style={{ background: "var(--nrs-panel)", color: "var(--nrs-text)", border: "1px solid var(--nrs-border)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center">
        <Link href="/nutrition/diary" className="text-sm" style={{ color: "var(--nrs-accent)" }}>
          → Log today&apos;s meals to your diary
        </Link>
      </div>
    </div>
  );
}
