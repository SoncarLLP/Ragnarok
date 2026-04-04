import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  formatTierName, getTierColor, getTierGroup, getNextTier, getTierProgress,
  tierFromPoints, ALL_TIERS, TIER_GROUP_DESCRIPTIONS, LOYALTY_EARN_RATES, REASON_LABELS,
} from "@/lib/loyalty";
import TierBadge from "@/components/TierBadge";
import PointsDisplay from "@/components/PointsDisplay";

type LoyaltyEvent = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
};

/** Group tiers for the display grid */
const TIER_GROUPS = [
  { key: "thrall",    label: "Thrall",    emoji: "⛓️" },
  { key: "karl",      label: "Karl",      emoji: "🪵" },
  { key: "huscarl",   label: "Huscarl",   emoji: "🛡️" },
  { key: "jarl",      label: "Jarl",      emoji: "♛" },
  { key: "einherjar", label: "Einherjar", emoji: "ᚢ" },
  { key: "valkyrie",  label: "Valkyrie",  emoji: "🪽" },
  { key: "legendary", label: "Legendary", emoji: "🌳" },
];

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: events }, { data: fitnessProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("cumulative_points, tier, role, fitness_level_highest, fitness_prestige_total")
      .eq("id", user.id)
      .single(),
    supabase
      .from("loyalty_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("member_fitness_profiles")
      .select("active_class_id, fitness_classes(name, icon)")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const points     = profile?.cumulative_points ?? (events?.reduce((s, e) => s + e.delta, 0) ?? 0);
  const tierName   = formatTierName(profile?.tier ?? tierFromPoints(points));
  const tierColor  = getTierColor(tierName);
  const tierGroup  = getTierGroup(tierName);
  const nextTier   = getNextTier(tierName, points);
  const progress   = getTierProgress(tierName, points);
  const isLegendary = tierName === "Legendary";

  const fitnessLevel   = profile?.fitness_level_highest ?? 1;
  const fitnessPrestige = profile?.fitness_prestige_total ?? 0;
  const activeClass = (Array.isArray(fitnessProfile?.fitness_classes)
    ? fitnessProfile?.fitness_classes[0]
    : fitnessProfile?.fitness_classes) as { name: string; icon: string } | null;

  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Rewards</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
        Your Norse loyalty tier and points history
      </p>

      {/* Tier + points card */}
      <div className="mt-6 rounded-xl p-6" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--nrs-text-muted)" }}>Tier</div>
            <div className={`text-3xl font-semibold ${tierColor}`}>{tierName}</div>
            <div className="mt-2">
              <TierBadge tier={tierName} />
            </div>
            <div className="mt-2 text-sm italic" style={{ color: "var(--nrs-text-muted)" }}>
              {TIER_GROUP_DESCRIPTIONS[tierGroup]}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--nrs-text-muted)" }}>Points</div>
            <div className="text-3xl font-semibold">
              <PointsDisplay points={points} role={profile?.role} tier={tierName} />
            </div>
            {activeClass && (
              <div className="mt-2 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                {activeClass.icon} {activeClass.name} · Lv.{fitnessLevel}
                {fitnessPrestige > 0 && ` · ⭐×${fitnessPrestige}`}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isLegendary ? (
          <div className="mt-4 text-sm" style={{ color: "var(--nrs-accent)" }}>
            You&apos;ve reached Legendary — the highest tier in all of Ragnarök. 🌳
          </div>
        ) : nextTier ? (
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2" style={{ color: "var(--nrs-text-muted)" }}>
              <span>{tierName}</span>
              <span>
                {nextTier.needed.toLocaleString()} pts to {formatTierName(nextTier.tier)}
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: "var(--nrs-panel)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progress}%`, background: "var(--nrs-accent)" }}
              />
            </div>
            {/* Fitness requirement for next tier */}
            {(nextTier.fitnessLevel > 1 || nextTier.fitnessPrestige > 0) && (
              <div className="mt-2 text-xs flex items-center gap-1.5" style={{ color: "var(--nrs-text-muted)" }}>
                <span>Also requires:</span>
                {nextTier.fitnessLevel > 1 && (
                  <span
                    className="px-2 py-0.5 rounded-full border text-xs"
                    style={{
                      border: fitnessLevel >= nextTier.fitnessLevel ? "1px solid rgba(52,211,153,0.4)" : "1px solid var(--nrs-border)",
                      color: fitnessLevel >= nextTier.fitnessLevel ? "#34d399" : "var(--nrs-text-muted)",
                      background: fitnessLevel >= nextTier.fitnessLevel ? "rgba(52,211,153,0.1)" : "transparent",
                    }}
                  >
                    ⚔️ Level {nextTier.fitnessLevel}
                    {fitnessLevel >= nextTier.fitnessLevel ? " ✓" : ` (you: ${fitnessLevel})`}
                  </span>
                )}
                {nextTier.fitnessPrestige > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full border text-xs"
                    style={{
                      border: fitnessPrestige >= nextTier.fitnessPrestige ? "1px solid rgba(52,211,153,0.4)" : "1px solid var(--nrs-border)",
                      color: fitnessPrestige >= nextTier.fitnessPrestige ? "#34d399" : "var(--nrs-text-muted)",
                      background: fitnessPrestige >= nextTier.fitnessPrestige ? "rgba(52,211,153,0.1)" : "transparent",
                    }}
                  >
                    ⭐ {nextTier.fitnessPrestige} Prestige{nextTier.fitnessPrestige > 1 ? "s" : ""}
                    {fitnessPrestige >= nextTier.fitnessPrestige ? " ✓" : ` (you: ${fitnessPrestige})`}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Tier progression grid */}
      <div className="mt-6">
        <h2 className="font-semibold mb-3" style={{ color: "var(--nrs-text)" }}>Tier Progression</h2>
        <div className="space-y-3">
          {TIER_GROUPS.map((group) => {
            const groupTiers = ALL_TIERS.filter((t) => t.group === group.key);
            return (
              <div key={group.key}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: "var(--nrs-text-muted)" }}>
                  <span>{group.emoji}</span>
                  <span>{group.label}</span>
                </div>
                <div className={`grid gap-2 ${group.key === "legendary" ? "grid-cols-1" : "grid-cols-3"}`}>
                  {groupTiers.map((t) => {
                    const isActive  = t.tier === tierName;
                    const unlocked  = points >= t.min;
                    const fitUnlocked = fitnessLevel >= t.fitnessLevel && fitnessPrestige >= t.fitnessPrestige;
                    const fullyUnlocked = unlocked && fitUnlocked;
                    return (
                      <div
                        key={t.tier}
                        className={`rounded-lg p-3 text-center transition ${!fullyUnlocked ? "opacity-40" : ""}`}
                        style={
                          isActive
                            ? { border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }
                            : { border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }
                        }
                      >
                        <TierBadge tier={t.tier} />
                        <div className="mt-1.5 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                          {t.min === 0 ? "0" : t.min.toLocaleString()}+ pts
                        </div>
                        {t.fitnessLevel > 1 && (
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                            ⚔️ Lv.{t.fitnessLevel}{t.fitnessPrestige > 0 ? ` + ${t.fitnessPrestige}⭐` : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to earn */}
      <div className="mt-6 rounded-xl p-5" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
        <h2 className="font-semibold mb-3">How to earn points</h2>
        <div className="space-y-1">
          {/* Shopping */}
          <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-2" style={{ color: "var(--nrs-text-muted)" }}>Shopping</div>
          <EarnRow label="Welcome bonus (sign-up)" value={`${LOYALTY_EARN_RATES.signup_bonus} pts`} />
          <EarnRow label="Every purchase" value={`${LOYALTY_EARN_RATES.purchase_per_pound} pts / £1`} />

          {/* Community */}
          <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: "var(--nrs-text-muted)" }}>Community</div>
          <EarnRow label="Post receives 250 reactions (per milestone)" value={`${LOYALTY_EARN_RATES.post_reaction_milestone_per_250} pts`} />
          <EarnRow label="Comment receives 100 reactions (per milestone)" value={`${LOYALTY_EARN_RATES.comment_reaction_per_100} pts`} />

          {/* Fitness */}
          <div className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: "var(--nrs-text-muted)" }}>Fitness Tracker ⚔️</div>
          <EarnRow label="Workout logged" value={`${LOYALTY_EARN_RATES.workout_logged} pts`} />
          <EarnRow label="Class-matched workout" value={`${LOYALTY_EARN_RATES.class_matched_workout} pts`} />
          <EarnRow label="Daily streak maintained" value={`${LOYALTY_EARN_RATES.daily_streak} pts/day`} />
          <EarnRow label="Weekly streak (7 days)" value={`${LOYALTY_EARN_RATES.weekly_streak_bonus} pts`} />
          <EarnRow label="Monthly streak (30 days)" value={`${LOYALTY_EARN_RATES.monthly_streak_bonus} pts`} />
          <EarnRow label="Personal record beaten" value={`${LOYALTY_EARN_RATES.personal_record} pts`} />
          <EarnRow label="Level up (scales with level)" value={`${LOYALTY_EARN_RATES.level_up_min}–${LOYALTY_EARN_RATES.level_up_max} pts`} />
          <EarnRow label="Prestige achieved" value={`${LOYALTY_EARN_RATES.prestige_achieved} pts`} />
          <EarnRow label="Weekly challenge completed" value={`${LOYALTY_EARN_RATES.weekly_challenge} pts`} />
          <EarnRow label="Monthly challenge completed" value={`${LOYALTY_EARN_RATES.monthly_challenge} pts`} />
          <EarnRow label="Guild challenge completed" value={`${LOYALTY_EARN_RATES.guild_challenge} pts`} />
          <EarnRow label="Leaderboard top 3" value="100 / 75 / 50 pts" />
          <EarnRow label="Viking class level up bonus" value={`+${LOYALTY_EARN_RATES.viking_level_up_bonus} pts extra`} highlight />
        </div>

        <div className="mt-4 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
          Anti-abuse caps apply to all fitness-related point sources.{" "}
          <Link href="/policies#loyalty" className="hover:underline" style={{ color: "var(--nrs-accent)" }}>
            View full terms →
          </Link>
        </div>
      </div>

      {/* Fitness link */}
      <div className="mt-4 rounded-xl p-4 flex items-center justify-between"
        style={{ border: "1px solid var(--nrs-accent-border)", background: "var(--nrs-accent-dim)" }}>
        <div>
          <div className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>Unlock higher tiers faster</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
            Karl+ tiers require fitness level. Start levelling up today.
          </div>
        </div>
        <Link
          href="/fitness"
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
        >
          ⚔️ Fitness Tracker
        </Link>
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
                      day: "numeric", month: "short", year: "numeric",
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

function EarnRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 text-sm border-b last:border-0"
      style={{ borderColor: "var(--nrs-border-subtle)" }}>
      <span style={{ color: "var(--nrs-text-body)" }}>{label}</span>
      <span className="font-medium" style={{ color: highlight ? "#fbbf24" : "var(--nrs-accent)" }}>{value}</span>
    </div>
  );
}
