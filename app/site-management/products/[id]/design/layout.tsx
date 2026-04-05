import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import NavWrapper from "@/components/NavWrapper";

export const metadata = { title: "Design Studio · Ragnarök Site Management" };

/**
 * Full-width layout for the Design Studio — overrides the Site Management
 * sidebar layout to give the split-screen design tool maximum space.
 * Uses the standard site header (logo + NavWrapper icons) for consistency
 * and accessibility in PWA mode.
 */
export default async function DesignStudioLayout({
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
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}
      >
        <header className="nrs-header sticky top-0 z-40">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
              <Image
                src="/soncar-logo-ragnarok.png"
                alt="Ragnarök"
                width={48}
                height={48}
                className="h-7 w-auto"
                priority
              />
            </Link>
            <nav className="flex items-center gap-1 shrink-0">
              <NavWrapper />
            </nav>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-lg font-semibold mb-2">Access Denied</p>
            <p style={{ color: "var(--nrs-text-muted)" }} className="text-sm">Design Studio requires super admin access.</p>
            <Link href="/account" className="mt-5 inline-block text-sm hover:underline" style={{ color: "var(--nrs-text-muted)" }}>
              ← Back to account
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}
    >
      {/* Standard sticky header — no sidebar here */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
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
          <nav className="flex items-center gap-1 shrink-0" aria-label="Design studio navigation">
            <NavWrapper />
          </nav>
        </div>

        {/* Compact breadcrumb sub-bar */}
        <div
          className="px-4 pb-2 flex items-center gap-1.5 text-xs overflow-x-auto whitespace-nowrap"
          style={{ color: "var(--nrs-text-muted)" }}
        >
          <Link
            href="/site-management"
            className="hover:underline transition"
            style={{ color: "var(--nrs-text-muted)" }}
          >
            Site Management
          </Link>
          <span style={{ color: "var(--nrs-border)" }}>/</span>
          <Link
            href="/site-management/products"
            className="hover:underline transition"
            style={{ color: "var(--nrs-text-muted)" }}
          >
            Products
          </Link>
          <span style={{ color: "var(--nrs-border)" }}>/</span>
          <span
            className="px-2 py-0.5 rounded font-semibold"
            style={{
              background: "linear-gradient(135deg, rgba(201,132,156,0.12), rgba(212,152,10,0.12))",
              color: "#e8a878",
            }}
          >
            Design Studio
          </span>
        </div>
      </header>

      <main className="flex-1 design-studio-main">{children}</main>
    </div>
  );
}
