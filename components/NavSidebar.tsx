"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function NavSidebar({ role }: { role?: string | null }) {
  const [open, setOpen] = useState(false);
  const isAdmin = role === "admin" || role === "super_admin";

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Prevent body scroll while sidebar is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-md hover:bg-white/10 transition shrink-0"
      >
        <span className="block w-5 h-0.5 bg-neutral-300 rounded-full" />
        <span className="block w-5 h-0.5 bg-neutral-300 rounded-full" />
        <span className="block w-5 h-0.5 bg-neutral-300 rounded-full" />
      </button>

      {/* Backdrop — only mounted when open so it never intercepts touches when closed */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel
          - pointer-events-none when closed so no touch input leaks through off-screen
          - w-full on mobile, fixed 300px on sm+
          - z-[51] so it sits above the backdrop */}
      <div
        className={`fixed top-0 right-0 z-[51] h-full w-full sm:w-[300px] bg-neutral-900 border-l border-white/10
          flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"}`}
        aria-modal={open}
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <span className="font-semibold tracking-wide text-base">SONCAR</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="w-9 h-9 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          <NavLink href="/#shop" onClick={() => setOpen(false)}>
            <span className="text-lg">🛒</span> Shop
          </NavLink>
          <NavLink href="/community" onClick={() => setOpen(false)}>
            <span className="text-lg">💬</span> Community
          </NavLink>
          <NavLink href="/account" onClick={() => setOpen(false)}>
            <span className="text-lg">👤</span> My Account
          </NavLink>
          <NavLink href="/account/rewards" onClick={() => setOpen(false)}>
            <span className="text-lg">🏅</span> Rewards
          </NavLink>
          <NavLink href="/policies" onClick={() => setOpen(false)}>
            <span className="text-lg">📋</span> Policies
          </NavLink>
          {isAdmin && (
            <>
              <div className="my-3 border-t border-white/10" />
              <NavLink href="/admin" onClick={() => setOpen(false)}>
                <span className="text-lg">{role === "super_admin" ? "👑" : "🛡️"}</span> Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 text-xs text-neutral-500">
          © {new Date().getFullYear()} SONCAR Limited
        </div>
      </div>
    </>
  );
}

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base text-neutral-200 hover:text-white hover:bg-white/10 transition"
    >
      {children}
    </Link>
  );
}
