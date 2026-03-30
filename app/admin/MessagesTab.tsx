"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ConversationReport = {
  id: string;
  conversation_id: string;
  conversation_type: string;
  conversation_name: string | null;
  reported_by_name: string;
  reason: string;
  status: "pending" | "resolved";
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
};

type AuditEntry = {
  id: string;
  message_id: string;
  conversation_id: string | null;
  original_content: string | null;
  new_content: string | null;
  action: "edit" | "delete";
  performed_by_name: string;
  performed_at: string;
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesTab() {
  const [activeSection, setActiveSection] = useState<"reports" | "audit">("reports");
  const [reports, setReports] = useState<ConversationReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<"" | "edit" | "delete">("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/messages/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []))
      .finally(() => setReportsLoading(false));
  }, []);

  useEffect(() => {
    if (activeSection !== "audit") return;
    setAuditLoading(true);
    const url = auditFilter
      ? `/api/admin/messages/audit-log?action=${auditFilter}`
      : "/api/admin/messages/audit-log";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setAuditLogs(d.logs ?? []))
      .finally(() => setAuditLoading(false));
  }, [activeSection, auditFilter]);

  async function handleResolve(reportId: string, action: "resolve" | "delete_conversation") {
    if (action === "delete_conversation") {
      if (!confirm("Delete this conversation and all its messages? This cannot be undone.")) return;
    }
    setResolvingId(reportId);
    const res = await fetch(`/api/admin/messages/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setResolvingId(null);
    if (res.ok) {
      if (data.deleted) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: "resolved" } : r
          )
        );
      }
    }
  }

  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  return (
    <div className="space-y-6">
      {/* Section nav */}
      <div className="flex gap-1 border-b border-white/10 pb-1">
        <button
          onClick={() => setActiveSection("reports")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t transition ${activeSection === "reports" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
        >
          Reported Conversations
          {pendingReports.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-rose-500/30 text-rose-300">
              {pendingReports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSection("audit")}
          className={`px-4 py-2 text-sm rounded-t transition ${activeSection === "audit" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
        >
          Message Audit Log
        </button>
      </div>

      {/* ── Reports ── */}
      {activeSection === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-300">
              {pendingReports.length > 0
                ? `${pendingReports.length} pending report${pendingReports.length > 1 ? "s" : ""}`
                : "No pending reports"}
            </h3>
            <Link
              href="/messages"
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              Open Messages →
            </Link>
          </div>

          {reportsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">No conversation reports yet.</p>
          ) : (
            <div className="space-y-3">
              {/* Pending first */}
              {pendingReports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium">
                          Pending
                        </span>
                        <span className="text-xs text-neutral-500">
                          {r.conversation_type === "group"
                            ? `Group: ${r.conversation_name ?? "Unnamed"}`
                            : "Direct Message"}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-200">
                        <span className="text-neutral-400">Reported by</span> {r.reported_by_name}
                      </p>
                      <p className="text-sm text-neutral-300 mt-1 italic">&ldquo;{r.reason}&rdquo;</p>
                      <p className="text-xs text-neutral-600 mt-1">{formatDate(r.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/messages?conversation=${r.conversation_id}`}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/15 transition"
                    >
                      Review Conversation →
                    </Link>
                    <button
                      onClick={() => handleResolve(r.id, "resolve")}
                      disabled={resolvingId === r.id}
                      className="px-3 py-1.5 text-xs rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition disabled:opacity-40"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, "delete_conversation")}
                      disabled={resolvingId === r.id}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition disabled:opacity-40"
                    >
                      Delete Conversation
                    </button>
                  </div>
                </div>
              ))}

              {/* Resolved */}
              {resolvedReports.length > 0 && (
                <>
                  <p className="text-xs text-neutral-600 font-medium pt-2">
                    Resolved ({resolvedReports.length})
                  </p>
                  {resolvedReports.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-white/8 bg-white/3 p-3 flex items-center justify-between gap-3 opacity-60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-400">
                            Resolved
                          </span>
                          <span className="text-xs text-neutral-500">
                            {r.conversation_type === "group"
                              ? `Group: ${r.conversation_name ?? "Unnamed"}`
                              : "Direct Message"}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          Reported by {r.reported_by_name} · {formatDate(r.created_at)}
                        </p>
                        <p className="text-xs text-neutral-600 italic mt-0.5">&ldquo;{r.reason}&rdquo;</p>
                      </div>
                      {r.resolved_at && (
                        <p className="text-xs text-neutral-600 shrink-0">
                          Resolved {formatDate(r.resolved_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Log ── */}
      {activeSection === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-neutral-300 flex-1">Message Audit Log</h3>
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
              {(["", "edit", "delete"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setAuditFilter(f)}
                  className={`px-3 py-1 text-xs rounded-md transition ${auditFilter === f ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"}`}
                >
                  {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
                </button>
              ))}
            </div>
          </div>

          {auditLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">No audit log entries yet.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          entry.action === "edit"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {entry.action === "edit" ? "Edited" : "Deleted"}
                      </span>
                      <span className="text-xs text-neutral-500">by {entry.performed_by_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs text-neutral-600">{formatDate(entry.performed_at)}</p>
                      {entry.conversation_id && (
                        <Link
                          href={`/messages?conversation=${entry.conversation_id}`}
                          className="text-xs text-neutral-400 hover:text-white transition"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>

                  {entry.original_content && (
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-500 font-medium">Original:</p>
                      <p className="text-xs text-neutral-400 bg-white/5 rounded px-2 py-1.5 whitespace-pre-wrap break-words">
                        {entry.original_content}
                      </p>
                    </div>
                  )}

                  {entry.action === "edit" && entry.new_content && (
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-500 font-medium">Edited to:</p>
                      <p className="text-xs text-neutral-300 bg-white/5 rounded px-2 py-1.5 whitespace-pre-wrap break-words">
                        {entry.new_content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
