"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const GENDER_OPTIONS = [
  "Prefer not to say",
  "Male",
  "Female",
  "Non-binary",
  "Genderqueer",
  "Agender",
  "Prefer to self-describe",
];

const PRONOUNS_OPTIONS = [
  "he/him",
  "she/her",
  "they/them",
  "he/they",
  "she/they",
  "any pronouns",
  "prefer not to say",
  "prefer to self-describe",
];

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function ProfileForm({
  initialFullName,
  initialPhone,
  initialUsername,
  initialBio,
  initialAvatarUrl,
  initialGender,
  initialPronouns,
  initialLocation,
  initialDateOfBirth,
  initialNationality,
  initialWebsite,
  initialDisplayNamePreference,
}: {
  initialFullName: string;
  initialPhone: string;
  initialUsername: string;
  initialBio: string;
  initialAvatarUrl: string;
  initialGender: string;
  initialPronouns: string;
  initialLocation: string;
  initialDateOfBirth: string;
  initialNationality: string;
  initialWebsite: string;
  initialDisplayNamePreference: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [displayNamePreference, setDisplayNamePreference] = useState(
    initialDisplayNamePreference || "username"
  );
  // Extended fields
  const [gender, setGender] = useState(initialGender);
  const [pronouns, setPronouns] = useState(initialPronouns);
  const [location, setLocation] = useState(initialLocation);
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
  const [nationality, setNationality] = useState(initialNationality);
  const [website, setWebsite] = useState(initialWebsite);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showExtended, setShowExtended] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setUsernameStatus("idle");
      return;
    }

    // Same as the initial value — no need to re-check
    if (trimmed === initialUsername) {
      setUsernameStatus("available");
      return;
    }

    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    try {
      const res = await fetch(
        `/api/community/username/check?username=${encodeURIComponent(trimmed)}`
      );
      const data: { available: boolean } = await res.json();
      setUsernameStatus(data.available ? "available" : "taken");
    } catch {
      setUsernameStatus("idle");
    }
  }, [initialUsername]);

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    setUsernameStatus("checking");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkUsername(value);
    }, 400);
  }

  // Run initial check if there's already a username set
  useEffect(() => {
    if (initialUsername) setUsernameStatus("available");
  }, [initialUsername]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  // Determine whether saving should be blocked
  const usernameTrimmed = username.trim();
  const canSave =
    !saving &&
    (
      !usernameTrimmed ||                          // no username entered — that's fine
      usernameStatus === "available"               // or it's confirmed available
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaved(false);
    setError("");

    if (usernameTrimmed && !/^[a-z0-9_]{3,30}$/.test(usernameTrimmed)) {
      setError("Username must be 3–30 lowercase letters, numbers, or underscores.");
      setSaving(false);
      return;
    }

    if (website && !/^https?:\/\//.test(website)) {
      setError("Website must start with http:// or https://");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    let finalAvatarUrl = avatarPreview;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadErr) {
        setError(uploadErr.message);
        setSaving(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      finalAvatarUrl = publicUrl;
      setAvatarPreview(publicUrl);
      setAvatarFile(null);
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        username: usernameTrimmed || null,
        bio: bio || null,
        avatar_url: finalAvatarUrl || null,
        display_name_preference: displayNamePreference,
        gender: gender || null,
        pronouns: pronouns || null,
        location_text: location || null,
        date_of_birth: dateOfBirth || null,
        nationality: nationality || null,
        website: website || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (err) {
      if (err.code === "23505") {
        setError("That username is already taken.");
        setUsernameStatus("taken");
      } else {
        setError(err.message);
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  const displayInitials = (fullName || username || "M").slice(0, 2).toUpperCase();

  function UsernameIndicator() {
    if (!usernameTrimmed) return null;
    if (usernameStatus === "checking") {
      return (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
          checking…
        </span>
      );
    }
    if (usernameStatus === "available") {
      return (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" title="Username available">
          ✅
        </span>
      );
    }
    if (usernameStatus === "taken") {
      return (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400" title="Username taken">
          ❌
        </span>
      );
    }
    if (usernameStatus === "invalid") {
      return (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400" title="Invalid format">
          ⚠️
        </span>
      );
    }
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div>
        <label className="block text-sm text-neutral-300 mb-2">Profile photo</label>
        <div className="flex items-center gap-4">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-700 flex items-center justify-center text-xl font-semibold shrink-0">
              {displayInitials}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm transition"
          >
            Change photo
          </button>
        </div>
      </div>

      {/* Full name */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
        />
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Username</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
            @
          </span>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="yourname"
            className="w-full rounded-md bg-neutral-900 border border-white/10 pl-7 pr-10 py-2.5 text-sm outline-none focus:border-white/30"
          />
          <UsernameIndicator />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          3–30 chars · lowercase letters, numbers, underscores · used in your community profile URL
        </p>
        {usernameStatus === "taken" && (
          <p className="mt-1 text-xs text-rose-400">That username is already taken.</p>
        )}
      </div>

      {/* Display name preference */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <label className="block text-sm text-neutral-300 mb-1 font-medium">
          Display name preference
        </label>
        <p className="text-xs text-neutral-500 mb-3">
          Choose what other members see when your name appears across the site.
        </p>
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              name="displayNamePreference"
              value="username"
              checked={displayNamePreference === "username"}
              onChange={() => setDisplayNamePreference("username")}
              className="mt-0.5 accent-amber-400"
            />
            <div>
              <div className="text-sm text-neutral-200 group-hover:text-white transition">
                Show username <span className="text-neutral-500">(default)</span>
              </div>
              <div className="text-xs text-neutral-500">
                Others see your @username — e.g. <span className="text-neutral-300">@{username || "yourname"}</span>
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              name="displayNamePreference"
              value="real_name"
              checked={displayNamePreference === "real_name"}
              onChange={() => setDisplayNamePreference("real_name")}
              className="mt-0.5 accent-amber-400"
            />
            <div>
              <div className="text-sm text-neutral-200 group-hover:text-white transition">
                Show real name
              </div>
              <div className="text-xs text-neutral-500">
                Others see your full name — e.g.{" "}
                <span className="text-neutral-300">{fullName || "Your Name"}</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={160}
          placeholder="Tell the community about yourself…"
          className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30 resize-none"
        />
        <p className="mt-0.5 text-xs text-neutral-500">{bio.length}/160</p>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+44 7700 000000"
          className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
        />
      </div>

      {/* Extended profile fields */}
      <div className="border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => setShowExtended(!showExtended)}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition mb-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showExtended ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Extended profile
        </button>
        <p className="text-xs text-neutral-500 mb-4">
          Optional fields. All extended profile details are private by default — control who can see
          them in{" "}
          <a href="/account/privacy" className="text-amber-400 hover:underline">
            Privacy &amp; Safety
          </a>
          .
        </p>

        {showExtended && (
          <div className="space-y-4">
            {/* Gender */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Gender</label>
              <div className="flex gap-2">
                <select
                  value={GENDER_OPTIONS.includes(gender) ? gender : "Prefer to self-describe"}
                  onChange={(e) => {
                    if (e.target.value !== "Prefer to self-describe") setGender(e.target.value);
                  }}
                  className="rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30 flex-1"
                >
                  <option value="">— Select —</option>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {(!GENDER_OPTIONS.includes(gender) || gender === "Prefer to self-describe") && (
                  <input
                    type="text"
                    value={GENDER_OPTIONS.includes(gender) ? "" : gender}
                    onChange={(e) => setGender(e.target.value)}
                    placeholder="Describe your gender"
                    className="flex-1 rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
                  />
                )}
              </div>
            </div>

            {/* Pronouns */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Pronouns</label>
              <div className="flex gap-2">
                <select
                  value={PRONOUNS_OPTIONS.includes(pronouns) ? pronouns : "prefer to self-describe"}
                  onChange={(e) => {
                    if (e.target.value !== "prefer to self-describe") setPronouns(e.target.value);
                  }}
                  className="rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30 flex-1"
                >
                  <option value="">— Select —</option>
                  {PRONOUNS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {(!PRONOUNS_OPTIONS.includes(pronouns) || pronouns === "prefer to self-describe") && (
                  <input
                    type="text"
                    value={PRONOUNS_OPTIONS.includes(pronouns) ? "" : pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="Your pronouns"
                    className="flex-1 rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
                  />
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                maxLength={100}
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
              />
            </div>

            {/* Date of birth */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Date of birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Used to calculate your age only. Your date of birth is never displayed publicly.
              </p>
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. British"
                maxLength={60}
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSave}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm transition"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved ✓</span>}
        {usernameStatus === "taken" && !saved && (
          <span className="text-rose-400 text-xs">Choose a different username to save</span>
        )}
      </div>
    </form>
  );
}
