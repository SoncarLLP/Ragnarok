"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function NavSidebar({ role }: { role?: string | null }) {
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin" || role === "super_admin";

  // Lock body scroll and prevent horizontal overflow when open
  useEffect(() => {
    const html = document.documentElement;
    if (open) {
      // Prevent the off-screen panel from causing horizontal scroll
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
    return () => { document.documentElement.style.overflowX = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function close() { setOpen(false); }

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

      {/* ── Sidebar panel ──
          - position: fixed, top: 0, height: 100vh — never affects document flow
          - z-[101] — always above backdrop and all page content
          - visibility: hidden when closed so it is completely inert (no touch bleed, no scroll width contribution)
          - 85vw on mobile, 300px on sm+
          - overflow-y: auto inside nav so content scrolls on short screens
      ── */}
      <div
        style={{ visibility: open ? "visible" : "hidden" }}
        className={`
          fixed top-0 right-0 z-[101]
          h-[100dvh]
          w-[85vw] sm:w-[300px]
          bg-neutral-900 border-l border-white/10
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
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <Link href="/" onClick={close} className="font-semibold tracking-wide text-base">
            SONCAR
          </Link>
          <button
            onClick={close}
            aria-label="Close navigation menu"
            className="w-9 h-9 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth={2} fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links — overflow-y: auto so short screens can scroll */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <SidebarLink href="/#shop" onClick={close} emoji="🛒" label="Shop" />
          <SidebarLink href="/community" onClick={close} emoji="💬" label="Community" />
          <SidebarLink href="/account" onClick={close} emoji="👤" label="My Account" />
          <SidebarLink href="/account/rewards" onClick={close} emoji="🏅" label="Rewards" />
          <SidebarLink href="/policies" onClick={close} emoji="📋" label="Policies" />
          {isAdmin && (
            <>
              <div className="my-3 border-t border-white/10" />
              <SidebarLink
                href="/admin"
                onClick={close}
                emoji={role === "super_admin" ? "👑" : "🛡️"}
                label="Admin Panel"
              />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/10 text-xs text-neutral-500">
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
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-medium text-neutral-200 hover:text-white hover:bg-white/10 active:bg-white/15 transition"
    >
      <span className="text-xl w-7 shrink-0 text-center">{emoji}</span>
      {label}
    </Link>
  );
}
