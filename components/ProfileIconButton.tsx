"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * Profile / person icon button for the site header.
 *
 * - Signed-in users  → links to /account, shows avatar if available
 * - Signed-out users → links to /auth/login, shows generic person icon
 * - Matches w-9 h-9 footprint of the NotificationBell for consistent icon row sizing
 * - On md+ screens, optionally shows the member's display name beside the icon
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
      className="flex items-center gap-1.5 rounded-md hover:bg-white/10 active:bg-white/15 transition-colors"
      style={{ color: "var(--nrs-text-muted)" }}
    >
      {/* Icon / avatar — always 36×36 to match bell */}
      <span className="relative flex items-center justify-center w-9 h-9 shrink-0">
        {isSignedIn && avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName ?? "My Account"}
            width={28}
            height={28}
            className="rounded-full object-cover"
            style={{ width: 28, height: 28 }}
          />
        ) : (
          /* Standard person SVG — universally recognised */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
      </span>

      {/* Display name — visible on md+ screens when signed in */}
      {isSignedIn && displayName && (
        <span
          className="hidden md:block text-sm font-medium max-w-[100px] truncate"
          style={{ color: "var(--nrs-text-muted)" }}
        >
          {displayName}
        </span>
      )}
    </Link>
  );
}
