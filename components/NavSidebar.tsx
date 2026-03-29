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
        <span className="block w-5 h-px bg-neutral-300" />
        <span className="block w-5 h-px bg-neutral-300" />
        <span className="block w-5 h-px bg-neutral-300" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-neutral-900 border-l border-white/10
          flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="font-semibold tracking-wide">SONCAR</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <NavLink href="/#shop" onClick={() => setOpen(false)}>
            🛒 Shop
          </NavLink>
          <NavLink href="/community" onClick={() => setOpen(false)}>
            💬 Community
          </NavLink>
          <NavLink href="/account" onClick={() => setOpen(false)}>
            👤 My Account
          </NavLink>
          <NavLink href="/account/rewards" onClick={() => setOpen(false)}>
            🏅 Rewards
          </NavLink>
          <NavLink href="/policies" onClick={() => setOpen(false)}>
            📋 Policies
          </NavLink>
          {isAdmin && (
            <NavLink href="/admin" onClick={() => setOpen(false)}>
              {role === "super_admin" ? "👑" : "🛡️"} Admin Panel
            </NavLink>
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 text-xs text-neutral-500">
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
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-300
        hover:text-white hover:bg-white/8 transition"
    >
      {children}
    </Link>
  );
}
