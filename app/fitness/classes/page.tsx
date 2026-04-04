"use client";

import { useState, useEffect } from "react";
import ClassCard from "@/components/fitness/ClassCard";

interface FitnessClass {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  primary_exercises: string[];
  xp_bonus_multiplier: number;
  off_class_reduction: number;
  special_abilities: Record<string, unknown>;
  userProgress?: {
    current_level: number;
    current_xp: number;
    total_xp_earned: number;
    prestige_count: number;
  } | null;
}

interface FitnessProfile {
  active_class_id: string | null;
}

export default function ClassesPage() {
  const [classes, setClasses]           = useState<FitnessClass[]>([]);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [selecting, setSelecting]       = useState<string | null>(null);
  const [selected, setSelected]         = useState<string | null>(null);
  const [message, setMessage]           = useState("");

  useEffect(() => {
    async function load() {
      const [classRes, profileRes] = await Promise.all([
        fetch("/api/fitness/classes"),
        fetch("/api/fitness/profile"),
      ]);
      const classData   = await classRes.json();
      const profileData = await profileRes.json();
      setClasses(classData.classes ?? []);
      setFitnessProfile(profileData.fitnessProfile ?? null);
      setSelected(profileData.fitnessProfile?.active_class_id ?? null);
      setLoading(false);
    }
    load();
  }, []);

  async function selectClass(classId: string) {
    setSelecting(classId);
    setMessage("");
    const res = await fetch("/api/fitness/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    const data = await res.json();
    setSelecting(null);
    if (res.ok) {
      setSelected(classId);
      setMessage(`You are now a ${data.className}! Your journey begins.`);
    } else {
      setMessage(data.error ?? "Failed to select class");
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12" style={{ color: "var(--nrs-text-muted)" }}>
        Loading classes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Choose Your Class</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
          Your active class determines your XP bonuses. You can change class at any time —
          your progress in each class is saved separately.
        </p>
      </div>

      {message && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: message.includes("Failed") ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
            border: `1px solid ${message.includes("Failed") ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
            color: message.includes("Failed") ? "#f87171" : "#34d399",
          }}
        >
          {message}
        </div>
      )}

      {/* Class info */}
      <div
        className="rounded-lg px-4 py-3 text-sm"
        style={{ background: "var(--nrs-accent-dim)", border: "1px solid var(--nrs-accent-border)", color: "var(--nrs-text-muted)" }}
      >
        💡 Changing your active class doesn&apos;t reset your progress. All class levels are tracked independently.
        Paladin is the only class with no off-class penalty, making it ideal for mixed training.
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {classes.map((fc) => (
          <div key={fc.id}>
            <ClassCard
              fitnessClass={{
                id: fc.id,
                name: fc.name,
                slug: fc.slug,
                icon: fc.icon,
                description: fc.description,
                primaryExercises: fc.primary_exercises ?? [],
                xpBonusMultiplier: fc.xp_bonus_multiplier,
                offClassReduction: fc.off_class_reduction,
                specialAbilities: fc.special_abilities,
                displayOrder: 0,
              }}
              isActive={selected === fc.id}
              level={fc.userProgress?.current_level}
              prestigeCount={fc.userProgress?.prestige_count}
            />
            {selected !== fc.id && (
              <button
                onClick={() => selectClass(fc.id)}
                disabled={selecting !== null}
                className="w-full mt-2 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                style={{
                  border: "1px solid var(--nrs-accent-border)",
                  color: "var(--nrs-accent)",
                  background: "transparent",
                }}
              >
                {selecting === fc.id ? "Selecting..." : `Choose ${fc.name}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
