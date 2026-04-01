"use client";

import { useState, useEffect, useCallback } from "react";
import type { CurrentUser } from "./MessagesClient";

type AdminMember = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
};

async function searchAdmins(q: string): Promise<AdminMember[]> {
  const res = await fetch(`/api/messages/admin-search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.members ?? [];
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) return <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-300 shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function NewConversationModal({
  currentUser,
  onClose,
  onCreated,
}: {
  currentUser: CurrentUser;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const isSuperAdmin = currentUser.role === "super_admin";
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminMember[]>([]);
  const [selected, setSelected] = useState<AdminMember[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    const members = await searchAdmins(q);
    setResults(members.filter((m) => m.id !== currentUser.id && !selected.find((s) => s.id === m.id)));
  }, [currentUser.id, selected]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  function toggleSelect(member: AdminMember) {
    if (mode === "direct") {
      setSelected([member]);
      setQuery("");
      setResults([]);
    } else {
      setSelected((prev) =>
        prev.find((s) => s.id === member.id)
          ? prev.filter((s) => s.id !== member.id)
          : [...prev, member]
      );
    }
  }

  async function handleCreate() {
    if (selected.length === 0) return;
    if (mode === "group" && !groupName.trim()) {
      setError("Group name is required");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          participant_ids: selected.map((s) => s.id),
          name: mode === "group" ? groupName.trim() : undefined,
          description: mode === "group" && groupDesc.trim() ? groupDesc.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      onCreated(data.conversation_id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="rounded-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">New Conversation</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Mode toggle — super admins only see group option */}
        {isSuperAdmin && (
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-4">
            <button
              onClick={() => { setMode("direct"); setSelected([]); }}
              className={`flex-1 py-1.5 text-sm rounded-md transition ${mode === "direct" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              Direct Message
            </button>
            <button
              onClick={() => { setMode("group"); setSelected([]); }}
              className={`flex-1 py-1.5 text-sm rounded-md transition ${mode === "group" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              Group Chat
            </button>
          </div>
        )}

        {/* Group name + description */}
        {mode === "group" && (
          <div className="space-y-2 mb-4">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name *"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25"
            />
            <input
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25"
            />
          </div>
        )}

        {/* Selected members chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs text-amber-300"
              >
                <span>{m.display_name}</span>
                <button onClick={() => setSelected((prev) => prev.filter((s) => s.id !== m.id))} className="hover:text-white transition">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {(mode === "group" || selected.length === 0) && (
          <div className="relative mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "direct" ? "Search admins…" : "Add participants…"}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25"
            />
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="overflow-y-auto max-h-48 border border-white/10 rounded-lg mb-3 divide-y divide-white/5">
            {results.map((m) => {
              const isSelected = selected.some((s) => s.id === m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleSelect(m)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${isSelected ? "bg-amber-500/10" : "hover:bg-white/5"}`}
                >
                  <Avatar name={m.display_name} src={m.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 truncate">{m.display_name}</p>
                    {m.username && <p className="text-xs text-neutral-500">@{m.username}</p>}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${m.role === "super_admin" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-neutral-400"}`}>
                    {m.role === "super_admin" ? "Super" : "Admin"}
                  </span>
                  {isSelected && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 shrink-0">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {query.length >= 1 && results.length === 0 && (
          <p className="text-xs text-neutral-600 mb-3">No admins found matching &ldquo;{query}&rdquo;</p>
        )}

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={selected.length === 0 || creating || (mode === "group" && !groupName.trim())}
            className="flex-1 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {creating ? "Creating…" : mode === "direct" ? "Open Chat" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
