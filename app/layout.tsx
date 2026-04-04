// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import ThemeProvider from "@/components/ThemeProvider";
import CinematicIntro from "@/components/CinematicIntro";
import TierReveal from "@/components/TierReveal";
import ScrollReveal from "@/components/ScrollReveal";
import { formatTierName, tierFromPoints } from "@/lib/loyalty";

export const metadata: Metadata = {
  metadataBase: new URL("https://soncar.co.uk"),
  title: "Ragnarök – Functional Protein Blends | soncar.co.uk",
  description:
    "Premium collagen and plant-based protein blends by Ragnarök. UK-made supplements for hydration, recovery, and glow.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Ragnarök – Functional Protein Blends",
    description: "Premium collagen and plant-based protein blends crafted in the UK.",
    url: "https://soncar.co.uk",
    siteName: "Ragnarök",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Ragnarök Product Range" }],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ragnarök – Functional Protein Blends",
    description: "Premium collagen and plant-based protein blends crafted in the UK.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

/** Derive the automatic theme from a tier name (19-tier Norse system). */
function tierToTheme(tier: string | null | undefined): string {
  if (!tier) return "bronze";
  const t = formatTierName(tier).toLowerCase();
  // Norse tier mapping → CSS theme names
  if (t === "legendary")          return "diamond";
  if (t.startsWith("valkyrie"))   return "diamond";
  if (t.startsWith("einherjar"))  return "platinum";
  if (t.startsWith("jarl"))       return "gold";
  if (t.startsWith("huscarl"))    return "silver";
  if (t.startsWith("karl"))       return "bronze";
  return "bronze"; // Thrall I-III
}

/** Validate that a stored active_theme is a real theme name. */
const VALID_THEMES = new Set(["bronze", "silver", "gold", "platinum", "fire", "diamond"]);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch the current user's theme + light mode preference server-side to avoid FOUC
  let theme = "bronze";
  let userId: string | null = null;
  let userTier: string | null = null;
  let tierRevealsSeen: Record<string, boolean> = {};
  let lightMode: boolean | null = null;
  let isSignedIn = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      isSignedIn = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_theme, tier, cumulative_points, tier_reveals_seen, light_mode_preference")
        .eq("id", user.id)
        .single();

      if (profile) {
        const tierName = formatTierName(profile.tier ?? tierFromPoints(profile.cumulative_points ?? 0));
        userTier = tierName;
        tierRevealsSeen = (profile.tier_reveals_seen as Record<string, boolean>) ?? {};
        const storedTheme = profile.active_theme as string | null;
        theme = (storedTheme && VALID_THEMES.has(storedTheme))
          ? storedTheme
          : tierToTheme(tierName);
        // null = follow system, true = light, false = dark
        lightMode = (profile.light_mode_preference as boolean | null) ?? null;
      }
    }
  } catch {
    // Not critical — fall back to bronze theme, system colour scheme
  }

  // Derive data-mode attribute for server-side rendering (prevents FOUC for auth users)
  // Guests: no attribute — CSS media query handles system preference natively
  const dataMode =
    lightMode === true ? "light" : lightMode === false ? "dark" : undefined;

  return (
    <html
      lang="en"
      data-theme={theme}
      {...(dataMode ? { "data-mode": dataMode } : {})}
      className="bg-[var(--nrs-bg)] text-[var(--nrs-text-body)]"
    >
      <body>
        <ThemeProvider
          initialTheme={theme}
          initialLightMode={lightMode}
          isSignedIn={isSignedIn}
        >
          <ScrollReveal />
          {!userId && <CinematicIntro />}
          {children}
          {userId && (
            <TierReveal
              userId={userId}
              currentTier={userTier ?? "Bronze 1"}
              tierRevealsSeen={tierRevealsSeen}
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
