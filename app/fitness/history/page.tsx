"use client";

import { useState, useEffect } from "react";
import WorkoutCard from "@/components/fitness/WorkoutCard";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "strength",     label: "Strength" },
  { value: "cardio",       label: "Cardio" },
  { value: "flexibility",  label: "Flexibility" },
  { value: "hiit",         label: "HIIT" },
  { value: "outdoor",      label: "Outdoor" },
  { value: "functional",   label: "Functional" },
  { value: "martial_arts", label: "Martial Arts" },
  { value: "recovery",     label: "Recovery" },
];

interface Workout {
  id: string;
  exercise_name: string;
  exercise_category: string;
  duration_minutes?: number;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  distance_km?: number;
  intensity: string;
  xp_earned: number;
  points_earned: number;
  workout_date: string;
  notes?: string;
}

export default function HistoryPage() {
  const [workouts, setWorkouts]   = useState<Workout[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState("");
  const [offset, setOffset]       = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (category) params.set("category", category);
    fetch(`/api/fitness/workouts?${params}`)
      .then((r) => r.json())
      .then((d) => { setWorkouts(d.workouts ?? []); setTotal(d.total ?? 0); setLoading(false); });
  }, [category, offset]);

  function changeCategory(cat: string) {
    setCategory(cat);
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Workout History</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
          {total.toLocaleString()} total workout{total !== 1 ? "s" : ""} logged
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => changeCategory(cat.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition"
            style={{
              border: `1px solid ${category === cat.value ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
              background: category === cat.value ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
              color: category === cat.value ? "var(--nrs-accent)" : "var(--nrs-text-muted)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>Loading...</div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>No workouts found.</div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              id={w.id}
              exerciseName={w.exercise_name}
              exerciseCategory={w.exercise_category}
              durationMinutes={w.duration_minutes}
              sets={w.sets}
              reps={w.reps}
              weightKg={w.weight_kg}
              distanceKm={w.distance_km}
              intensity={w.intensity}
              xpEarned={w.xp_earned}
              pointsEarned={w.points_earned}
              workoutDate={w.workout_date}
              notes={w.notes}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition"
            style={{ border: "1px solid var(--nrs-border)", color: "var(--nrs-text-muted)" }}
          >
            ← Previous
          </button>
          <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition"
            style={{ border: "1px solid var(--nrs-border)", color: "var(--nrs-text-muted)" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
