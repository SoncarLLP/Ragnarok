"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({
  initialFullName,
  initialPhone,
}: {
  initialFullName: string;
  initialPhone: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
        />
      </div>
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
