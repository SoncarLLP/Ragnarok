import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SiteManagementNav from "./SiteManagementNav";
import DarkModeToggle from "@/components/DarkModeToggle";
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
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
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
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      {/* Header */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-wide text-sm">
              Ragnarök
            </Link>
            <span style={{ color: "var(--nrs-border)" }}>/</span>
            <span className="text-sm font-medium" style={{ color: "var(--nrs-accent)" }}>Site Management</span>
            <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}>
              👑 super_admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block" style={{ color: "var(--nrs-text-muted)" }}>
              {profile.full_name ?? user.email}
            </span>
            <Link
              href="/"
              target="_blank"
              className="nrs-btn text-xs py-1.5"
            >
              View live site ↗
            </Link>
            <Link
              href="/admin"
              className="nrs-btn text-xs py-1.5"
            >
              Admin Panel
            </Link>
            <DarkModeToggle isSignedIn={true} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
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
