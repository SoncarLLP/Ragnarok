"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Circular profile icon button for the site header.
 *
 * - Signed-out users  → plain link to /auth/login
 * - Signed-in users   → tapping opens a small dropdown with:
 *     • My Account  → /account
 *     • Sign Out    → signs out and redirects to /
 *
 * Always icon-only to fit the compact mobile nav row.
 */
export default function ProfileIconButton({
  isSignedIn,
  avatarUrl,
  displayName,
}: {
  isSignedIn: boolean;
  avatarUrl: string | null;
  displayName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Signed-out → plain link
  if (!isSignedIn) {
    return (
      <Link
        href="/auth/login"
        aria-label="Sign in"
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors shrink-0 overflow-hidden"
        style={{ color: "var(--nrs-text-muted)" }}
      >
        <PersonIcon />
      </Link>
    );
  }

  // Signed-in → button that opens a dropdown
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors shrink-0 overflow-hidden"
        style={{ color: "var(--nrs-text-muted)" }}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName ?? "My Account"}
            fill
            className="object-cover rounded-full"
            sizes="32px"
          />
        ) : (
          <PersonIcon />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 200,
            minWidth: "160px",
            background: "var(--nrs-bg-2, #111118)",
            border: "1px solid var(--nrs-border, rgba(255,255,255,0.1))",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {displayName && (
            <div
              style={{
                padding: "10px 14px 8px",
                fontSize: "12px",
                color: "var(--nrs-text-muted)",
                borderBottom: "1px solid var(--nrs-border)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "180px",
              }}
            >
              {displayName}
            </div>
          )}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              color: "var(--nrs-text-body)",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            className="hover:bg-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            My Account
          </Link>
          <button
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#f87171",
              background: "transparent",
              border: "none",
              borderTop: "1px solid var(--nrs-border)",
              cursor: "pointer",
              transition: "background 0.15s",
              textAlign: "left",
            }}
            className="hover:bg-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function PersonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
