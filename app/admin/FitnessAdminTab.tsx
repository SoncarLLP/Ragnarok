"use client";

import { useState, useEffect } from "react";

interface AbuseFlag {
  id: string;
  user_id: string;
  flag_type: string;
  details: Record<string, unknown>;
  flagged_at: string;
  resolved: boolean;
  action_taken?: string;
  profiles?: { full_name: string | null; member_id: number | null };
}

interface XPEvent {
  id: string;
  name: string;
  description?: string;
  event_type: string;
  class_id?: string;
  exercise_category?: string;
  multiplier: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface FitnessStats {
  totalWorkouts: number;
  totalMembers: number;
  totalXP: number;
  activeChallenges: number;
  pendingExercises: number;
  pendingFlags: number;
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  excessive_workouts: "Excessive Workouts",
  long_session:       "Long Session",
  xp_spike:           "XP Spike",
  daily_spike:        "Daily Spike",
  excessive_prs:      "Excessive PRs",
  bot_pattern:        "Bot Pattern",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  global:            "Global (all members)",
  class:             "Class-specific",
  exercise_category: "Exercise category",
  double_xp:         "Double XP",
};

export default function FitnessAdminTab() {
  const [activeSection, setActiveSection] = useState<"overview" | "abuse" | "events" | "challenges" | "exercises">("overview");

  const [stats, setStats]           = useState<FitnessStats | null>(null);
  const [abuseFlags, setAbuseFlags] = useState<AbuseFlag[]>([]);
  const [xpEvents, setXpEvents]     = useState<XPEvent[]>([]);
  const [loading, setLoading]       = useState(false);

  // New event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventName, setEventName]         = useState("");
  const [eventDesc, setEventDesc]         = useState("");
  const [eventType, setEventType]         = useState("global");
  const [eventMult, setEventMult]         = useState<number>(2.0);
  const [eventStart, setEventStart]       = useState("");
  const [eventEnd, setEventEnd]           = useState("");
  const [eventMsg, setEventMsg]           = useState("");
  const [submittingEvent, setSubmittingEvent] = useState(false);

  useEffect(() => {
    loadSection(activeSection);
  }, [activeSection]);

  async function loadSection(section: string) {
    setLoading(true);
    try {
      if (section === "overview") {
        // Fetch basic stats in parallel
        const [workoutsRes, eventsRes, flagsRes] = await Promise.all([
          fetch("/api/fitness/workouts?limit=1"),
          fetch("/api/fitness/events"),
          fetch("/api/admin/fitness/flags?limit=5").catch(() => ({ json: async () => ({ flags: [] }) })),
        ]);
        const workoutsData = await workoutsRes.json();
        const eventsData   = await eventsRes.json();
        const flagsData    = await (flagsRes as Response).json();
        setStats({
          totalWorkouts: workoutsData.total ?? 0,
          totalMembers: 0,
          totalXP: 0,
          activeChallenges: 0,
          pendingExercises: 0,
          pendingFlags: flagsData.total ?? 0,
        });
        setXpEvents(eventsData.events ?? []);
        setAbuseFlags(flagsData.flags ?? []);
      } else if (section === "events") {
        const res  = await fetch("/api/fitness/events");
        const data = await res.json();
        setXpEvents(data.events ?? []);
      } else if (section === "abuse") {
        const res = await fetch("/api/admin/fitness/flags?resolved=false&limit=50").catch(
          () => ({ json: async () => ({ flags: [] }) })
        );
        const data = await (res as Response).json();
        setAbuseFlags(data.flags ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleEvent(eventId: string, isActive: boolean) {
    await fetch("/api/fitness/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, isActive }),
    });
    loadSection("events");
  }

  async function createEvent() {
    if (!eventName || !eventStart || !eventEnd) return;
    setSubmittingEvent(true);
    setEventMsg("");
    const res = await fetch("/api/fitness/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: eventName,
        description: eventDesc,
        eventType,
        multiplier: eventMult,
        startDate: eventStart,
        endDate: eventEnd,
      }),
    });
    const data = await res.json();
    setSubmittingEvent(false);
    if (res.ok) {
      setEventMsg("Event created!");
      setShowEventForm(false);
      setEventName(""); setEventDesc(""); setEventType("global"); setEventMult(2.0);
      loadSection("events");
    } else {
      setEventMsg(data.error ?? "Failed");
    }
  }

  const SECTIONS = [
    { key: "overview",   label: "Overview",   emoji: "📊" },
    { key: "abuse",      label: "Abuse Review", emoji: "🚩" },
    { key: "events",     label: "XP Events",  emoji: "⚡" },
    { key: "challenges", label: "Challenges", emoji: "🎯" },
    { key: "exercises",  label: "Exercises",  emoji: "💪" },
  ];

  return (
    <div>
      {/* Section tabs */}
      <div className="admin-tab-bar flex gap-1 pb-2 mb-5">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key as typeof activeSection)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition"
            style={{
              border: `1px solid ${activeSection === s.key ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
              background: activeSection === s.key ? "var(--nrs-accent-dim)" : "transparent",
              color: activeSection === s.key ? "var(--nrs-accent)" : "var(--nrs-text-muted)",
            }}
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-6 text-sm" style={{ color: "var(--nrs-text-muted)" }}>Loading...</div>
      )}

      {/* Overview */}
      {!loading && activeSection === "overview" && (
        <div className="space-y-4">
          <h3 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Fitness Overview</h3>
          {stats && (
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Total Workouts Logged", value: stats.totalWorkouts.toLocaleString(), emoji: "🏋️" },
                { label: "Pending Abuse Flags", value: String(stats.pendingFlags), emoji: "🚩", alert: stats.pendingFlags > 0 },
                { label: "Active XP Events", value: String(xpEvents.length), emoji: "⚡" },
              ].map(({ label, value, emoji, alert }) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{
                    border: alert ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--nrs-border-subtle)",
                    background: alert ? "rgba(239,68,68,0.05)" : "var(--nrs-card)",
                  }}
                >
                  <div className="text-xl mb-1">{emoji}</div>
                  <div className="text-2xl font-bold" style={{ color: alert ? "#f87171" : "var(--nrs-text)" }}>
                    {value}
                  </div>
                  <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Quick links */}
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => setActiveSection("abuse")}
              className="rounded-xl p-4 text-left transition hover:bg-white/5"
              style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
            >
              <div className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>🚩 Review Abuse Flags</div>
              <div className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
                Review flagged fitness activity and freeze/unfreeze member points.
              </div>
            </button>
            <button
              onClick={() => setActiveSection("events")}
              className="rounded-xl p-4 text-left transition hover:bg-white/5"
              style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
            >
              <div className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>⚡ Manage XP Events</div>
              <div className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
                Create and manage XP boost events for members.
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Abuse Flags */}
      {!loading && activeSection === "abuse" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Abuse Review Queue</h3>
            <button
              onClick={() => loadSection("abuse")}
              className="text-xs px-3 py-1.5 rounded-lg transition"
              style={{ border: "1px solid var(--nrs-border)", color: "var(--nrs-text-muted)" }}
            >
              Refresh
            </button>
          </div>

          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}
          >
            ⚠️ Flagged members have their fitness points frozen pending review.
            To manage individual members, use the Members tab and search by name.
            Full flag management requires direct Supabase access (fitness_abuse_flags table).
          </div>

          {abuseFlags.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              No active abuse flags. ✓
            </div>
          ) : (
            <div className="space-y-2">
              {abuseFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="rounded-xl p-4"
                  style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm text-red-400">
                        🚩 {FLAG_TYPE_LABELS[flag.flag_type] ?? flag.flag_type}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
                        {flag.profiles?.full_name ?? flag.user_id.slice(0, 8)}
                        {flag.profiles?.member_id && ` · #${flag.profiles.member_id}`}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
                        {new Date(flag.flagged_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      <div className="text-xs mt-1 font-mono" style={{ color: "var(--nrs-text-muted)" }}>
                        {JSON.stringify(flag.details).slice(0, 100)}...
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${flag.resolved ? "text-emerald-400" : "text-red-400"}`}
                      style={{ background: flag.resolved ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${flag.resolved ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                      {flag.resolved ? "Resolved" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* XP Events */}
      {!loading && activeSection === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: "var(--nrs-text)" }}>XP Boost Events</h3>
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="text-sm px-4 py-1.5 rounded-lg font-semibold transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
            >
              + New Event
            </button>
          </div>

          {eventMsg && (
            <div className="rounded-lg px-3 py-2 text-sm" style={{
              background: eventMsg.includes("Failed") ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
              color: eventMsg.includes("Failed") ? "#f87171" : "#34d399",
            }}>
              {eventMsg}
            </div>
          )}

          {/* Create event form */}
          {showEventForm && (
            <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Event Name *</label>
                  <input
                    type="text" value={eventName} onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Event Type</label>
                  <select
                    value={eventType} onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>XP Multiplier</label>
                  <input
                    type="number" min={1.1} max={5} step={0.1} value={eventMult}
                    onChange={(e) => setEventMult(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Description</label>
                  <input
                    type="text" value={eventDesc} onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Start Date/Time *</label>
                  <input
                    type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>End Date/Time *</label>
                  <input
                    type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
                  />
                </div>
              </div>
              <button
                onClick={createEvent}
                disabled={submittingEvent || !eventName || !eventStart || !eventEnd}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
              >
                {submittingEvent ? "Creating..." : "Create XP Event ⚡"}
              </button>
            </div>
          )}

          {/* Events list */}
          {xpEvents.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              No XP events configured.
            </div>
          ) : (
            <div className="space-y-3">
              {xpEvents.map((ev) => {
                const isActive = ev.is_active && new Date(ev.end_date) > new Date();
                return (
                  <div
                    key={ev.id}
                    className="rounded-xl p-4"
                    style={{
                      border: `1px solid ${isActive ? "rgba(239,68,68,0.3)" : "var(--nrs-border-subtle)"}`,
                      background: isActive ? "rgba(239,68,68,0.05)" : "var(--nrs-card)",
                      opacity: isActive ? 1 : 0.7,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--nrs-text)" }}>
                          ⚡ {ev.name}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "text-emerald-400 border-emerald-400/30" : "text-neutral-500 border-neutral-600/30"}`}
                            style={{ border: `1px solid`, background: isActive ? "rgba(52,211,153,0.1)" : "rgba(64,64,64,0.2)" }}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          <span className="text-xs font-bold text-red-400">×{ev.multiplier} XP</span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
                          {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                          {new Date(ev.start_date).toLocaleDateString("en-GB")} →{" "}
                          {new Date(ev.end_date).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleEvent(ev.id, !ev.is_active)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition"
                        style={{
                          border: "1px solid var(--nrs-border)",
                          color: ev.is_active ? "#f87171" : "#34d399",
                          background: "transparent",
                        }}
                      >
                        {ev.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Challenges / Exercises placeholders */}
      {!loading && (activeSection === "challenges" || activeSection === "exercises") && (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>
          <div className="text-3xl mb-2">{activeSection === "challenges" ? "🎯" : "💪"}</div>
          <div className="font-medium mb-1" style={{ color: "var(--nrs-text)" }}>
            {activeSection === "challenges" ? "Challenge Manager" : "Exercise Library Manager"}
          </div>
          <p className="text-sm">
            Manage {activeSection === "challenges" ? "weekly/monthly fitness challenges" : "the exercise library and approve custom exercises"}{" "}
            directly in Supabase or via the Site Management panel.
          </p>
        </div>
      )}
    </div>
  );
}
