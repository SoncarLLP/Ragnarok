import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTier, getNextTier, getTierProgress, TIERS } from "@/lib/loyalty";

type LoyaltyEvent = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
};

const REASON_LABELS: Record<string, string> = {
  signup_bonus: "Welcome bonus",
  purchase:     "Purchase reward",
  redemption:   "Points redeemed",
};

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: events } = await supabase
    .from("loyalty_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const totalPoints = events?.reduce((sum, e) => sum + e.delta, 0) ?? 0;
  const tier = getTier(totalPoints);
  const nextTier = getNextTier(totalPoints);
  const progress = getTierProgress(totalPoints);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Rewards</h1>
      <p className="mt-1 text-sm text-neutral-400">Your loyalty tier and points history</p>

      {/* Tier + points card */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Tier</div>
            <div className={`text-3xl font-semibold ${tier.color}`}>{tier.tier}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Points</div>
            <div className="text-3xl font-semibold">{totalPoints.toLocaleString()}</div>
          </div>
        </div>

        {nextTier ? (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-neutral-400 mb-2">
              <span>{tier.tier}</span>
              <span>{nextTier.needed.toLocaleString()} pts to {nextTier.tier}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-emerald-400">
            You&apos;ve reached the highest tier. Thank you for being a SONCAR member!
          </div>
        )}
      </div>

      {/* Tier grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TIERS.map((t) => (
          <div
            key={t.tier}
            className={`rounded-lg border p-4 text-center transition ${
              t.tier === tier.tier
                ? "border-amber-400/40 bg-amber-500/10"
                : "border-white/10 bg-white/5 opacity-40"
            }`}
          >
            <div className={`font-semibold ${t.color}`}>{t.tier}</div>
            <div className="text-xs text-neutral-400 mt-1">
              {t.min === 0 ? "0" : t.min.toLocaleString()}+ pts
            </div>
          </div>
        ))}
      </div>

      {/* How to earn */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold mb-3">How to earn points</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li className="flex justify-between">
            <span>Welcome bonus (on sign-up)</span>
            <span className="text-amber-400 font-medium">100 pts</span>
          </li>
          <li className="flex justify-between">
            <span>Every purchase</span>
            <span className="text-amber-400 font-medium">10 pts / £1</span>
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
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <div className="text-sm">
                    {REASON_LABELS[e.reason] ?? e.reason.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {new Date(e.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div
                  className={`font-medium text-sm ${
                    e.delta > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
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
