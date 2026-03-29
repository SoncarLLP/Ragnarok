import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTierColor, getNextTier, getTierProgress, tierFromPoints } from "@/lib/loyalty";
import MemberBadge from "@/components/MemberBadge";
import TierBadge from "@/components/TierBadge";

function fmtMemberId(id: number | null | undefined) {
  return id != null ? String(id).padStart(11, "0") : null;
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: recentOrders }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, member_id, role, cumulative_points, tier")
        .eq("id", user.id)
        .single(),
      supabase
        .from("orders")
        .select("id, total_pence, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  // Use DB-stored tier if available; fall back to JS calculation for unmigrated DBs
  const points    = profile?.cumulative_points ?? 0;
  const tierName  = profile?.tier ?? tierFromPoints(points);
  const tierColor = getTierColor(tierName);
  const nextTier  = getNextTier(tierName, points);
  const progress  = getTierProgress(tierName, points);
  const displayName = profile?.full_name || user.email?.split("@")[0] || "Member";
  const memberId = fmtMemberId(profile?.member_id);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2 flex-wrap">
          Welcome back, {displayName}
          <MemberBadge role={profile?.role} tier={tierName} />
        </h1>
        {memberId && (
          <div className="text-right shrink-0">
            <div className="text-xs text-neutral-500 uppercase tracking-wide">Member ID</div>
            <div className="font-mono text-sm text-neutral-300">{memberId}</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Points */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-neutral-400">Loyalty Points</div>
          <div className="mt-1 text-3xl font-semibold">{points.toLocaleString()}</div>
          {nextTier ? (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
                <span>{tierName}</span>
                <span>{nextTier.needed.toLocaleString()} pts to {nextTier.tier}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-emerald-400">Max tier reached</div>
          )}
        </div>

        {/* Tier */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-neutral-400">Current Tier</div>
          <div className={`mt-1 text-3xl font-semibold ${tierColor}`}>{tierName}</div>
          <div className="mt-2">
            <TierBadge tier={tierName} />
          </div>
          <Link
            href="/account/rewards"
            className="mt-3 inline-block text-xs text-neutral-500 hover:text-white"
          >
            View rewards →
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link href="/account/orders" className="text-sm text-neutral-400 hover:text-white">
            View all
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-400 text-sm">No orders yet.</p>
            <Link href="/#shop" className="mt-3 inline-block text-sm text-white hover:underline">
              Browse products →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    £{(order.total_pence / 100).toFixed(2)}
                  </div>
                  <div
                    className={`text-xs capitalize mt-0.5 ${
                      order.status === "delivered"
                        ? "text-emerald-400"
                        : order.status === "shipped"
                        ? "text-blue-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {order.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <Link
          href="/account/profile"
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition"
        >
          <div className="font-medium">Profile</div>
          <div className="mt-1 text-sm text-neutral-400">
            Update your name and contact details
          </div>
        </Link>
        <Link
          href="/account/rewards"
          className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition"
        >
          <div className="font-medium">Rewards</div>
          <div className="mt-1 text-sm text-neutral-400">
            View your points history and tier benefits
          </div>
        </Link>
      </div>
    </div>
  );
}
