"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({
  initialFullName,
  initialPhone,
  initialUsername,
  initialBio,
  initialAvatarUrl,
}: {
  initialFullName: string;
  initialPhone: string;
  initialUsername: string;
  initialBio: string;
  initialAvatarUrl: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarPreview, setAvatarPreview] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      setError("Username must be 3–30 lowercase letters, numbers, or underscores.");
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
        username: username || null,
        bio: bio || null,
        avatar_url: finalAvatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (err) {
      setError(
        err.code === "23505" ? "That username is already taken." : err.message
      );
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  const displayInitials = (fullName || username || "M").slice(0, 2).toUpperCase();

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
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="yourname"
            className="w-full rounded-md bg-neutral-900 border border-white/10 pl-7 pr-3 py-2.5 text-sm outline-none focus:border-white/30"
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          3–30 chars · lowercase letters, numbers, underscores · used in your community profile URL
        </p>
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

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-60 text-sm transition"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved ✓</span>}
      </div>
    </form>
  );
}
