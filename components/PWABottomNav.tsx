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
  role?: string | null;
}

export default function PWABottomNav({ isSignedIn, role }: Props) {
  const pathname = usePathname();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");

    const check = () => {
      const standalone =
        mq.matches || (navigator as { standalone?: boolean }).standalone === true;

      setIsStandalone(standalone);

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
      document.body.classList.remove("pwa-mode");
    };
  }, []);

  if (!isStandalone) return null;

  // Hide on auth pages, messages (full-screen app), and Design Studio (full-screen tool)
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/messages") ||
    (pathname.startsWith("/site-management/products/") && pathname.endsWith("/design"))
  ) {
    return null;
  }

  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  const items = isSignedIn
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.href === "/" || item.href === "/community");

  return (
    <nav
      className="pwa-bottom-nav fixed bottom-0 left-0 right-0 z-40"
      aria-label="Bottom navigation"
      style={{
        width: "100%",
        background: "var(--nrs-bg-2, #0d0d14)",
        borderTop: "1px solid var(--nrs-border, rgba(255,255,255,0.07))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* w-full + justify-evenly ensures all items are evenly spread edge-to-edge */}
      <div
        style={{
          display: "flex",
          width: "100%",
          alignItems: "stretch",
          justifyContent: "space-evenly",
        }}
      >
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          // Show admin/super_admin badge on the Account icon
          const showAdminBadge = isAdmin && item.href === "/account";

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: "1 1 0%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                position: "relative",
                minHeight: "56px",
                paddingTop: "8px",
                paddingBottom: "6px",
                textDecoration: "none",
                color: isActive ? "var(--nrs-accent, #c9a84c)" : "var(--nrs-text-muted, #6b7280)",
                transition: "opacity 0.15s",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  lineHeight: 1,
                  display: "block",
                  position: "relative",
                  filter: isActive ? "drop-shadow(0 0 4px var(--nrs-accent))" : "none",
                }}
              >
                {item.icon}
                {/* Admin/super_admin role indicator badge */}
                {showAdminBadge && (
                  <span
                    aria-label={isSuperAdmin ? "Super admin" : "Admin"}
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-6px",
                      fontSize: "10px",
                      lineHeight: 1,
                    }}
                  >
                    {isSuperAdmin ? "👑" : "🛡️"}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  color: isActive
                    ? "var(--nrs-accent, #c9a84c)"
                    : "var(--nrs-text-muted, #6b7280)",
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "28px",
                    height: "2px",
                    borderRadius: "9999px",
                    background: "var(--nrs-accent, #c9a84c)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
