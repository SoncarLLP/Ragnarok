"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  admin_notice: boolean;
};

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

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationBell({
  userId,
  initialUnreadCount,
}: {
  userId: string;
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Real-time subscription — watches for new inserts for this user
  useEffect(() => {
    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setUnreadCount((prev) => prev + 1);
          // Subtle bell animation
          setAnimate(true);
          setTimeout(() => setAnimate(false), 800);
          // Prepend to open dropdown
          setNotifications((prev) =>
            [payload.new as Notification, ...prev].slice(0, 10)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Fetch top 10 notifications for the dropdown
  const fetchDropdown = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?tab=all&limit=10");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleToggle() {
    if (!open) fetchDropdown();
    setOpen((prev) => !prev);
  }

  async function handleNotifClick(notif: Notification) {
    if (!notif.read_at) {
      // Optimistic update
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      // Fire-and-forget
      fetch(`/api/notifications/${notif.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    }
    setOpen(false);
  }

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `${displayCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "Notifications"
        }
        className={`relative flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/10 transition-colors ${
          animate ? "animate-[wiggle_0.4s_ease-in-out_2]" : ""
        }`}
      >
        <svg
          className="w-5 h-5 text-neutral-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none select-none">
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-[200] overflow-hidden" style={{ background: "var(--nrs-card)", border: "1px solid var(--nrs-border)" }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--nrs-border-subtle)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--nrs-text)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                {displayCount} unread
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <p className="p-6 text-center text-sm text-neutral-500">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-500">
                You&apos;re all caught up!
              </p>
            ) : (
              notifications.map((notif) => (
                <NotifRow
                  key={notif.id}
                  notif={notif}
                  onClick={() => handleNotifClick(notif)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--nrs-border-subtle)" }}>
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: "var(--nrs-accent)" }}
            >
              See All Notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({
  notif,
  onClick,
}: {
  notif: Notification;
  onClick: () => void;
}) {
  const isUnread = !notif.read_at;
  const isAdminNotice = notif.admin_notice;

  const inner = (
    <>
      <span className="text-base shrink-0 mt-0.5 select-none">
        {getNotificationIcon(notif.type)}
      </span>
      <div className="flex-1 min-w-0">
        {isAdminNotice && (
          <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wide block mb-0.5">
            Official Notice
          </span>
        )}
        <p
          className={`text-sm leading-snug truncate ${isUnread ? "font-medium" : ""}`}
          style={{ color: isUnread ? "var(--nrs-text)" : "var(--nrs-text-muted)" }}
        >
          {notif.message}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
          {timeAgo(notif.created_at)}
        </p>
      </div>
      {isUnread && (
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-2" />
      )}
    </>
  );

  const className = `px-4 py-3 flex gap-3 items-start hover:bg-white/5 transition-colors ${
    isUnread ? "bg-white/[0.03]" : ""
  } ${isAdminNotice ? "border-l-2 border-l-rose-500" : ""}`;

  if (notif.link) {
    return (
      <Link href={notif.link} onClick={onClick} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`w-full text-left ${className}`}>
      {inner}
    </button>
  );
}
