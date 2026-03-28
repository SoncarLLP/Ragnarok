"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/account",                label: "Dashboard" },
  { href: "/account/profile",        label: "Profile" },
  { href: "/account/orders",         label: "Orders" },
  { href: "/account/rewards",        label: "Rewards" },
  { href: "/account/notifications",  label: "Notifications" },
];

export default function AccountNav({ unreadWarnings = 0 }: { unreadWarnings?: number }) {
  const path = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-44 shrink-0 pt-1">
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
            {link.href === "/account/notifications" && unreadWarnings > 0 && (
              <span className="ml-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-neutral-950 text-xs font-semibold flex items-center justify-center">
                {unreadWarnings}
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
            {link.href === "/account/notifications" && unreadWarnings > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
