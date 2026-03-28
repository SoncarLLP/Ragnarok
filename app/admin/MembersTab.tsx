"use client";

import { useState } from "react";
import type { MemberRecord } from "./AdminTabs";

function fmtMemberId(id: number | null) {
  return id != null ? String(id).padStart(11, "0") : "—";
}

export default function MembersTab({
  members,
  currentUserRole,
}: {
  members: MemberRecord[];
  currentUserRole: "admin" | "super_admin";
}) {
  const [list, setList] = useState(members);
  const [filter, setFilter] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [warnModal, setWarnModal] = useState<{ userId: string; name: string } | null>(null);
  const [warnMsg, setWarnMsg] = useState("");
  const [warnLoading, setWarnLoading] = useState(false);
  const [warnError, setWarnError] = useState("");

  const filtered = list.filter((m) => {
    const q = filter.toLowerCase();
    return (
      m.email.toLowerCase().includes(q) ||
      (m.full_name?.toLowerCase() ?? "").includes(q) ||
      (m.username?.toLowerCase() ?? "").includes(q) ||
      fmtMemberId(m.member_id).includes(q)
    );
  });

  async function changeRole(userId: string, role: string) {
    setLoadingId(userId);
    await fetch("/api/admin/members/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setList((prev) =>
      prev.map((m) => m.id === userId ? { ...m, role: role as MemberRecord["role"] } : m)
    );
    setLoadingId(null);
  }

  async function banToggle(userId: string, action: "ban" | "unban") {
    setLoadingId(userId);
    await fetch("/api/admin/members/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setList((prev) =>
      prev.map((m) =>
        m.id === userId ? { ...m, status: action === "ban" ? "banned" : "active" } : m
      )
    );
    setLoadingId(null);
  }

  async function sendWarning() {
    if (!warnModal || !warnMsg.trim()) return;
    setWarnLoading(true);
    setWarnError("");
    const res = await fetch("/api/admin/members/warn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: warnModal.userId, message: warnMsg.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setWarnError(d.error ?? "Failed");
    } else {
      setWarnModal(null);
      setWarnMsg("");
    }
    setWarnLoading(false);
  }

  const roleColor = (role: string) =>
    role === "super_admin"
      ? "text-amber-300"
      : role === "admin"
      ? "text-emerald-400"
      : "text-neutral-400";

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Members ({list.length})</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search name, email, or ID…"
          className="ml-auto rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-white/30 w-56"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-white/10 text-xs text-neutral-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Member ID</th>
              <th className="px-4 py-3 text-left">Name / Username</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-white/3 transition">
                <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                  {fmtMemberId(m.member_id)}
                </td>
                <td className="px-4 py-3">
                  <div>{m.full_name || <span className="text-neutral-500">—</span>}</div>
                  {m.username && (
                    <div className="text-xs text-neutral-500">@{m.username}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-300 text-xs">{m.email}</td>
                <td className="px-4 py-3">
                  {currentUserRole === "super_admin" ? (
                    <select
                      value={m.role}
                      disabled={loadingId === m.id}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      className="bg-neutral-800 border border-white/10 rounded px-2 py-1 text-xs outline-none"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-medium ${roleColor(m.role)}`}>{m.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === "banned"
                        ? "bg-rose-500/20 text-rose-400"
                        : m.status === "suspended"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  {new Date(m.created_at).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {m.role !== "super_admin" && (
                      <>
                        <button
                          disabled={loadingId === m.id}
                          onClick={() =>
                            banToggle(m.id, m.status === "banned" ? "unban" : "ban")
                          }
                          className={`text-xs px-2 py-1 rounded transition disabled:opacity-50 ${
                            m.status === "banned"
                              ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                              : "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                          }`}
                        >
                          {loadingId === m.id
                            ? "…"
                            : m.status === "banned"
                            ? "Unban"
                            : "Ban"}
                        </button>
                        <button
                          onClick={() =>
                            setWarnModal({ userId: m.id, name: m.full_name || m.email })
                          }
                          className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition"
                        >
                          Warn
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-neutral-500 text-sm">No members found.</div>
        )}
      </div>

      {/* Warning modal */}
      {warnModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h3 className="font-semibold mb-1">Send Warning</h3>
            <p className="text-sm text-neutral-400 mb-4">
              To: <span className="text-white">{warnModal.name}</span>
            </p>
            <textarea
              value={warnMsg}
              onChange={(e) => setWarnMsg(e.target.value)}
              rows={4}
              placeholder="Write the warning message…"
              className="w-full rounded-md bg-neutral-800 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30 resize-none"
            />
            {warnError && <p className="text-rose-400 text-xs mt-2">{warnError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={sendWarning}
                disabled={warnLoading || !warnMsg.trim()}
                className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 text-sm transition"
              >
                {warnLoading ? "Sending…" : "Send Warning"}
              </button>
              <button
                onClick={() => { setWarnModal(null); setWarnMsg(""); setWarnError(""); }}
                className="px-4 py-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
