import { createClient } from "@/lib/supabase/server";
import NavSidebar from "./NavSidebar";
import NotificationBell from "./NotificationBell";
import DarkModeToggle from "./DarkModeToggle";
import SearchBar from "./SearchBar";
import ProfileIconButton from "./ProfileIconButton";

/**
 * Async server component — fetches the current user's profile and unread
 * notification count, then renders the compact header icon row:
 *
 *   ProfileIcon → Search → DarkMode → Bell → Hamburger
 *
 * All icons are w-8 h-8 with gap-1 so the row fits within a 320px screen.
 * Safe to use on any page; gracefully handles unauthenticated users.
 */
export default async function NavWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let tier: string | null = null;
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let unreadCount = 0;
  let unreadMessages = 0;

  if (user) {
    const [{ data: profile }, { count }, msgCount] = await Promise.all([
      supabase
        .from("profiles")
        .select("role, tier, full_name, avatar_url")
        .eq("id", user.id)
        .single(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
        .eq("archived", false),
      supabase.rpc("count_unread_message_conversations", { p_user_id: user.id }),
    ]);

    role = profile?.role ?? null;
    tier = profile?.tier ?? null;
    displayName = profile?.full_name || user.email?.split("@")[0] || null;
    avatarUrl = profile?.avatar_url ?? null;
    unreadCount = count ?? 0;

    if (role === "admin" || role === "super_admin") {
      unreadMessages = (msgCount.data as number) ?? 0;
    }
  }

  const isSignedIn = !!user;

  return (
    <>
      <ProfileIconButton
        isSignedIn={isSignedIn}
        avatarUrl={avatarUrl}
        displayName={displayName}
      />
      <SearchBar />
      <DarkModeToggle isSignedIn={isSignedIn} />
      {user && (
        <NotificationBell userId={user.id} initialUnreadCount={unreadCount} />
      )}
      <NavSidebar
        role={role}
        tier={tier}
        displayName={displayName}
        unreadCount={unreadCount}
        unreadMessages={unreadMessages}
      />
    </>
  );
}
