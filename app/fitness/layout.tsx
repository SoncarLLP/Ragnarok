import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const FITNESS_NAV = [
  { href: "/fitness",              label: "Dashboard",    emoji: "🏠" },
  { href: "/fitness/log",          label: "Log Workout",  emoji: "➕" },
  { href: "/fitness/history",      label: "History",      emoji: "📋" },
  { href: "/fitness/body",         label: "Body Tracker", emoji: "📊" },
  { href: "/fitness/classes",      label: "Classes",      emoji: "⚔️" },
  { href: "/fitness/leaderboard",  label: "Leaderboard",  emoji: "🏆" },
  { href: "/fitness/challenges",   label: "Challenges",   emoji: "🎯" },
  { href: "/fitness/guilds",       label: "Guilds",       emoji: "🛡️" },
  { href: "/fitness/achievements", label: "Achievements", emoji: "🌟" },
];

export default async function FitnessLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--nrs-bg)" }}>
      {/* Fitness section header */}
      <div
        className="border-b"
        style={{ borderColor: "var(--nrs-border)", background: "var(--nrs-bg-2)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          {/* Title row */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm hover:underline" style={{ color: "var(--nrs-text-muted)" }}>
                ← Home
              </Link>
              <span style={{ color: "var(--nrs-border)" }}>|</span>
              <h1
                className="font-bold text-lg"
                style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}
              >
                ⚔️ Fitness Tracker
              </h1>
            </div>
            <Link
              href="/fitness/log"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
            >
              + Log Workout
            </Link>
          </div>

          {/* Navigation tabs */}
          <nav className="flex gap-0.5 overflow-x-auto pb-0 -mb-px">
            {FITNESS_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 border-transparent transition-colors whitespace-nowrap"
                style={{ color: "var(--nrs-text-muted)" }}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
