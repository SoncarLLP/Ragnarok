"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",           label: "Home",      icon: "🏠" },
  { href: "/fitness",    label: "Fitness",   icon: "⚔️" },
  { href: "/nutrition",  label: "Nutrition", icon: "🥗" },
  { href: "/community",  label: "Community", icon: "⚡" },
  { href: "/account",    label: "Account",   icon: "👤" },
];

interface Props {
  isSignedIn: boolean;
}

export default function PWABottomNav({ isSignedIn }: Props) {
  const pathname = usePathname();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");

    const check = () => {
      const standalone =
        mq.matches || (navigator as { standalone?: boolean }).standalone === true;

      setIsStandalone(standalone);

      // Inject/remove the global pwa-mode class so CSS rules cascade everywhere
      if (standalone) {
        document.body.classList.add("pwa-mode");
      } else {
        document.body.classList.remove("pwa-mode");
      }
    };

    check();
    mq.addEventListener("change", check);
    return () => {
      mq.removeEventListener("change", check);
      // Clean up when component unmounts
      document.body.classList.remove("pwa-mode");
    };
  }, []);

  // Only render in standalone PWA mode
  if (!isStandalone) return null;

  // Hide on admin, auth, site-management, and messages pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/site-management") ||
    pathname.startsWith("/messages")
  ) {
    return null;
  }

  // Hide nav for non-authenticated users on protected routes
  const items = isSignedIn
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.href === "/" || item.href === "/community");

  return (
    <nav
      className="pwa-bottom-nav fixed bottom-0 left-0 right-0 z-40"
      aria-label="Bottom navigation"
      style={{
        background: "var(--nrs-bg-2, #0d0d14)",
        borderTop: "1px solid var(--nrs-border, rgba(255,255,255,0.07))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        /* Extend background into the safe area so there's no gap on notched phones */
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-opacity active:opacity-60 relative"
              style={{
                color: isActive ? "var(--nrs-accent, #c9a84c)" : "var(--nrs-text-muted, #6b7280)",
                /* Min 44×44 tap target (accessibility) — 56px gives extra room */
                minHeight: "56px",
                minWidth: "44px",
                textDecoration: "none",
              }}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className="text-xl leading-none"
                style={{
                  filter: isActive ? "drop-shadow(0 0 4px var(--nrs-accent))" : "none",
                }}
              >
                {item.icon}
              </span>
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: isActive
                    ? "var(--nrs-accent, #c9a84c)"
                    : "var(--nrs-text-muted, #6b7280)",
                }}
              >
                {item.label}
              </span>
              {/* Active indicator bar — anchored inside the item, not the nav */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "var(--nrs-accent, #c9a84c)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
