"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseLinks = [
  { href: "/account",                      label: "Dashboard" },
  { href: "/account/profile",              label: "Profile" },
  { href: "/account/orders",              label: "Orders" },
  { href: "/account/rewards",             label: "Rewards" },
  { href: "/account/notifications",       label: "Notifications" },
  { href: "/account/privacy",             label: "Privacy & Safety" },
  { href: "/account/settings/theme",      label: "Theme" },
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
  const isAdmin = role === "admin" || role === "super_admin";
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
            className={`px-3 py-2 rounded-md text-sm transition flex items-center justify-between ${
              path === link.href
                ? "bg-white/10 text-white"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
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
      </nav>

      {/* Mobile top tabs */}
      <nav className="md:hidden flex gap-1 overflow-x-auto pb-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 px-4 py-2 rounded-full text-sm transition flex items-center gap-1.5 ${
              path === link.href
                ? "bg-white/15 text-white"
                : "text-neutral-400 hover:text-white bg-white/5"
            }`}
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
      </nav>
    </>
  );
}
