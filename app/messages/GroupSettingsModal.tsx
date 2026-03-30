"use client";

import { useState, useEffect } from "react";
import type { Conversation, CurrentUser } from "./MessagesClient";

type AdminMember = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
};

export default function GroupSettingsModal({
  conversation,
  currentUser,
  onClose,
  onDeleted,
}: {
  conversation: Conversation;
  currentUser: CurrentUser;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(conversation.name ?? "");
  const [description, setDescription] = useState(conversation.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<AdminMember[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (addQuery.length < 1) { setAddResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/messages/admin-search?q=${encodeURIComponent(addQuery)}`);
      if (!res.ok) return;
      const data = await res.json();
      const currentIds = new Set(conversation.participants.map((p) => p.user_id));
      setAddResults((data.members ?? []).filter((m: AdminMember) => !currentIds.has(m.id)));
    }, 250);
    return () => clearTimeout(timer);
  }, [addQuery, conversation.participants]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/messages/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
  }

  async function handleAdd(member: AdminMember) {
    setAdding(true);
    setError(null);
    const res = await fetch(`/api/messages/conversations/${conversation.id}/participants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: [member.id] }),
    });
    setAdding(false);
    if (res.ok) {
      setAddQuery("");
      setAddResults([]);
      // Reload the page to reflect participant change
      window.location.reload();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to add");
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    const res = await fetch(`/api/messages/conversations/${conversation.id}/participants/${userId}`, {
      method: "DELETE",
    });
    setRemovingId(null);
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to remove");
    }
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this group chat and all its messages?")) return;
    const res = await fetch(`/api/messages/conversations/${conversation.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm px-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col gap-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Group Settings</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Name / Description */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-400 font-medium">Group Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25"
          />
          <label className="text-xs text-neutral-400 font-medium">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25"
          />
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-2 text-sm rounded-lg bg-white/10 hover:bg-white/15 transition disabled:opacity-40"
          >
            {saving ? "Saving…" : saveSuccess ? "✓ Saved" : "Save Changes"}
          </button>
        </div>

        {/* Participants */}
        <div>
          <p className="text-xs text-neutral-400 font-medium mb-2">
            Participants ({conversation.participants.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {conversation.participants.map((p) => (
              <div key={p.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5">
                <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-300 shrink-0 overflow-hidden">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                    : p.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-neutral-200 flex-1 truncate">{p.display_name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.role === "super_admin" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-neutral-400"}`}>
                  {p.role === "super_admin" ? "Super" : "Admin"}
                </span>
                {p.user_id !== currentUser.id && (
                  <button
                    onClick={() => handleRemove(p.user_id)}
                    disabled={removingId === p.user_id}
                    className="text-neutral-600 hover:text-red-400 transition disabled:opacity-40"
                    title="Remove participant"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add participant */}
          <div className="mt-3">
            <input
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="Add participant…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25"
            />
            {addResults.length > 0 && (
              <div className="mt-1 border border-white/10 rounded-lg divide-y divide-white/5 max-h-32 overflow-y-auto">
                {addResults.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAdd(m)}
                    disabled={adding}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition disabled:opacity-40"
                  >
                    <span className="text-sm text-neutral-200 flex-1 truncate">{m.display_name}</span>
                    <span className="text-xs text-neutral-500">Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Delete group */}
        <div className="border-t border-white/10 pt-4">
          <button
            onClick={handleDelete}
            className="w-full py-2 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
          >
            Delete Group Chat
          </button>
        </div>
      </div>
    </div>
  );
}
