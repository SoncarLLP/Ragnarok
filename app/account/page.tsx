import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTierName, getTierColor, getNextTier, getTierProgress, tierFromPoints } from "@/lib/loyalty";
import MemberBadge from "@/components/MemberBadge";
import TierBadge from "@/components/TierBadge";
import PointsDisplay from "@/components/PointsDisplay";

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
  const tierName  = formatTierName(profile?.tier ?? tierFromPoints(points));
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
            <div className="text-xs uppercase tracking-wide" style={{ color: "var(--nrs-text-muted)" }}>Member ID</div>
            <div className="font-mono text-sm" style={{ color: "var(--nrs-text-body)" }}>{memberId}</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Points */}
        <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>Loyalty Points</div>
          <div className="mt-1 text-3xl font-semibold">
            <PointsDisplay points={points} role={profile?.role} tier={tierName} />
          </div>
          {nextTier ? (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--nrs-text-muted)" }}>
                <span>{tierName}</span>
                <span>{nextTier.needed.toLocaleString()} pts to {formatTierName(nextTier.tier)}</span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ background: "var(--nrs-panel)" }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%`, background: "var(--nrs-accent)" }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-emerald-400">Max tier reached</div>
          )}
        </div>

        {/* Tier */}
        <div className="rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <div className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>Current Tier</div>
          <div className={`mt-1 text-3xl font-semibold ${tierColor}`}>{tierName}</div>
          <div className="mt-2">
            <TierBadge tier={tierName} />
          </div>
          <Link
            href="/account/rewards"
            className="mt-3 inline-block text-xs transition-colors hover:underline"
            style={{ color: "var(--nrs-text-muted)" }}
          >
            View rewards →
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link href="/account/orders" className="text-sm transition-colors hover:underline" style={{ color: "var(--nrs-text-muted)" }}>
            View all
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
            <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No orders yet.</p>
            <Link href="/#shop" className="mt-3 inline-block text-sm hover:underline" style={{ color: "var(--nrs-accent)" }}>
              Browse products →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
                    #{order.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium" style={{ color: "var(--nrs-text)" }}>
                    £{(order.total_pence / 100).toFixed(2)}
                  </div>
                  <div
                    className="text-xs capitalize mt-0.5"
                    style={{
                      color:
                        order.status === "delivered"
                          ? "#34d399"
                          : order.status === "shipped"
                          ? "#60a5fa"
                          : "var(--nrs-text-muted)",
                    }}
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
          className="rounded-xl p-5 transition"
          style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
        >
          <div className="font-medium" style={{ color: "var(--nrs-text)" }}>Profile</div>
          <div className="mt-1 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
            Update your name and contact details
          </div>
        </Link>
        <Link
          href="/account/rewards"
          className="rounded-xl p-5 transition"
          style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
        >
          <div className="font-medium" style={{ color: "var(--nrs-text)" }}>Rewards</div>
          <div className="mt-1 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
            View your points history and tier benefits
          </div>
        </Link>
      </div>
    </div>
  );
}
