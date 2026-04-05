import Link from "next/link";
import Image from "next/image";
import NavWrapper from "@/components/NavWrapper";

/**
 * Admin layout — provides the standard sticky header (logo + NavWrapper icon row)
 * consistent with the rest of the site. Page titles and admin-specific controls
 * live inside the page content area, never in this header.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ minHeight: "100vh", background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}
    >
      {/* Standard sticky header — same compact layout as all other pages */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
            <Image
              src="/soncar-logo-ragnarok.png"
              alt="Ragnarök"
              width={48}
              height={48}
              className="h-7 w-auto"
              priority
            />
            <span
              className="hidden sm:block font-semibold tracking-widest text-sm"
              style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}
            >
              Ragnarök
            </span>
          </Link>
          <nav className="flex items-center gap-1 shrink-0" aria-label="Admin navigation">
            <NavWrapper />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
