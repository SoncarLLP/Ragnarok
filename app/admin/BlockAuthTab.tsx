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
      <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <h3 className="text-sm font-semibold mb-4">Grant new block authorisation</h3>
        <p className="text-xs mb-4" style={{ color: "var(--nrs-text-muted)" }}>
          Allow a specific member to block a specific admin. This should only be granted in
          exceptional circumstances where it has been deemed reasonable.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--nrs-text-muted)" }}>Member</label>
            <select
              value={formMemberId}
              onChange={(e) => setFormMemberId(e.target.value)}
              className="nrs-select w-full"
            >
              <option value="">— Select member —</option>
              {members.filter(m => m.role === "member").map((m) => (
                <option key={m.id} value={m.id}>{memberLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--nrs-text-muted)" }}>Admin to be blocked</label>
            <select
              value={formAdminId}
              onChange={(e) => setFormAdminId(e.target.value)}
              className="nrs-select w-full"
            >
              <option value="">— Select admin —</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>{memberLabel(a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--nrs-text-muted)" }}>Reason (optional)</label>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Brief justification for this authorisation"
              className="nrs-input w-full"
            />
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button
            onClick={handleGrant}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
            style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}
          >
            {saving ? "Granting…" : "Grant Authorisation"}
          </button>
        </div>
      </div>

      {/* Active authorisations */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Active authorisations ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No active block authorisations.</p>
        ) : (
          <div className="space-y-2">
            {active.map((a) => (
              <div
                key={a.id}
                className="rounded-lg px-4 py-3 flex items-start justify-between gap-4"
                style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
              >
                <div className="text-sm space-y-0.5 min-w-0">
                  <div>
                    <span style={{ color: "var(--nrs-text-muted)" }}>Member: </span>
                    <span className="font-medium" style={{ color: "var(--nrs-text)" }}>{a.member_name}</span>
                    {a.member_username && <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}> @{a.member_username}</span>}
                  </div>
                  <div>
                    <span style={{ color: "var(--nrs-text-muted)" }}>Can block: </span>
                    <span className="font-medium" style={{ color: "var(--nrs-text)" }}>{a.blocked_admin_name}</span>
                    {a.blocked_admin_username && <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}> @{a.blocked_admin_username}</span>}
                  </div>
                  <div>
                    <span style={{ color: "var(--nrs-text-muted)" }}>Approved by: </span>
                    <span style={{ color: "var(--nrs-text-body)" }}>{a.super_admin_name}</span>
                  </div>
                  {a.reason && (
                    <div className="text-xs italic" style={{ color: "var(--nrs-text-muted)" }}>{a.reason}</div>
                  )}
                  <div className="text-xs" style={{ color: "var(--nrs-text-muted)", opacity: 0.7 }}>
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
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--nrs-text-muted)" }}>Revoked ({revoked.length})</h3>
          <div className="space-y-2">
            {revoked.map((a) => (
              <div
                key={a.id}
                className="rounded-lg px-4 py-3 opacity-60 text-sm"
                style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-panel)" }}
              >
                <span style={{ color: "var(--nrs-text-muted)" }}>{a.member_name}</span>
                {" → "}
                <span style={{ color: "var(--nrs-text-muted)" }}>{a.blocked_admin_name}</span>
                <span className="ml-2 text-xs text-rose-500">Revoked</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
