"use client";

import { useState, useEffect } from "react";

interface Measurement {
  id: string;
  weight_kg?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_arm_cm?: number;
  right_arm_cm?: number;
  body_fat_percentage?: number;
  energy_rating?: number;
  mood_rating?: number;
  sleep_hours?: number;
  water_litres?: number;
  notes?: string;
  measured_at: string;
}

function StatBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-20 shrink-0" style={{ color: "var(--nrs-text-muted)" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--nrs-panel)" }}>
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: "var(--nrs-accent)" }} />
      </div>
      <span className="text-xs w-6 text-right" style={{ color: "var(--nrs-text-muted)" }}>{value}</span>
    </div>
  );
}

export default function BodyTrackerPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [message, setMessage]           = useState("");

  // Form state
  const [weightKg, setWeightKg]       = useState<number | "">("");
  const [chestCm, setChestCm]         = useState<number | "">("");
  const [waistCm, setWaistCm]         = useState<number | "">("");
  const [hipsCm, setHipsCm]           = useState<number | "">("");
  const [leftArmCm, setLeftArmCm]     = useState<number | "">("");
  const [rightArmCm, setRightArmCm]   = useState<number | "">("");
  const [bodyFat, setBodyFat]         = useState<number | "">("");
  const [energy, setEnergy]           = useState<number>(3);
  const [mood, setMood]               = useState<number>(3);
  const [sleep, setSleep]             = useState<number | "">("");
  const [water, setWater]             = useState<number | "">("");
  const [notes, setNotes]             = useState("");

  useEffect(() => {
    fetch("/api/fitness/body")
      .then((r) => r.json())
      .then((d) => { setMeasurements(d.measurements ?? []); setLoading(false); });
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setMessage("");
    const res = await fetch("/api/fitness/body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weightKg: weightKg || undefined,
        chestCm: chestCm || undefined,
        waistCm: waistCm || undefined,
        hipsCm: hipsCm || undefined,
        leftArmCm: leftArmCm || undefined,
        rightArmCm: rightArmCm || undefined,
        bodyFatPercentage: bodyFat || undefined,
        energyRating: energy,
        moodRating: mood,
        sleepHours: sleep || undefined,
        waterLitres: water || undefined,
        notes: notes || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setMessage("Measurement logged successfully!");
      setShowForm(false);
      // Reload
      fetch("/api/fitness/body").then((r) => r.json()).then((d) => setMeasurements(d.measurements ?? []));
    } else {
      setMessage(data.error ?? "Failed to save");
    }
  }

  const latest = measurements[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Body Tracker</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>Track your physical progress over time</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
        >
          + Log Measurements
        </button>
      </div>

      {message && (
        <div className="rounded-lg px-4 py-3 text-sm text-emerald-400" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
          {message}
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>New Measurement</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Weight (kg)", value: weightKg, setter: setWeightKg, step: "0.1" },
              { label: "Body Fat %", value: bodyFat, setter: setBodyFat, step: "0.1" },
              { label: "Chest (cm)", value: chestCm, setter: setChestCm },
              { label: "Waist (cm)", value: waistCm, setter: setWaistCm },
              { label: "Hips (cm)", value: hipsCm, setter: setHipsCm },
              { label: "Left Arm (cm)", value: leftArmCm, setter: setLeftArmCm },
              { label: "Right Arm (cm)", value: rightArmCm, setter: setRightArmCm },
            ].map(({ label, value, setter, step }) => (
              <div key={label}>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>{label}</label>
                <input
                  type="number"
                  min={0}
                  step={step ?? "1"}
                  value={value}
                  onChange={(e) => setter(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Sleep (hours)</label>
              <input
                type="number" min={0} max={24} step="0.5" value={sleep}
                onChange={(e) => setSleep(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Water (litres)</label>
              <input
                type="number" min={0} max={20} step="0.1" value={water}
                onChange={(e) => setWater(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
              />
            </div>
          </div>

          {/* Energy & mood */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Energy", value: energy, setter: setEnergy },
              { label: "Mood", value: mood, setter: setMood },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-xs font-medium mb-2 block" style={{ color: "var(--nrs-text-muted)" }}>
                  {label}: {value}/5
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setter(n)}
                      className="text-xl transition"
                      style={{ opacity: n <= value ? 1 : 0.3 }}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
          >
            {submitting ? "Saving..." : "Save Measurement"}
          </button>
        </div>
      )}

      {/* Latest measurements */}
      {latest && (
        <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <h2 className="font-semibold mb-4" style={{ color: "var(--nrs-text)" }}>
            Latest · {new Date(latest.measured_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {latest.weight_kg && (
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--nrs-text-muted)" }}>Weight</div>
                <div className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>{latest.weight_kg} kg</div>
              </div>
            )}
            {latest.body_fat_percentage && (
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--nrs-text-muted)" }}>Body Fat</div>
                <div className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>{latest.body_fat_percentage}%</div>
              </div>
            )}
          </div>
          {(latest.energy_rating || latest.mood_rating) && (
            <div className="mt-4 space-y-2">
              {latest.energy_rating && <StatBar value={latest.energy_rating} max={5} label="Energy" />}
              {latest.mood_rating && <StatBar value={latest.mood_rating} max={5} label="Mood" />}
            </div>
          )}
          <div className="mt-3 flex gap-4 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            {latest.sleep_hours && <span>😴 {latest.sleep_hours}h sleep</span>}
            {latest.water_litres && <span>💧 {latest.water_litres}L water</span>}
          </div>
        </div>
      )}

      {/* History */}
      {!loading && measurements.length > 1 && (
        <div>
          <h2 className="font-semibold mb-3" style={{ color: "var(--nrs-text)" }}>History</h2>
          <div className="space-y-2">
            {measurements.slice(1).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
              >
                <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
                  {new Date(m.measured_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div className="flex gap-4 text-sm">
                  {m.weight_kg && <span style={{ color: "var(--nrs-text-body)" }}>{m.weight_kg} kg</span>}
                  {m.body_fat_percentage && <span style={{ color: "var(--nrs-text-muted)" }}>{m.body_fat_percentage}% BF</span>}
                  {m.energy_rating && <span>{"⭐".repeat(m.energy_rating)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && measurements.length === 0 && (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>
          No measurements logged yet. Track your first measurement above!
        </div>
      )}
    </div>
  );
}
