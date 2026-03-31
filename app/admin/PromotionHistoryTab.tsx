"use client";

import { useState, useEffect } from "react";
import { getTierColor } from "@/lib/loyalty";

type PromotionLog = {
  id: string;
  member_id: string;
  previous_tier: string;
  new_tier: string;
  promoted_by: string;
  note: string | null;
  created_at: string;
  member_name: string;
  member_username: string | null;
  member_member_id: number | null;
  promoter_name: string;
};

function fmtMemberId(id: number | null) {
  return id != null ? String(id).padStart(11, "0") : "—";
}

export default function PromotionHistoryTab() {
  const [logs, setLogs] = useState<PromotionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/admin/members/tier/history")
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter
    ? logs.filter((l) =>
        l.member_name.toLowerCase().includes(filter.toLowerCase()) ||
        (l.member_username ?? "").toLowerCase().includes(filter.toLowerCase()) ||
        fmtMemberId(l.member_member_id).includes(filter)
      )
    : logs;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Promotion History</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search member…"
          className="ml-auto rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-white/30 w-56"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-neutral-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-neutral-500 text-sm">No promotions recorded yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-xs text-neutral-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">From Tier</th>
                <th className="px-4 py-3 text-left">To Tier</th>
                <th className="px-4 py-3 text-left">Promoted By</th>
                <th className="px-4 py-3 text-left">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-white/3 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{l.member_name}</div>
                    {l.member_username && (
                      <div className="text-xs text-neutral-500">@{l.member_username}</div>
                    )}
                    <div className="text-xs text-neutral-600 font-mono">
                      {fmtMemberId(l.member_member_id)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${getTierColor(l.previous_tier)}`}>
                      {l.previous_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${getTierColor(l.new_tier)}`}>
                      {l.new_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{l.promoter_name}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(l.created_at).toLocaleString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
