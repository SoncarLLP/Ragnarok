import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DarkModeToggle from "@/components/DarkModeToggle";

export const metadata = { title: "Design Studio · Ragnarök Site Management" };

/**
 * Full-width layout for the Design Studio — overrides the Site Management
 * sidebar layout to give the split-screen design tool maximum space.
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
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}
      >
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-neutral-400 text-sm">Design Studio requires super admin access.</p>
          <Link href="/account" className="mt-5 inline-block text-sm text-neutral-400 hover:text-white">
            ← Back to account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}
    >
      {/* Minimal header — no sidebar here */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-semibold tracking-wide text-sm">
              Ragnarök
            </Link>
            <span className="text-neutral-600">/</span>
            <Link
              href="/site-management"
              className="text-sm text-neutral-400 hover:text-white transition"
            >
              Site Management
            </Link>
            <span className="text-neutral-600">/</span>
            <Link
              href="/site-management/products"
              className="text-sm text-neutral-400 hover:text-white transition"
            >
              Products
            </Link>
            <span className="text-neutral-600">/</span>
            <span
              className="text-sm font-semibold px-2 py-0.5 rounded"
              style={{
                background: "linear-gradient(135deg, rgba(201,132,156,0.12), rgba(212,152,10,0.12))",
                color: "#e8a878",
              }}
            >
              Design Studio
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block text-xs text-neutral-500">
              {profile.full_name ?? user.email}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              👑 super_admin
            </span>
            <DarkModeToggle isSignedIn={true} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
