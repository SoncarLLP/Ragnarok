import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatTierName, tierFromPoints, ALL_TIERS, DIAMOND_TIER } from "@/lib/loyalty";
import ThemeSelector from "./ThemeSelector";

export default async function ThemePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_theme, tier, cumulative_points")
    .eq("id", user.id)
    .single();

  const tierName = formatTierName(profile?.tier ?? tierFromPoints(profile?.cumulative_points ?? 0));
  const activeTheme = profile?.active_theme ?? null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1"
        style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.05em", color: "var(--nrs-text)" }}>
        Theme
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
        Choose your Ragnarök visual experience. Higher tiers unlock more powerful themes.
      </p>

      <ThemeSelector currentTier={tierName} activeTheme={activeTheme} />
    </div>
  );
}
