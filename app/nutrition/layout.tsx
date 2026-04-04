import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NUTRITION_NAV = [
  { href: "/nutrition",              label: "Dashboard",   emoji: "🏠" },
  { href: "/nutrition/diary",        label: "Diary",       emoji: "📔" },
  { href: "/nutrition/search",       label: "Search Food", emoji: "🔍" },
  { href: "/nutrition/goals",        label: "Goals",       emoji: "🎯" },
  { href: "/nutrition/planner",      label: "Meal Planner",emoji: "📅" },
  { href: "/nutrition/recipes",      label: "Recipes",     emoji: "👨‍🍳" },
  { href: "/nutrition/history",      label: "History",     emoji: "📊" },
  { href: "/nutrition/achievements", label: "Achievements",emoji: "🌟" },
];

export default async function NutritionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--nrs-bg)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--nrs-border)", background: "var(--nrs-bg-2)" }}>
        <div className="max-w-6xl mx-auto px-4">
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
                🥗 Nutrition Tracker
              </h1>
            </div>
            <Link
              href="/nutrition/diary"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition"
              style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
            >
              + Log Food
            </Link>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-0.5 overflow-x-auto pb-0 -mb-px">
            {NUTRITION_NAV.map((item) => (
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
