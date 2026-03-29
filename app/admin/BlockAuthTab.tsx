"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type BlockAuthRecord = {
  id: string;
  member_name: string;
  member_username: string | null;
  blocked_admin_name: string;
  blocked_admin_username: string | null;
  super_admin_name: string;
  reason: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type MemberOption = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
};

export default function BlockAuthTab({
  auths,
  members,
  admins,
}: {
  auths: BlockAuthRecord[];
  members: MemberOption[];
  admins: MemberOption[];
}) {
  const [formMemberId, setFormMemberId] = useState("");
  const [formAdminId, setFormAdminId] = useState("");
  const [formReason, setFormReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleGrant() {
    if (!formMemberId || !formAdminId) {
      setError("Please select both a member and an admin.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/block-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: formMemberId, blocked_admin_id: formAdminId, reason: formReason }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to grant authorisation");
    } else {
      setFormMemberId("");
      setFormAdminId("");
      setFormReason("");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    await fetch("/api/admin/block-auth", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRevoking(null);
    router.refresh();
  }

  function memberLabel(m: MemberOption) {
    return m.full_name ? `${m.full_name}${m.username ? ` (@${m.username})` : ""}` : m.username ?? m.id;
  }

  const active = auths.filter((a) => !a.revoked_at);
  const revoked = auths.filter((a) => a.revoked_at);

  return (
    <div className="space-y-8">
      {/* Grant new authorisation */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold mb-4">Grant new block authorisation</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Allow a specific member to block a specific admin. This should only be granted in
          exceptional circumstances where it has been deemed reasonable.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Member</label>
            <select
              value={formMemberId}
              onChange={(e) => setFormMemberId(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
            >
              <option value="">— Select member —</option>
              {members.filter(m => m.role === "member").map((m) => (
                <option key={m.id} value={m.id}>{memberLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Admin to be blocked</label>
            <select
              value={formAdminId}
              onChange={(e) => setFormAdminId(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
            >
              <option value="">— Select admin —</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>{memberLabel(a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Brief justification for this authorisation"
              className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button
            onClick={handleGrant}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-sm transition disabled:opacity-50"
          >
            {saving ? "Granting…" : "Grant Authorisation"}
          </button>
        </div>
      </div>

      {/* Active authorisations */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Active authorisations ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-sm text-neutral-500">No active block authorisations.</p>
        ) : (
          <div className="space-y-2">
            {active.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 flex items-start justify-between gap-4"
              >
                <div className="text-sm space-y-0.5 min-w-0">
                  <div>
                    <span className="text-neutral-400">Member: </span>
                    <span className="font-medium">{a.member_name}</span>
                    {a.member_username && <span className="text-neutral-500 text-xs"> @{a.member_username}</span>}
                  </div>
                  <div>
                    <span className="text-neutral-400">Can block: </span>
                    <span className="font-medium">{a.blocked_admin_name}</span>
                    {a.blocked_admin_username && <span className="text-neutral-500 text-xs"> @{a.blocked_admin_username}</span>}
                  </div>
                  <div>
                    <span className="text-neutral-400">Approved by: </span>
                    <span>{a.super_admin_name}</span>
                  </div>
                  {a.reason && (
                    <div className="text-xs text-neutral-500 italic">{a.reason}</div>
                  )}
                  <div className="text-xs text-neutral-600">
                    {new Date(a.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(a.id)}
                  disabled={revoking === a.id}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition disabled:opacity-50"
                >
                  {revoking === a.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoked authorisations */}
      {revoked.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-500 mb-3">Revoked ({revoked.length})</h3>
          <div className="space-y-2">
            {revoked.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-white/5 bg-white/2 px-4 py-3 opacity-60 text-sm"
              >
                <span className="text-neutral-400">{a.member_name}</span>
                {" → "}
                <span className="text-neutral-400">{a.blocked_admin_name}</span>
                <span className="ml-2 text-xs text-rose-500">Revoked</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
