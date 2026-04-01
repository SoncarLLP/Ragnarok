"use client";

import { useState } from "react";
import type { AccountMode, PrivacySettings, ExtendedProfileVisibility } from "@/lib/privacy";
import {
  ACCOUNT_MODE_LABELS,
  VISIBILITY_LABELS,
  PROFILE_VISIBILITY_LABELS,
  FOLLOW_LABELS,
} from "@/lib/privacy";

type VisibilityLevel = "everyone" | "followers" | "nobody";
type ProfileVisibility = "everyone" | "followers" | "only_me";

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border px-3 py-2 text-sm outline-none transition"
      style={{
        background: "var(--nrs-card)",
        color: "var(--nrs-text-body)",
        borderColor: "var(--nrs-border)",
      }}
    >
      {(Object.entries(options) as [T, string][]).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 last:border-0" style={{ borderBottom: "1px solid var(--nrs-border-subtle)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--nrs-text-body)" }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function PrivacyForm({
  initialAccountMode,
  initialPrivacySettings,
  initialExtendedVisibility,
  role,
  initialMessagingDisabled = false,
}: {
  initialAccountMode: AccountMode;
  initialPrivacySettings: PrivacySettings;
  initialExtendedVisibility: ExtendedProfileVisibility;
  role?: string | null;
  initialMessagingDisabled?: boolean;
}) {
  const [accountMode, setAccountMode] = useState<AccountMode>(initialAccountMode);
  const [ps, setPs] = useState<PrivacySettings>({ ...initialPrivacySettings });
  const [ev, setEv] = useState<ExtendedProfileVisibility>({ ...initialExtendedVisibility });
  const [messagingDisabled, setMessagingDisabled] = useState(initialMessagingDisabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = role === "admin" || role === "super_admin";

  function updatePs<K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) {
    setPs((prev) => ({ ...prev, [key]: value }));
  }
  function updateEv<K extends keyof ExtendedProfileVisibility>(
    key: K,
    value: ExtendedProfileVisibility[K]
  ) {
    setEv((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/privacy/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_mode: accountMode, privacy_settings: ps, extended_profile_visibility: ev, messaging_disabled: messagingDisabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const MODE_DESCRIPTIONS: Record<AccountMode, string> = {
    public: "Your profile is fully visible and searchable by everyone, including non-members.",
    followers_only:
      "Your profile is searchable by members but your posts, reactions, and personal details are only visible to approved followers. New follow requests must be manually approved.",
    private:
      "Your profile is completely hidden from all other members and non-members. You will not appear in any search results. Only admins can see your profile for moderation purposes.",
  };

  return (
    <div className="space-y-8">
      {/* Account Mode */}
      <section>
        <h2 className="text-base font-semibold mb-3">Account mode</h2>
        <div className="space-y-2">
          {(["public", "followers_only", "private"] as AccountMode[]).map((mode) => (
            <label
              key={mode}
              className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition"
              style={{
                borderColor: accountMode === mode ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)",
                background: accountMode === mode ? "var(--nrs-accent-dim)" : "var(--nrs-card)",
              }}
            >
              <input
                type="radio"
                name="account_mode"
                value={mode}
                checked={accountMode === mode}
                onChange={() => setAccountMode(mode)}
                className="mt-0.5 accent-amber-400"
              />
              <div>
                <div className="text-sm font-medium">{ACCOUNT_MODE_LABELS[mode]}</div>
                <div className="text-xs text-neutral-400 mt-0.5">{MODE_DESCRIPTIONS[mode]}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Interaction Controls */}
      <section>
        <h2 className="text-base font-semibold mb-1">Interaction controls</h2>
        <p className="text-xs mb-4" style={{ color: "var(--nrs-text-muted)" }}>
          Control who can interact with your content and profile.
        </p>
        <div className="rounded-xl px-4" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border-subtle)" }}>
          <SettingRow label="Who can comment on my posts">
            <Select<VisibilityLevel>
              value={ps.who_can_comment}
              options={VISIBILITY_LABELS}
              onChange={(v) => updatePs("who_can_comment", v)}
            />
          </SettingRow>
          <SettingRow label="Who can react to my posts">
            <Select<VisibilityLevel>
              value={ps.who_can_react}
              options={VISIBILITY_LABELS}
              onChange={(v) => updatePs("who_can_react", v)}
            />
          </SettingRow>
          <SettingRow label="Who can share my posts">
            <Select<VisibilityLevel>
              value={ps.who_can_share}
              options={VISIBILITY_LABELS}
              onChange={(v) => updatePs("who_can_share", v)}
            />
          </SettingRow>
          <SettingRow label="Who can send me follow requests">
            <Select<"everyone" | "nobody">
              value={ps.who_can_follow}
              options={FOLLOW_LABELS}
              onChange={(v) => updatePs("who_can_follow", v)}
            />
          </SettingRow>
          <SettingRow label="Who can see my followers list">
            <Select<VisibilityLevel>
              value={ps.show_followers_list}
              options={VISIBILITY_LABELS}
              onChange={(v) => updatePs("show_followers_list", v)}
            />
          </SettingRow>
          <SettingRow label="Who can see my following list">
            <Select<VisibilityLevel>
              value={ps.show_following_list}
              options={VISIBILITY_LABELS}
              onChange={(v) => updatePs("show_following_list", v)}
            />
          </SettingRow>
        </div>
      </section>

      {/* Profile Visibility */}
      <section>
        <h2 className="text-base font-semibold mb-1">Profile visibility</h2>
        <p className="text-xs mb-4" style={{ color: "var(--nrs-text-muted)" }}>
          Control who can see each section of your profile. Extended profile fields default to
          &ldquo;Only me&rdquo; when first added.
        </p>
        <div className="rounded-xl px-4" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border-subtle)" }}>
          <SettingRow label="Personal details" description="Name, bio">
            <Select<ProfileVisibility>
              value={ev.personal_details}
              options={PROFILE_VISIBILITY_LABELS}
              onChange={(v) => updateEv("personal_details", v)}
            />
          </SettingRow>
          <SettingRow
            label="Extended profile details"
            description="Gender, pronouns, nationality, age, location, website"
          >
            <Select<ProfileVisibility>
              value={ev.extended_details}
              options={PROFILE_VISIBILITY_LABELS}
              onChange={(v) => updateEv("extended_details", v)}
            />
          </SettingRow>
          <SettingRow label="Loyalty tier and points">
            <Select<ProfileVisibility>
              value={ev.loyalty_tier}
              options={PROFILE_VISIBILITY_LABELS}
              onChange={(v) => updateEv("loyalty_tier", v)}
            />
          </SettingRow>
          <SettingRow label="Order history">
            <Select<ProfileVisibility>
              value={ev.order_history}
              options={PROFILE_VISIBILITY_LABELS}
              onChange={(v) => updateEv("order_history", v)}
            />
          </SettingRow>
          <SettingRow label="Community posts">
            <Select<ProfileVisibility>
              value={ev.community_posts}
              options={PROFILE_VISIBILITY_LABELS}
              onChange={(v) => updateEv("community_posts", v)}
            />
          </SettingRow>
          <SettingRow label="Reactions and interactions">
            <Select<ProfileVisibility>
              value={ev.reactions}
              options={PROFILE_VISIBILITY_LABELS}
              onChange={(v) => updateEv("reactions", v)}
            />
          </SettingRow>
        </div>
      </section>

      {/* Messaging settings — admin/super_admin only */}
      {isAdmin && (
        <section>
          <h2 className="text-base font-semibold mb-1">Messaging</h2>
          <p className="text-xs mb-4" style={{ color: "var(--nrs-text-muted)" }}>
            Control whether other admins can start new direct message conversations with you.
            Super admins can always message you regardless of this setting.
          </p>
          <div className="rounded-xl px-4" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border-subtle)" }}>
            <SettingRow
              label="Disable direct messages"
              description="When enabled, other admins cannot start new DM conversations with you."
            >
              <button
                type="button"
                role="switch"
                aria-checked={messagingDisabled}
                onClick={() => setMessagingDisabled((v) => !v)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
                style={{
                  background: messagingDisabled ? "var(--nrs-accent)" : "var(--nrs-panel)",
                }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                    messagingDisabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </SettingRow>
          </div>
        </section>
      )}

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60 text-sm font-medium transition"
        >
          {saving ? "Saving…" : "Save privacy settings"}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved ✓</span>}
      </div>
    </div>
  );
}
