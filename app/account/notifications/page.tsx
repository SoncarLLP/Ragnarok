import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationsClient, { type NotifItem } from "./NotificationsClient";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch all non-archived and all archived notifications in parallel
  const [{ data: allData }, { data: archivedData }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, message, link, read_at, created_at, admin_notice, archived")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("notifications")
      .select("id, type, message, link, read_at, created_at, admin_notice, archived")
      .eq("user_id", user.id)
      .eq("archived", true)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const allNotifs: NotifItem[] = allData ?? [];
  const archivedNotifs: NotifItem[] = archivedData ?? [];

  // Auto-mark unread admin notices as read when user visits this page
  // (they cannot be explicitly dismissed, so auto-read on view)
  const unreadAdminIds = allNotifs
    .filter((n) => n.admin_notice && !n.read_at)
    .map((n) => n.id);

  if (unreadAdminIds.length > 0) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadAdminIds);

    // Reflect in the data passed to client
    const now = new Date().toISOString();
    for (const n of allNotifs) {
      if (unreadAdminIds.includes(n.id)) n.read_at = now;
    }
  }

  return (
    <NotificationsClient
      initialAll={allNotifs}
      initialArchived={archivedNotifs}
    />
  );
}
