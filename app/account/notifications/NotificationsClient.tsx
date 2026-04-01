"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";

export type NotifItem = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  admin_notice: boolean;
  archived: boolean;
};

type Tab = "unread" | "all" | "archived";

function getNotificationIcon(type: string): string {
  switch (type) {
    case "reaction_post":
    case "reaction_comment":
      return "❤️";
    case "reaction_milestone":
      return "🏅";
    case "mention_post":
    case "mention_comment":
      return "💬";
    case "comment_on_post":
      return "🗨️";
    case "new_follower":
      return "👤";
    case "follow_request":
      return "🔔";
    case "follow_approved":
      return "✅";
    case "warning":
      return "⚠️";
    case "banned":
      return "🚫";
    case "suspended":
      return "⏸️";
    case "flagged_content":
      return "🚩";
    default:
      return "🔔";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "reaction_post":      return "Reaction";
    case "reaction_comment":   return "Reaction";
    case "reaction_milestone": return "Milestone";
    case "mention_post":       return "Mention";
    case "mention_comment":    return "Mention";
    case "comment_on_post":    return "Comment";
    case "new_follower":       return "Follower";
    case "follow_request":     return "Follow Request";
    case "follow_approved":    return "Follow Approved";
    case "warning":            return "Warning";
    case "banned":             return "Account Banned";
    case "suspended":          return "Account Suspended";
    case "flagged_content":    return "Flagged Content";
    default:                   return "Notification";
  }
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? "s" : ""} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? "s" : ""} ago`;
  if (diff < 172800) return "yesterday";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NotificationsClient({
  initialAll,
  initialArchived,
}: {
  initialAll: NotifItem[];
  initialArchived: NotifItem[];
}) {
  const [tab, setTab] = useState<Tab>("unread");
  const [allNotifs, setAllNotifs] = useState<NotifItem[]>(initialAll);
  const [archivedNotifs, setArchivedNotifs] = useState<NotifItem[]>(initialArchived);
  const [isPending, startTransition] = useTransition();
  const [markingAll, setMarkingAll] = useState(false);

  const unreadNotifs = allNotifs.filter((n) => !n.read_at);
  const displayed =
    tab === "unread"   ? unreadNotifs :
    tab === "archived" ? archivedNotifs :
    allNotifs;

  // ── Actions ──────────────────────────────────────────────────

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    await fetch("/api/notifications/mark-all-read", { method: "PATCH" });
    const now = new Date().toISOString();
    setAllNotifs((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? now }))
    );
    setMarkingAll(false);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    startTransition(async () => {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      const now = new Date().toISOString();
      setAllNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
      );
    });
  }, []);

  const handleArchive = useCallback((id: string) => {
    startTransition(async () => {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      const now = new Date().toISOString();
      const notif = allNotifs.find((n) => n.id === id);
      if (notif) {
        setArchivedNotifs((prev) => [
          { ...notif, archived: true, read_at: notif.read_at ?? now },
          ...prev,
        ]);
      }
      setAllNotifs((prev) => prev.filter((n) => n.id !== id));
    });
  }, [allNotifs]);

  const handleUnarchive = useCallback((id: string) => {
    startTransition(async () => {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      const notif = archivedNotifs.find((n) => n.id === id);
      if (notif) {
        setAllNotifs((prev) => [{ ...notif, archived: false }, ...prev]);
      }
      setArchivedNotifs((prev) => prev.filter((n) => n.id !== id));
    });
  }, [archivedNotifs]);

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setAllNotifs((prev) => prev.filter((n) => n.id !== id));
      setArchivedNotifs((prev) => prev.filter((n) => n.id !== id));
    });
  }, []);

  // ── Render ───────────────────────────────────────────────────

  const unreadCount = unreadNotifs.length;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Notifications</h1>
          <p className="text-sm text-neutral-400">
            Mentions, reactions, follows, and official notices
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="shrink-0 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors disabled:opacity-50"
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--nrs-border-subtle)" }}>
        {(["unread", "all", "archived"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px"
            style={
              tab === t
                ? { borderColor: "var(--nrs-accent)", color: "var(--nrs-accent)" }
                : { borderColor: "transparent", color: "var(--nrs-text-muted)" }
            }
          >
            {t}
            {t === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-2">
          {displayed.map((notif) => (
            <NotifCard
              key={notif.id}
              notif={notif}
              isPending={isPending}
              onDismiss={handleDismiss}
              onArchive={tab === "archived" ? handleUnarchive : handleArchive}
              archiveLabel={tab === "archived" ? "Unarchive" : "Archive"}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { emoji: string; title: string; body: string }> = {
    unread: {
      emoji: "✅",
      title: "You're all caught up!",
      body: "No unread notifications right now.",
    },
    all: {
      emoji: "🔔",
      title: "No notifications yet",
      body: "Activity from the community will appear here.",
    },
    archived: {
      emoji: "📁",
      title: "Archive is empty",
      body: "Notifications you archive will be stored here.",
    },
  };
  const { emoji, title, body } = messages[tab];
  return (
    <div className="rounded-xl p-12 text-center" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border-subtle)" }}>
      <span className="text-4xl">{emoji}</span>
      <p className="mt-3 font-medium" style={{ color: "var(--nrs-text)" }}>{title}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--nrs-text-muted)" }}>{body}</p>
    </div>
  );
}

// ── Individual notification card ───────────────────────────────────

function NotifCard({
  notif,
  isPending,
  onDismiss,
  onArchive,
  archiveLabel,
  onDelete,
}: {
  notif: NotifItem;
  isPending: boolean;
  onDismiss: (id: string) => void;
  onArchive: (id: string) => void;
  archiveLabel: string;
  onDelete: (id: string) => void;
}) {
  const isUnread = !notif.read_at;
  const isAdminNotice = notif.admin_notice;
  const canManage = !isAdminNotice;

  const card = (
    <div
      className={`rounded-xl border p-5 transition-opacity ${isPending ? "opacity-75" : "opacity-100"}`}
      style={
        isAdminNotice
          ? { borderColor: "rgba(244,63,94,0.4)", background: "rgba(244,63,94,0.05)" }
          : isUnread
          ? { borderColor: "var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }
          : { borderColor: "var(--nrs-border-subtle)", background: "var(--nrs-card)" }
      }
    >
      {/* Top row: icon + badge + timestamp */}
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5 select-none">
          {getNotificationIcon(notif.type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isAdminNotice ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 font-semibold">
                Official Notice
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 font-medium">
                {getTypeLabel(notif.type)}
              </span>
            )}
            {isUnread && !isAdminNotice && (
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                New
              </span>
            )}
          </div>
          <p
            className={`text-sm leading-relaxed ${isUnread ? "font-medium" : ""}`}
            style={{
              color: isAdminNotice ? "var(--nrs-text)" : isUnread ? "var(--nrs-text)" : "var(--nrs-text-body)",
            }}
          >
            {notif.message}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--nrs-text-muted)" }}>
            {timeAgo(notif.created_at)}
          </p>
        </div>
        <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
          {new Date(notif.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      {/* Actions row */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {notif.link && (
          <Link
            href={notif.link}
            onClick={() => isUnread && !isAdminNotice && onDismiss(notif.id)}
            className="text-xs font-medium hover:underline transition-colors"
            style={{ color: "var(--nrs-accent)" }}
          >
            View →
          </Link>
        )}
        {canManage && isUnread && (
          <button
            onClick={() => onDismiss(notif.id)}
            disabled={isPending}
            className="text-xs transition-colors"
            style={{ color: "var(--nrs-text-muted)" }}
          >
            Dismiss
          </button>
        )}
        {canManage && (
          <button
            onClick={() => onArchive(notif.id)}
            disabled={isPending}
            className="text-xs transition-colors"
            style={{ color: "var(--nrs-text-muted)" }}
          >
            {archiveLabel}
          </button>
        )}
        {canManage && (
          <button
            onClick={() => onDelete(notif.id)}
            disabled={isPending}
            className="text-xs transition-colors ml-auto"
            style={{ color: "var(--nrs-text-muted)" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return card;
}
