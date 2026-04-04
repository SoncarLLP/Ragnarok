"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * Circular profile icon button for the site header.
 * Always icon-only — no text at any viewport — to fit the compact mobile nav row.
 * Matches w-8 h-8 footprint of other header icons (search, bell, hamburger).
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
  const href = isSignedIn ? "/account" : "/auth/login";
  const label = isSignedIn ? "My Account" : "Sign in";

  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors shrink-0 overflow-hidden"
      style={{ color: "var(--nrs-text-muted)" }}
    >
      {isSignedIn && avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName ?? "My Account"}
          fill
          className="object-cover rounded-full"
          sizes="32px"
        />
      ) : (
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
      )}
    </Link>
  );
}
