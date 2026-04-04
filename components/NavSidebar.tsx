"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MemberBadge from "./MemberBadge";
import PWAInstallButton from "./PWAInstallButton";

export default function NavSidebar({
  role,
  tier,
  displayName,
  unreadCount = 0,
  unreadMessages = 0,
}: {
  role?: string | null;
  tier?: string | null;
  displayName?: string | null;
  unreadCount?: number;
  unreadMessages?: number;
}) {
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin" || role === "super_admin";
  const isSignedIn = !!(displayName || role || tier);
  const notifBadge = unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : null;
  const msgBadge = unreadMessages > 0 ? (unreadMessages > 99 ? "99+" : unreadMessages) : null;

  // Lock body scroll and prevent horizontal overflow when open
  useEffect(() => {
    const html = document.documentElement;
    if (open) {
      html.style.overflowX = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      html.style.overflowX = "";
      document.body.style.overflow = "";
    }
    return () => {
      html.style.overflowX = "";
      document.body.style.overflow = "";
    };
  }, [open]);

  // Always keep overflowX hidden on html to prevent translated panel bleeding
  useEffect(() => {
    document.documentElement.style.overflowX = "hidden";
    return () => {
      document.documentElement.style.overflowX = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function close() {
    setOpen(false);
  }

  return (
    <>
      {/* ── Hamburger trigger ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded-md hover:bg-white/10 transition shrink-0"
      >
        <span className="block w-5 h-0.5 bg-neutral-300 rounded-full" />
        <span className="block w-5 h-0.5 bg-neutral-300 rounded-full" />
        <span className="block w-5 h-0.5 bg-neutral-300 rounded-full" />
      </button>

      {/* ── Backdrop — only mounted when open ── */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-neutral-950/70 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ── */}
      <div
        style={{
          visibility: open ? "visible" : "hidden",
          pointerEvents: open ? "auto" : "none",
          background: "var(--nrs-bg-2)",
          borderLeft: "1px solid var(--nrs-border)",
          color: "var(--nrs-text-body)",
        }}
        className={`
          fixed top-0 right-0 z-[101]
          h-[100dvh]
          w-[85vw] sm:w-[300px]
          flex flex-col
          shadow-2xl
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: "1px solid var(--nrs-border)" }}>
          <Link
            href="/"
            onClick={close}
            className="font-semibold tracking-wide text-base"
            style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}
          >
            Ragnarök
          </Link>
          <button
            onClick={close}
            aria-label="Close navigation menu"
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 transition"
            style={{ color: "var(--nrs-text-muted)" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              stroke="currentColor"
              strokeWidth={2}
              fill="none"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Signed-in member strip */}
        {isSignedIn && (
          <div className="px-5 py-3 flex items-center gap-2 shrink-0" style={{ borderBottom: "1px solid var(--nrs-border)", background: "var(--nrs-accent-dim)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)" }}>
              {displayName ? displayName.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              {displayName && (
                <span className="text-sm font-medium truncate leading-tight" style={{ color: "var(--nrs-text)" }}>
                  {displayName}
                </span>
              )}
              <MemberBadge role={role} tier={tier} />
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <SidebarLink href="/search" onClick={close} emoji="🔍" label="Search" />
          <SidebarLink href="/#shop" onClick={close} emoji="🛒" label="Shop" />
          <SidebarLink
            href="/community"
            onClick={close}
            emoji="💬"
            label="Community"
          />
          <SidebarLink
            href="/account"
            onClick={close}
            emoji="👤"
            label="My Account"
          />
          <SidebarLink
            href="/account/rewards"
            onClick={close}
            emoji="🏅"
            label="Rewards"
          />
          {isSignedIn && (
            <SidebarLink
              href="/fitness"
              onClick={close}
              emoji="⚔️"
              label="Fitness Tracker"
            />
          )}
          {isSignedIn && (
            <SidebarLink
              href="/nutrition"
              onClick={close}
              emoji="🥗"
              label="Nutrition Tracker"
            />
          )}
          {/* Notifications with unread badge */}
          <Link
            href="/account/notifications"
            onClick={close}
            className="nrs-nav-link flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-medium hover:bg-white/10 active:bg-white/15 transition"
          >
            <span className="text-xl w-7 shrink-0 text-center">🔔</span>
            <span className="flex-1">Notifications</span>
            {notifBadge !== null && (
              <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                {notifBadge}
              </span>
            )}
          </Link>
          <SidebarLink
            href="/policies"
            onClick={close}
            emoji="📋"
            label="Policies"
          />
          {/* PWA install button — hides itself if already installed */}
          <div className="my-1" style={{ borderTop: "1px solid var(--nrs-border)" }} />
          <PWAInstallButton onAction={close} />
          {isAdmin && (
            <>
              <div className="my-3" style={{ borderTop: "1px solid var(--nrs-border)" }} />
              {/* Messages link with unread badge */}
              <Link
                href="/messages"
                onClick={close}
                className="nrs-nav-link flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-medium hover:bg-white/10 active:bg-white/15 transition"
              >
                <span className="text-xl w-7 shrink-0 text-center">💬</span>
                <span className="flex-1">Messages</span>
                {msgBadge !== null && (
                  <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                    {msgBadge}
                  </span>
                )}
              </Link>
              <SidebarLink
                href="/admin"
                onClick={close}
                emoji={role === "super_admin" ? "👑" : "🛡️"}
                label="Admin Panel"
              />
              {role === "super_admin" && (
                <SidebarLink
                  href="/site-management"
                  onClick={close}
                  emoji="⚙️"
                  label="Site Management"
                />
              )}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 text-xs" style={{ borderTop: "1px solid var(--nrs-border)", color: "var(--nrs-text-muted)" }}>
          © {new Date().getFullYear()} SONCAR Limited
        </div>
      </div>
    </>
  );
}

function SidebarLink({
  href,
  onClick,
  emoji,
  label,
}: {
  href: string;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="nrs-nav-link flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-medium hover:bg-white/10 active:bg-white/15 transition"
    >
      <span className="text-xl w-7 shrink-0 text-center">{emoji}</span>
      {label}
    </Link>
  );
}
