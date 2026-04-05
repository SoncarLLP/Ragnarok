"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const baseLinks = [
  { href: "/account",                      label: "Dashboard" },
  { href: "/account/profile",              label: "Profile" },
  { href: "/account/orders",              label: "Orders" },
  { href: "/account/rewards",             label: "Rewards" },
  { href: "/fitness",                      label: "⚔️ Fitness" },
  { href: "/nutrition",                   label: "🥗 Nutrition" },
  { href: "/account/notifications",       label: "Notifications" },
  { href: "/account/privacy",             label: "Privacy & Safety" },
  { href: "/account/settings/theme",      label: "Theme" },
  { href: "/account/settings/push",       label: "Push Notifications" },
];

export default function AccountNav({
  unreadCount = 0,
  pendingFollowRequests = 0,
  unreadMessages = 0,
  role,
}: {
  unreadCount?: number;
  pendingFollowRequests?: number;
  unreadMessages?: number;
  role?: string | null;
  /** @deprecated use unreadCount */
  unreadWarnings?: number;
}) {
  const path = usePathname();
  const router = useRouter();
  const isAdmin = role === "admin" || role === "super_admin";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  const notifBadge = unreadCount > 99 ? "99+" : unreadCount;
  const msgBadge = unreadMessages > 99 ? "99+" : unreadMessages;

  const isSuperAdmin = role === "super_admin";

  const links = isAdmin
    ? [
        ...baseLinks,
        { href: "/account/follow-requests", label: "Follow Requests" },
        { href: "/messages", label: "Messages" },
        {
          href: "/admin",
          label: isSuperAdmin ? "Admin Panel 👑" : "Admin Panel 🛡️",
        },
        ...(isSuperAdmin
          ? [{ href: "/site-management", label: "Site Management ⚙️" }]
          : []),
      ]
    : [
        ...baseLinks,
        { href: "/account/follow-requests", label: "Follow Requests" },
      ];

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-md text-sm transition flex items-center justify-between"
            style={
              path === link.href
                ? { background: "var(--nrs-accent-dim)", color: "var(--nrs-text)", borderLeft: "2px solid var(--nrs-accent)" }
                : { color: "var(--nrs-text-muted)" }
            }
          >
            {link.label}
            {link.href === "/account/notifications" && unreadCount > 0 && (
              <span className="ml-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                {notifBadge}
              </span>
            )}
            {link.href === "/account/follow-requests" && pendingFollowRequests > 0 && (
              <span className="ml-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-violet-400 text-neutral-950 text-xs font-semibold flex items-center justify-center">
                {pendingFollowRequests}
              </span>
            )}
            {link.href === "/messages" && unreadMessages > 0 && (
              <span className="ml-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                {msgBadge}
              </span>
            )}
          </Link>
        ))}
        {/* Sign out — pinned to bottom of desktop sidebar */}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--nrs-border)" }}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition hover:bg-red-500/10"
            style={{ color: "#f87171" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile top tabs */}
      <nav className="md:hidden flex gap-1 overflow-x-auto pb-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 px-4 py-2 rounded-full text-sm transition flex items-center gap-1.5"
            style={
              path === link.href
                ? { background: "var(--nrs-accent-dim)", color: "var(--nrs-text)", border: "1px solid var(--nrs-accent-border)" }
                : { color: "var(--nrs-text-muted)", background: "var(--nrs-panel)" }
            }
          >
            {link.label}
            {link.href === "/account/notifications" && unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            )}
            {link.href === "/account/follow-requests" && pendingFollowRequests > 0 && (
              <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
            )}
            {link.href === "/messages" && unreadMessages > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            )}
          </Link>
        ))}
        {/* Sign out tab — at the end of the horizontal scroll row */}
        <button
          onClick={handleSignOut}
          className="shrink-0 px-4 py-2 rounded-full text-sm transition flex items-center gap-1.5"
          style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </nav>
    </>
  );
}
