import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type UnifiedItem = {
  id: string;
  category: "warning" | "mention";
  message: string;
  link: string | null;
  created_at: string;
  isNew: boolean;
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const now = new Date().toISOString();

  // Fetch warnings and mention notifications in parallel
  const [{ data: warnings }, { data: notifications }] = await Promise.all([
    supabase
      .from("member_warnings")
      .select("id, message, created_at, read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, type, message, link, created_at, read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Collect unread IDs before marking as read
  const unreadWarningIds = (warnings ?? []).filter((w) => !w.read_at).map((w) => w.id);
  const unreadNotifIds = (notifications ?? []).filter((n) => !n.read_at).map((n) => n.id);

  // Mark all as read (parallel)
  await Promise.all([
    unreadWarningIds.length > 0
      ? supabase
          .from("member_warnings")
          .update({ read_at: now })
          .in("id", unreadWarningIds)
      : Promise.resolve(),
    unreadNotifIds.length > 0
      ? supabase
          .from("notifications")
          .update({ read_at: now })
          .in("id", unreadNotifIds)
      : Promise.resolve(),
  ]);

  // Build unified list sorted by date descending
  const unified: UnifiedItem[] = [
    ...(warnings ?? []).map((w) => ({
      id: w.id,
      category: "warning" as const,
      message: w.message,
      link: null,
      created_at: w.created_at,
      isNew: unreadWarningIds.includes(w.id),
    })),
    ...(notifications ?? []).map((n) => ({
      id: n.id,
      category: "mention" as const,
      message: n.message,
      link: n.link ?? null,
      created_at: n.created_at,
      isNew: unreadNotifIds.includes(n.id),
    })),
  ].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Notifications</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Mentions, warnings, and messages from the SONCAR team
      </p>

      {unified.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-neutral-400 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unified.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-5 ${
                item.isNew
                  ? "border-amber-400/30 bg-amber-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.category === "warning" ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium">
                      Warning
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                      Mention
                    </span>
                  )}
                  {item.isNew && (
                    <span className="text-xs text-amber-400 font-medium">New</span>
                  )}
                </div>
                <span className="text-xs text-neutral-500 shrink-0">
                  {new Date(item.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <p className="mt-3 text-sm text-neutral-200 leading-relaxed">
                {item.message}
              </p>

              <div className="mt-2 flex items-center gap-4">
                {item.category === "warning" && (
                  <p className="text-xs text-neutral-500">
                    From the SONCAR moderation team
                  </p>
                )}
                {item.link && (
                  <Link
                    href={item.link}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    View post →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
