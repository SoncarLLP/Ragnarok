"use client";

import { useState, useEffect } from "react";

const PREF_ITEMS = [
  { key: "reaction_enabled",           label: "Reactions",            desc: "When someone reacts to your post" },
  { key: "mention_enabled",            label: "Mentions",             desc: "When someone mentions you" },
  { key: "message_enabled",            label: "Messages",             desc: "When you receive a direct message" },
  { key: "workout_reminder_enabled",   label: "Workout reminders",    desc: "Daily reminder if you haven't logged a workout" },
  { key: "nutrition_reminder_enabled", label: "Nutrition reminders",  desc: "Daily reminder if you haven't logged meals" },
  { key: "level_up_enabled",           label: "Level ups & streaks",  desc: "XP milestones, challenge completions and level-ups" },
  { key: "challenge_enabled",          label: "Challenges",           desc: "New challenges and challenge updates" },
  { key: "warning_enabled",            label: "Account notices",      desc: "Admin warnings and important account alerts" },
] as const;

type PrefKey = typeof PREF_ITEMS[number]["key"];
type Prefs = Record<PrefKey, boolean>;

const DEFAULT_PREFS: Prefs = {
  reaction_enabled: true,
  mention_enabled: true,
  message_enabled: true,
  workout_reminder_enabled: true,
  nutrition_reminder_enabled: true,
  level_up_enabled: true,
  challenge_enabled: true,
  warning_enabled: true,
};

export default function PushSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Check notification support and current permission
    if (!("Notification" in window)) {
      setPermissionState("unsupported");
    } else {
      setPermissionState(Notification.permission);
    }

    // Check SW subscription
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }).catch(() => {});
    }

    // Load preferences
    fetch("/api/push/preferences")
      .then((r) => r.json())
      .then((data) => {
        setPrefs({ ...DEFAULT_PREFS, ...data });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = (key: PrefKey) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/push/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRequestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermissionState(result);
    if (result === "granted" && "serviceWorker" in navigator && "PushManager" in window) {
      const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!VAPID_PUBLIC) return;
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (!existing) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
        const s = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: s.endpoint, keys: { p256dh: s.keys?.p256dh, auth: s.keys?.auth } }),
        });
      }
      setIsSubscribed(true);
    }
  };

  const handleUnsubscribe = async () => {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        setIsSubscribed(false);
      }
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--nrs-text)" }}>Push Notifications</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
          Control which notifications you receive on this device.
        </p>
      </div>

      {/* Permission status */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>
              Notification status
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
              {permissionState === "unsupported" && "Not supported on this device"}
              {permissionState === "denied" && "Notifications blocked — enable in browser settings"}
              {permissionState === "default" && "Permission not yet granted"}
              {permissionState === "granted" && isSubscribed && "Active — notifications enabled"}
              {permissionState === "granted" && !isSubscribed && "Permission granted but not subscribed"}
            </div>
          </div>
          <span
            className="w-3 h-3 rounded-full"
            style={{
              background:
                permissionState === "granted" && isSubscribed
                  ? "#34d399"
                  : permissionState === "denied"
                  ? "#f87171"
                  : "#fbbf24",
            }}
          />
        </div>

        {permissionState === "default" && (
          <button
            onClick={handleRequestPermission}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
          >
            Enable Push Notifications
          </button>
        )}
        {permissionState === "granted" && isSubscribed && (
          <button
            onClick={handleUnsubscribe}
            className="w-full py-2 rounded-lg text-sm font-medium transition"
            style={{ border: "1px solid var(--nrs-border)", color: "var(--nrs-text-muted)" }}
          >
            Unsubscribe this device
          </button>
        )}
        {permissionState === "granted" && !isSubscribed && (
          <button
            onClick={handleRequestPermission}
            className="w-full py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
          >
            Subscribe this device
          </button>
        )}
      </div>

      {/* Preferences */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--nrs-border)", background: "var(--nrs-card)" }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--nrs-border-subtle)" }}>
          <h2 className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>Notification types</h2>
        </div>
        {loading ? (
          <div className="p-4 text-sm" style={{ color: "var(--nrs-text-muted)" }}>Loading…</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--nrs-border-subtle)" }}>
            {PREF_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{item.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>{item.desc}</div>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                  style={{
                    background: prefs[item.key] ? "var(--nrs-accent)" : "var(--nrs-panel)",
                    border: "1px solid var(--nrs-border)",
                  }}
                  aria-checked={prefs[item.key]}
                  role="switch"
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                    style={{
                      background: "#fff",
                      left: prefs[item.key] ? "calc(100% - 1.375rem)" : "2px",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || loading}
        className="w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
        style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
      >
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save preferences"}
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
