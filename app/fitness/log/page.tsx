"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addPendingWorkout } from "@/lib/offline/db";
import { syncAllPending } from "@/lib/offline/sync";

const CATEGORIES = [
  { value: "strength",    label: "Strength",     emoji: "🏋️" },
  { value: "cardio",      label: "Cardio",        emoji: "🏃" },
  { value: "flexibility", label: "Flexibility",   emoji: "🧘" },
  { value: "hiit",        label: "HIIT",          emoji: "⚡" },
  { value: "outdoor",     label: "Outdoor",       emoji: "🌿" },
  { value: "functional",  label: "Functional",    emoji: "🔥" },
  { value: "martial_arts",label: "Martial Arts",  emoji: "🥋" },
  { value: "recovery",    label: "Recovery",      emoji: "💆" },
];

const INTENSITY_OPTIONS = [
  { value: "light",    label: "Light",    color: "text-blue-400",   emoji: "😌" },
  { value: "moderate", label: "Moderate", color: "text-green-400",  emoji: "💪" },
  { value: "intense",  label: "Intense",  color: "text-amber-400",  emoji: "🔥" },
  { value: "maximum",  label: "Maximum",  color: "text-red-400",    emoji: "💀" },
];

// Haptic feedback helper
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export default function LogWorkoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<"category" | "exercise" | "details" | "done">("category");

  const [category, setCategory]     = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exercises, setExercises]   = useState<{ id: string; name: string; category: string }[]>([]);
  const [loadingEx, setLoadingEx]   = useState(false);

  const [duration, setDuration]     = useState<number>(30);
  const [intensity, setIntensity]   = useState("moderate");
  const [sets, setSets]             = useState<number | "">("");
  const [reps, setReps]             = useState<number | "">("");
  const [weight, setWeight]         = useState<number | "">("");
  const [distance, setDistance]     = useState<number | "">("");
  const [notes, setNotes]           = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline]   = useState(false);
  const [result, setResult]         = useState<{
    xpEarned: number; pointsEarned: number;
    leveledUp: boolean; newLevel?: number; levelsGained?: number;
    savedOffline?: boolean;
  } | null>(null);
  const [error, setError]           = useState("");

  const isStrength = ["strength", "functional"].includes(category);
  const isCardio   = ["cardio", "hiit", "outdoor"].includes(category);

  // Track online status
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Search exercises when category or search term changes
  useEffect(() => {
    if (!category || isOffline) return;
    setLoadingEx(true);
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ category, limit: "20" });
        if (exerciseSearch) params.set("q", exerciseSearch);
        const res = await fetch(`/api/fitness/exercises?${params}`);
        const data = await res.json();
        setExercises(data.exercises ?? []);
      } catch {
        // Network error — search unavailable offline
      } finally {
        setLoadingEx(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [category, exerciseSearch, isOffline]);

  async function handleSubmit() {
    if (!exerciseName || !category) return;
    setSubmitting(true);
    setError("");

    const workoutData = {
      exerciseName,
      exerciseCategory: category,
      durationMinutes: duration,
      intensity,
      sets: sets || undefined,
      reps: reps || undefined,
      weightKg: weight || undefined,
      distanceKm: distance || undefined,
      notes: notes || undefined,
      workoutDate: new Date().toISOString(),
    };

    // If offline, save to IndexedDB and show offline success
    if (isOffline || !navigator.onLine) {
      try {
        // Get userId from localStorage (set by ThemeProvider/auth flow)
        const userId = localStorage.getItem("ragnarok_user_id") ?? "unknown";
        await addPendingWorkout({ ...workoutData, userId });
        vibrate([50, 30, 50]); // Haptic pattern for offline save
        setResult({ xpEarned: 0, pointsEarned: 0, leveledUp: false, savedOffline: true });
        setStep("done");
      } catch {
        setError("Failed to save workout offline. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Online: submit to API
    try {
      const res = await fetch("/api/fitness/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...workoutData,
          dataSource: "web",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // API failed — fall back to offline storage
        try {
          const userId = localStorage.getItem("ragnarok_user_id") ?? "unknown";
          await addPendingWorkout({ ...workoutData, userId });
          vibrate([50, 30, 50]);
          setResult({ xpEarned: 0, pointsEarned: 0, leveledUp: false, savedOffline: true });
          setStep("done");
        } catch {
          setError(data.error ?? "Failed to log workout");
        }
        return;
      }

      vibrate([100, 50, 100]); // Haptic: success
      setResult(data);
      setStep("done");

      // Try to sync any other pending items in the background
      const userId = localStorage.getItem("ragnarok_user_id");
      if (userId) {
        syncAllPending(userId).catch(() => {});
      }
    } catch {
      // Network error — save offline
      try {
        const userId = localStorage.getItem("ragnarok_user_id") ?? "unknown";
        await addPendingWorkout({ ...workoutData, userId });
        vibrate([50, 30, 50]);
        setResult({ xpEarned: 0, pointsEarned: 0, leveledUp: false, savedOffline: true });
        setStep("done");
      } catch {
        setError("Failed to save workout. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="max-w-lg mx-auto">
        {result.savedOffline ? (
          <div
            className="rounded-2xl p-8 text-center space-y-4"
            style={{ border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)" }}
          >
            <div className="text-5xl">⚡</div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Saved Offline!</h2>
            <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              Your workout has been saved locally. XP and points will be awarded when you sync.
            </p>
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <div className="text-amber-400 font-medium mb-1">⏳ Pending Sync</div>
              <div style={{ color: "var(--nrs-text-muted)" }}>
                This workout will automatically sync to your profile when your connection is restored.
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setStep("category"); setExerciseName(""); setCategory(""); setResult(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: "1px solid var(--nrs-border)", color: "var(--nrs-text-muted)" }}
              >
                Log Another
              </button>
              <button
                onClick={() => router.push("/fitness")}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition"
                style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-8 text-center space-y-4"
            style={{ border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }}
          >
            <div className="text-5xl">🎉</div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Workout Logged!</h2>

            <div className="flex items-center justify-center gap-6">
              <div>
                <div className="text-3xl font-bold" style={{ color: "var(--nrs-accent)" }}>+{result.xpEarned}</div>
                <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>XP Earned</div>
              </div>
              {result.pointsEarned > 0 && (
                <div>
                  <div className="text-3xl font-bold text-amber-400">+{result.pointsEarned}</div>
                  <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>Loyalty Points</div>
                </div>
              )}
            </div>

            {result.leveledUp && (
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}
              >
                <div className="text-2xl mb-1">⭐</div>
                <div className="font-bold text-amber-400">Level Up!</div>
                <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
                  You reached Level {result.newLevel}!
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setStep("category"); setExerciseName(""); setCategory(""); setResult(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition"
                style={{ border: "1px solid var(--nrs-border)", color: "var(--nrs-text-muted)" }}
              >
                Log Another
              </button>
              <button
                onClick={() => router.push("/fitness")}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition"
                style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Log Workout</h1>
          {isOffline && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              ⚡ Offline
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
          Record your session to earn XP and loyalty points
          {isOffline && " · Will sync when you reconnect"}
        </p>
      </div>

      {/* Step 1: Category */}
      <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <h2 className="font-semibold mb-3" style={{ color: "var(--nrs-text)" }}>Exercise Type</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setExerciseName(""); setStep("exercise"); vibrate(30); }}
              className="flex flex-col items-center gap-1 p-3 rounded-lg transition border text-sm"
              style={{
                border: `1px solid ${category === cat.value ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                background: category === cat.value ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                color: "var(--nrs-text-body)",
                minHeight: "60px",
              }}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span className="text-xs">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Exercise Selection */}
      {category && (
        <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <h2 className="font-semibold mb-3" style={{ color: "var(--nrs-text)" }}>Exercise</h2>
          <input
            type="text"
            placeholder="Search exercises or type your own..."
            value={exerciseSearch || exerciseName}
            onChange={(e) => {
              setExerciseSearch(e.target.value);
              setExerciseName(e.target.value);
            }}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: "var(--nrs-panel)",
              border: "1px solid var(--nrs-border)",
              color: "var(--nrs-text)",
              fontSize: "16px", // Prevent iOS zoom on focus
            }}
          />
          {isOffline && (
            <p className="text-xs mt-2" style={{ color: "var(--nrs-text-muted)" }}>
              Exercise search unavailable offline — type your exercise name above.
            </p>
          )}
          {/* Exercise suggestions */}
          {loadingEx && (
            <div className="text-xs mt-2" style={{ color: "var(--nrs-text-muted)" }}>Searching...</div>
          )}
          {!loadingEx && exercises.length > 0 && !isOffline && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {exercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => { setExerciseName(ex.name); setExerciseSearch(""); setStep("details"); vibrate(30); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition hover:bg-white/5"
                  style={{ color: "var(--nrs-text-body)", minHeight: "44px" }}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          )}
          {exerciseName && (
            <button
              onClick={() => { setStep("details"); vibrate(30); }}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
            >
              Use &quot;{exerciseName}&quot; →
            </button>
          )}
        </div>
      )}

      {/* Step 3: Details */}
      {exerciseName && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>
            Session Details · <span style={{ color: "var(--nrs-accent)" }}>{exerciseName}</span>
          </h2>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--nrs-text-muted)" }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={480}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--nrs-panel)",
                border: "1px solid var(--nrs-border)",
                color: "var(--nrs-text)",
                fontSize: "16px",
              }}
            />
          </div>

          {/* Intensity */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--nrs-text-muted)" }}>Intensity</label>
            <div className="grid grid-cols-4 gap-2">
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setIntensity(opt.value); vibrate(20); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition"
                  style={{
                    border: `1px solid ${intensity === opt.value ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
                    background: intensity === opt.value ? "var(--nrs-accent-dim)" : "var(--nrs-panel)",
                    color: "var(--nrs-text-body)",
                    minHeight: "60px",
                  }}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Strength fields */}
          {isStrength && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Sets", value: sets, setter: setSets },
                { label: "Reps", value: reps, setter: setReps },
                { label: "Weight (kg)", value: weight, setter: setWeight },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--nrs-text-muted)" }}>{label}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={value}
                    onChange={(e) => setter(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--nrs-panel)",
                      border: "1px solid var(--nrs-border)",
                      color: "var(--nrs-text)",
                      fontSize: "16px",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Cardio fields */}
          {isCardio && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--nrs-text-muted)" }}>Distance (km)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={distance}
                onChange={(e) => setDistance(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--nrs-panel)",
                  border: "1px solid var(--nrs-border)",
                  color: "var(--nrs-text)",
                  fontSize: "16px",
                }}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--nrs-text-muted)" }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="How did it go?"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{
                background: "var(--nrs-panel)",
                border: "1px solid var(--nrs-border)",
                color: "var(--nrs-text)",
                fontSize: "16px",
              }}
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !exerciseName}
            className="w-full py-3 rounded-lg font-semibold text-sm transition disabled:opacity-50"
            style={{
              background: "var(--nrs-accent)",
              color: "var(--nrs-bg)",
              minHeight: "48px",
            }}
          >
            {submitting ? "Logging..." : isOffline ? "Save Offline ⚡" : "Log Workout ⚔️"}
          </button>
        </div>
      )}
    </div>
  );
}
