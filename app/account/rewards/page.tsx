import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatTierName, getTierColor, getNextTier, getTierProgress, tierFromPoints, ALL_TIERS } from "@/lib/loyalty";
import TierBadge from "@/components/TierBadge";
import PointsDisplay from "@/components/PointsDisplay";

type LoyaltyEvent = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
};

const REASON_LABELS: Record<string, string> = {
  signup_bonus:                "Welcome bonus",
  purchase:                    "Purchase reward",
  redemption:                  "Points redeemed",
  reaction_milestone_post:     "Post reaction milestone",
  reaction_milestone_comment:  "Comment reaction milestone",
};

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: events }] = await Promise.all([
    supabase
      .from("profiles")
      .select("cumulative_points, tier, role")
      .eq("id", user.id)
      .single(),
    supabase
      .from("loyalty_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Use DB-stored values if the tier-trigger migration has been run;
  // otherwise fall back to summing events so the page always works.
  const points = profile?.cumulative_points
    ?? (events?.reduce((s, e) => s + e.delta, 0) ?? 0);
  const tierName  = formatTierName(profile?.tier ?? tierFromPoints(points));
  const tierColor = getTierColor(tierName);
  const nextTier  = getNextTier(tierName, points);
  const progress  = getTierProgress(tierName, points);
  const isDiamond = tierName === "Diamond";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Rewards</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--nrs-text-muted)" }}>Your loyalty tier and points history</p>

      {/* Tier + points card */}
      <div className="mt-6 rounded-xl p-6" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--nrs-text-muted)" }}>Tier</div>
            <div className={`text-3xl font-semibold ${tierColor}`}>{tierName}</div>
            <div className="mt-2">
              <TierBadge tier={tierName} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--nrs-text-muted)" }}>Points</div>
            <div className="text-3xl font-semibold">
              <PointsDisplay points={points} role={profile?.role} tier={tierName} />
            </div>
          </div>
        </div>

        {isDiamond ? (
          <div className="mt-4 text-sm text-violet-300">
            You&apos;ve reached Diamond — the highest tier on Ragnarök. 👑
          </div>
        ) : nextTier ? (
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2" style={{ color: "var(--nrs-text-muted)" }}>
              <span>{tierName}</span>
              <span>{nextTier.needed.toLocaleString()} pts to {formatTierName(nextTier.tier)}</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: "var(--nrs-panel)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progress}%`, background: "var(--nrs-accent)" }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Full 13-tier grid */}
      <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 gap-2">
        {ALL_TIERS.map((t) => {
          const isActive = t.tier === tierName;
          const isUnlocked = points >= t.min;
          return (
            <div
              key={t.tier}
              className={`rounded-lg p-3 text-center transition ${!isUnlocked ? "opacity-35" : ""}`}
              style={
                isActive
                  ? t.tier === "Diamond"
                    ? { border: "1px solid rgba(167,139,250,0.4)", background: "rgba(139,92,246,0.10)" }
                    : { border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }
                  : { border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }
              }
            >
              <div className={`font-semibold text-xs ${t.color}`}>{t.tier}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                {t.min === 0 ? "0" : t.min.toLocaleString()}+ pts
              </div>
            </div>
          );
        })}
      </div>

      {/* How to earn */}
      <div className="mt-6 rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <h2 className="font-semibold mb-3">How to earn points</h2>
        <ul className="space-y-2 text-sm" style={{ color: "var(--nrs-text-body)" }}>
          <li className="flex justify-between">
            <span>Welcome bonus (on sign-up)</span>
            <span className="font-medium" style={{ color: "var(--nrs-accent)" }}>50 pts</span>
          </li>
          <li className="flex justify-between">
            <span>Every purchase</span>
            <span className="font-medium" style={{ color: "var(--nrs-accent)" }}>5 pts / £1</span>
          </li>
          <li className="flex justify-between">
            <span>Post receives 250 reactions (per milestone)</span>
            <span className="font-medium" style={{ color: "var(--nrs-accent)" }}>2 pts</span>
          </li>
          <li className="flex justify-between">
            <span>Comment receives 100 reactions (per milestone)</span>
            <span className="font-medium" style={{ color: "var(--nrs-accent)" }}>1 pt</span>
          </li>
        </ul>
      </div>

      {/* Points history */}
      {events && events.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3">Points history</h2>
          <div className="space-y-2">
            {(events as LoyaltyEvent[]).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
              >
                <div>
                  <div className="text-sm" style={{ color: "var(--nrs-text-body)" }}>
                    {REASON_LABELS[e.reason] ?? e.reason.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                    {new Date(e.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div
                  className="font-medium text-sm"
                  style={{ color: e.delta > 0 ? "var(--nrs-accent)" : "#f87171" }}
                >
                  {e.delta > 0 ? "+" : ""}
                  {e.delta} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
