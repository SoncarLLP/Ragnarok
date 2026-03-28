import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch warnings
  const { data: warnings } = await supabase
    .from("member_warnings")
    .select("id, message, created_at, read_at, sent_by")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Mark all unread as read
  const unreadIds = (warnings ?? []).filter((w) => !w.read_at).map((w) => w.id);
  if (unreadIds.length > 0) {
    await supabase
      .from("member_warnings")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Notifications</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Messages and warnings from the SONCAR team
      </p>

      {!warnings || warnings.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-neutral-400 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {warnings.map((w) => {
            const wasUnread = !w.read_at || unreadIds.includes(w.id);
            return (
              <div
                key={w.id}
                className={`rounded-xl border p-5 ${
                  wasUnread
                    ? "border-amber-400/30 bg-amber-500/5"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                      Warning
                    </span>
                    {wasUnread && (
                      <span className="text-xs text-amber-400">New</span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {new Date(w.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-3 text-sm text-neutral-200 leading-relaxed">
                  {w.message}
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  From the SONCAR moderation team
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
