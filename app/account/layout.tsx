import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "./AccountNav";
import LogoutButton from "./LogoutButton";
import NavSidebar from "@/components/NavSidebar";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { count: unreadWarnings }, { count: unreadNotifications }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
      supabase
        .from("member_warnings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

  const totalUnread = (totalUnread) + (unreadNotifications ?? 0);

  const displayName =
    profile?.full_name || user.email?.split("@")[0] || "Member";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-wide">
            SONCAR
          </Link>
          <div className="flex items-center gap-4">
            {(totalUnread) > 0 && (
              <Link
                href="/account/notifications"
                className="flex items-center gap-1.5 text-sm text-amber-300 hover:text-amber-200"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {totalUnread} notification{totalUnread !== 1 ? "s" : ""}
              </Link>
            )}
            <span className="text-sm text-neutral-400 hidden sm:block">{displayName}</span>
            <LogoutButton />
            <NavSidebar role={profile?.role} />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Mobile nav rendered above content */}
        <div className="md:hidden mb-2">
          <AccountNav unreadWarnings={totalUnread} role={profile?.role} />
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <AccountNav unreadWarnings={totalUnread} role={profile?.role} />
          </div>

          {/* Page content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
