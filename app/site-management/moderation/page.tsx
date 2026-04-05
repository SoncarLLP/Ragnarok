"use client";

import { useState, useEffect, useCallback } from "react";
import { BUILTIN_BLOCKED_WORDS, BUILTIN_WHITELIST_WORDS } from "@/lib/content-moderation";

type LogEntry = {
  id: string;
  user_id: string | null;
  content_type: string;
  excerpt: string | null;
  reason: string;
  blocked_words: string[] | null;
  created_at: string;
  user_name: string;
  user_username: string | null;
  user_member_id: number | null;
};

type TabKey = "blocked" | "whitelist" | "log";

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("blocked");

  // Blocked words state
  const [customBlocked, setCustomBlocked] = useState<string[]>([]);
  const [newBlocked, setNewBlocked] = useState("");
  const [blockedSearch, setBlockedSearch] = useState("");
  const [blockedLoading, setBlockedLoading] = useState(false);

  // Whitelist state
  const [customWhitelist, setCustomWhitelist] = useState<string[]>([]);
  const [newWhitelist, setNewWhitelist] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [whitelistLoading, setWhitelistLoading] = useState(false);

  // Log state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logTypeFilter, setLogTypeFilter] = useState("");
  const [savingWordId, setSavingWordId] = useState<string | null>(null);

  const fetchBlockedWords = useCallback(async () => {
    setBlockedLoading(true);
    const res = await fetch("/api/moderation/settings?key=blocked_words");
    const d = await res.json();
    setCustomBlocked(Array.isArray(d.data?.value) ? (d.data.value as string[]) : []);
    setBlockedLoading(false);
  }, []);

  const fetchWhitelist = useCallback(async () => {
    setWhitelistLoading(true);
    const res = await fetch("/api/moderation/settings?key=whitelist_words");
    const d = await res.json();
    setCustomWhitelist(Array.isArray(d.data?.value) ? (d.data.value as string[]) : []);
    setWhitelistLoading(false);
  }, []);

  const fetchLog = useCallback(async () => {
    setLogLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (logTypeFilter) params.set("type", logTypeFilter);
    const res = await fetch(`/api/moderation/log?${params}`);
    const d = await res.json();
    setLogs(d.logs ?? []);
    setLogLoading(false);
  }, [logTypeFilter]);

  useEffect(() => { fetchBlockedWords(); fetchWhitelist(); }, [fetchBlockedWords, fetchWhitelist]);
  useEffect(() => { if (activeTab === "log") fetchLog(); }, [activeTab, fetchLog]);

  async function addWord(listKey: "blocked_words" | "whitelist_words", word: string, setter: (fn: (prev: string[]) => string[]) => void, inputSetter: (v: string) => void) {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;
    setSavingWordId(`add-${listKey}`);
    await fetch("/api/moderation/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: listKey, words: [trimmed], action: "add" }),
    });
    setter((prev) => [...new Set([...prev, trimmed])]);
    inputSetter("");
    setSavingWordId(null);
  }

  async function removeWord(listKey: "blocked_words" | "whitelist_words", word: string, setter: (fn: (prev: string[]) => string[]) => void) {
    setSavingWordId(`rm-${word}`);
    await fetch("/api/moderation/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: listKey, words: [word], action: "remove" }),
    });
    setter((prev) => prev.filter((w) => w !== word));
    setSavingWordId(null);
  }

  async function resetStrikes(userId: string) {
    await fetch("/api/moderation/strikes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "reset" }),
    });
    alert("Strikes reset for this member.");
  }

  const allBlocked = [...new Set([...BUILTIN_BLOCKED_WORDS, ...customBlocked])].sort();
  const filteredBlocked = blockedSearch
    ? allBlocked.filter((w) => w.includes(blockedSearch.toLowerCase()))
    : allBlocked;

  const allWhitelist = [...new Set([...BUILTIN_WHITELIST_WORDS, ...customWhitelist])].sort();
  const filteredWhitelist = whitelistSearch
    ? allWhitelist.filter((w) => w.includes(whitelistSearch.toLowerCase()))
    : allWhitelist;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "blocked",   label: "Blocked Words",  count: allBlocked.length },
    { key: "whitelist", label: "Whitelist",       count: allWhitelist.length },
    { key: "log",       label: "Moderation Log",  count: logs.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Content Moderation</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage blocked words, the fitness whitelist, and review moderation events.
        </p>
      </div>

      {/* Tab bar */}
      <div className="admin-tab-bar flex gap-1 border-b border-white/10 pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm rounded-t transition border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Blocked Words ─────────────────────────────────────────────── */}
      {activeTab === "blocked" && (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">
            Built-in list ({BUILTIN_BLOCKED_WORDS.length} words) + your custom additions ({customBlocked.length} words).
            Built-in words cannot be removed here — to override a built-in entry, add it to the Whitelist.
          </p>

          <div className="flex gap-2">
            <input
              value={newBlocked}
              onChange={(e) => setNewBlocked(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWord("blocked_words", newBlocked, setCustomBlocked, setNewBlocked)}
              placeholder="Add word or phrase…"
              className="flex-1 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400/40"
            />
            <button
              onClick={() => addWord("blocked_words", newBlocked, setCustomBlocked, setNewBlocked)}
              disabled={savingWordId === "add-blocked_words"}
              className="px-4 py-2 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-sm disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <input
            value={blockedSearch}
            onChange={(e) => setBlockedSearch(e.target.value)}
            placeholder="Search blocked words…"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
          />

          {blockedLoading ? (
            <p className="text-neutral-500 text-sm">Loading…</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-neutral-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Word / Phrase</th>
                    <th className="px-4 py-2 text-left">Source</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBlocked.map((w) => {
                    const isBuiltin = BUILTIN_BLOCKED_WORDS.includes(w);
                    return (
                      <tr key={w} className="hover:bg-white/3">
                        <td className="px-4 py-2 font-mono text-xs text-rose-300">{w}</td>
                        <td className="px-4 py-2 text-xs text-neutral-500">{isBuiltin ? "built-in" : "custom"}</td>
                        <td className="px-4 py-2 text-right">
                          {!isBuiltin && (
                            <button
                              onClick={() => removeWord("blocked_words", w, setCustomBlocked)}
                              disabled={savingWordId === `rm-${w}`}
                              className="text-xs text-neutral-500 hover:text-rose-400 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredBlocked.length === 0 && (
                <p className="text-center py-6 text-neutral-500 text-sm">No words match.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Whitelist ─────────────────────────────────────────────────── */}
      {activeTab === "whitelist" && (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">
            Words on this list are always allowed, even if they appear in the blocked list.
            Pre-populated with common fitness/gym terms ({BUILTIN_WHITELIST_WORDS.length} built-in entries).
          </p>

          <div className="flex gap-2">
            <input
              value={newWhitelist}
              onChange={(e) => setNewWhitelist(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWord("whitelist_words", newWhitelist, setCustomWhitelist, setNewWhitelist)}
              placeholder="Add word or phrase to allow…"
              className="flex-1 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400/40"
            />
            <button
              onClick={() => addWord("whitelist_words", newWhitelist, setCustomWhitelist, setNewWhitelist)}
              disabled={savingWordId === "add-whitelist_words"}
              className="px-4 py-2 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <input
            value={whitelistSearch}
            onChange={(e) => setWhitelistSearch(e.target.value)}
            placeholder="Search whitelist…"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
          />

          {whitelistLoading ? (
            <p className="text-neutral-500 text-sm">Loading…</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-neutral-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Word / Phrase</th>
                    <th className="px-4 py-2 text-left">Source</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredWhitelist.map((w) => {
                    const isBuiltin = BUILTIN_WHITELIST_WORDS.includes(w);
                    return (
                      <tr key={w} className="hover:bg-white/3">
                        <td className="px-4 py-2 font-mono text-xs text-emerald-300">{w}</td>
                        <td className="px-4 py-2 text-xs text-neutral-500">{isBuiltin ? "built-in" : "custom"}</td>
                        <td className="px-4 py-2 text-right">
                          {!isBuiltin && (
                            <button
                              onClick={() => removeWord("whitelist_words", w, setCustomWhitelist)}
                              disabled={savingWordId === `rm-${w}`}
                              className="text-xs text-neutral-500 hover:text-rose-400 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredWhitelist.length === 0 && (
                <p className="text-center py-6 text-neutral-500 text-sm">No words match.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Moderation Log ────────────────────────────────────────────── */}
      {activeTab === "log" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={logTypeFilter}
              onChange={(e) => setLogTypeFilter(e.target.value)}
              className="rounded-md bg-neutral-800 border border-white/10 px-3 py-2 text-sm outline-none"
            >
              <option value="">All types</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="bio">Profile Bio</option>
              <option value="username">Username</option>
              <option value="dm">Direct Message</option>
              <option value="image">Images</option>
            </select>
            <button
              onClick={fetchLog}
              className="px-3 py-2 rounded-md bg-white/5 text-neutral-300 hover:bg-white/10 text-sm"
            >
              Refresh
            </button>
          </div>

          {logLoading ? (
            <p className="text-neutral-500 text-sm">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center py-10">No moderation events found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-neutral-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Excerpt</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-white/3">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{l.user_name}</div>
                        {l.user_username && (
                          <div className="text-xs text-neutral-500">@{l.user_username}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-neutral-300">
                          {l.content_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 max-w-xs truncate">
                        {l.excerpt ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-rose-400">{l.reason}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {new Date(l.created_at).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.user_id && (
                          <button
                            onClick={() => resetStrikes(l.user_id!)}
                            className="text-xs text-neutral-500 hover:text-amber-400"
                          >
                            Reset strikes
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
