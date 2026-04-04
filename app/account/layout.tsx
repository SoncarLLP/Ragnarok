import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "./AccountNav";
import NavWrapper from "@/components/NavWrapper";
import BackToTop from "@/components/BackToTop";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [
    { data: profile },
    { count: unreadNotifications },
    { count: pendingFollowRequests },
    unreadMsgResult,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, role, tier").eq("id", user.id).single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .eq("archived", false),
    supabase
      .from("follow_requests")
      .select("id", { count: "exact", head: true })
      .eq("target_id", user.id)
      .eq("status", "pending"),
    supabase.rpc("count_unread_message_conversations", { p_user_id: user.id }),
  ]);

  const totalUnread    = unreadNotifications ?? 0;
  const isAdmin        = profile?.role === "admin" || profile?.role === "super_admin";
  const unreadMessages = isAdmin ? ((unreadMsgResult.data as number) ?? 0) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      {/* Header — uses shared NavWrapper for consistent mobile layout */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
            <Image
              src="/soncar-logo-ragnarok.png"
              alt="Ragnarök"
              width={48} height={48}
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

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Mobile nav */}
        <div className="md:hidden mb-4">
          <AccountNav
            unreadCount={totalUnread}
            pendingFollowRequests={pendingFollowRequests ?? 0}
            unreadMessages={unreadMessages}
            role={profile?.role}
          />
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <AccountNav
              unreadCount={totalUnread}
              pendingFollowRequests={pendingFollowRequests ?? 0}
              unreadMessages={unreadMessages}
              role={profile?.role}
            />
          </div>

          {/* Page content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <BackToTop />
    </div>
  );
}
