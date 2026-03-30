import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SiteManagementNav from "./SiteManagementNav";

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
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-neutral-400 text-sm">
            Site Management is only accessible to super admins.
          </p>
          <Link href="/account" className="mt-5 inline-block text-sm text-neutral-400 hover:text-white">
            ← Back to account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-wide text-sm">
              Ragnarök
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-sm font-medium text-amber-300">Site Management</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 ml-1">
              👑 super_admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral-500 hidden sm:block">
              {profile.full_name ?? user.email}
            </span>
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded bg-white/8 hover:bg-white/15 text-neutral-300 hover:text-white text-xs transition"
            >
              View live site ↗
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded bg-white/8 hover:bg-white/15 text-neutral-300 hover:text-white text-xs transition"
            >
              Admin Panel
            </Link>
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
    </div>
  );
}
