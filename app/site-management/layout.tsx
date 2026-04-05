import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SiteManagementNav from "./SiteManagementNav";
import NavWrapper from "@/components/NavWrapper";
import BackToTop from "@/components/BackToTop";

export const metadata = { title: "Site Management · Ragnarök" };

export default async function SiteManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
        <header className="nrs-header sticky top-0 z-40">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
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
            <nav className="flex items-center gap-1 shrink-0">
              <NavWrapper />
            </nav>
          </div>
        </header>
        <main className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-lg font-semibold mb-2">Access Denied</p>
            <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              Site Management is only accessible to super admins.
            </p>
            <Link href="/account" className="mt-5 inline-block text-sm transition" style={{ color: "var(--nrs-text-muted)" }}>
              ← Back to account
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      {/* Standard sticky header — same compact layout as all other pages */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
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
          <nav className="flex items-center gap-1 shrink-0" aria-label="Site management navigation">
            <NavWrapper />
          </nav>
        </div>

        {/* Compact breadcrumb sub-bar — scrolls with header, below the icon row */}
        <div
          className="mx-auto max-w-7xl px-4 pb-2 flex items-center gap-2 text-xs overflow-x-auto whitespace-nowrap"
          style={{ color: "var(--nrs-text-muted)" }}
        >
          <Link href="/admin" className="hover:underline transition" style={{ color: "var(--nrs-text-muted)" }}>
            Admin Panel
          </Link>
          <span style={{ color: "var(--nrs-border)" }}>/</span>
          <span style={{ color: "var(--nrs-accent)" }}>Site Management</span>
          <span
            className="px-1.5 py-0.5 rounded-full ml-1"
            style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}
          >
            👑 super_admin
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-52 shrink-0">
            <SiteManagementNav />
          </aside>

          {/* Mobile nav */}
          <div className="md:hidden w-full mb-6">
            <SiteManagementNav mobile />
          </div>

          {/* Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <BackToTop />
    </div>
  );
}
