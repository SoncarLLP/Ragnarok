import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowRequestActions from "./FollowRequestActions";

export default async function FollowRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rawRequests } = await supabase
    .from("follow_requests")
    .select(
      "id, requester_id, created_at, profiles!follow_requests_requester_id_fkey(username, full_name, avatar_url, bio)"
    )
    .eq("target_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  type RequestRow = {
    id: string;
    requester_id: string;
    created_at: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };

  const requests: RequestRow[] = (rawRequests ?? []).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      requester_id: r.requester_id,
      created_at: r.created_at,
      username: (p as { username?: string | null } | null)?.username ?? null,
      full_name: (p as { full_name?: string | null } | null)?.full_name ?? null,
      avatar_url: (p as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      bio: (p as { bio?: string | null } | null)?.bio ?? null,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Follow Requests</h1>
      <p className="text-sm mb-6" style={{ color: "var(--nrs-text-muted)" }}>
        Members who have requested to follow you. Approve to grant access to your followers-only
        content.
      </p>

      {requests.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No pending follow requests.</p>
          <p className="text-xs mt-2" style={{ color: "var(--nrs-text-muted)" }}>
            Switch to Followers-only mode in{" "}
            <a href="/account/privacy" className="hover:underline" style={{ color: "var(--nrs-accent)" }}>
              Privacy &amp; Safety
            </a>{" "}
            to use this feature.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const name = req.full_name || req.username || "Member";
            return (
              <div
                key={req.id}
                className="rounded-xl p-4 flex items-center justify-between gap-4"
                style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {req.avatar_url ? (
                    <img
                      src={req.avatar_url}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>{name}</div>
                    {req.username && (
                      <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>@{req.username}</div>
                    )}
                    {req.bio && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: "var(--nrs-text-muted)" }}>{req.bio}</div>
                    )}
                  </div>
                </div>
                <FollowRequestActions
                  requestId={req.id}
                  requesterId={req.requester_id}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
