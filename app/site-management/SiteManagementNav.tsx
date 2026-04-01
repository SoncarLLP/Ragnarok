"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    section: "Overview",
    links: [{ href: "/site-management", label: "Dashboard", icon: "◈" }],
  },
  {
    section: "Products",
    links: [
      { href: "/site-management/products", label: "All Products", icon: "📦" },
    ],
  },
  {
    section: "Site Content",
    links: [
      { href: "/site-management/content/homepage", label: "Homepage", icon: "🏠" },
      { href: "/site-management/content/global", label: "Global & Footer", icon: "🌐" },
      { href: "/site-management/content/shop", label: "Shop Page", icon: "🛒" },
      { href: "/site-management/content/faq", label: "FAQ", icon: "❓" },
    ],
  },
  {
    section: "Safety",
    links: [
      { href: "/site-management/moderation",        label: "Content Moderation", icon: "🛡️" },
    ],
  },
  {
    section: "Insights",
    links: [
      { href: "/site-management/search-analytics",  label: "Search Analytics",   icon: "🔍" },
    ],
  },
];

export default function SiteManagementNav({ mobile }: { mobile?: boolean }) {
  const path = usePathname();

  if (mobile) {
    return (
      <nav className="flex gap-1 overflow-x-auto pb-2">
        {navItems.flatMap((s) => s.links).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 px-3 py-2 rounded-lg text-sm transition flex items-center gap-1.5 ${
              path === link.href || (link.href !== "/site-management" && path.startsWith(link.href))
                ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-5">
      {navItems.map((section) => (
        <div key={section.section}>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 px-3 mb-1.5">
            {section.section}
          </p>
          <div className="space-y-0.5">
            {section.links.map((link) => {
              const active =
                path === link.href ||
                (link.href !== "/site-management" && path.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                    active
                      ? "bg-amber-500/15 text-amber-200 border border-amber-500/20"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-base leading-none">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
