import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import NavWrapper from "@/components/NavWrapper";
import BackToTop from "@/components/BackToTop";
import type { FAQContent } from "@/lib/site-management";

export const dynamic = "force-dynamic";

export default async function FAQPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("site_content").select("content").eq("key", "faq").single();
  const faqContent = (data?.content ?? { items: [] }) as FAQContent;

  return (
    <main className="min-h-screen" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      <header className="nrs-header sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none shrink-0"
            style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}
          >
            Ragnarök
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm shrink-0" style={{ color: "var(--nrs-text-muted)" }}>
            <Link href="/#shop" className="hidden md:block hover:text-white">Shop</Link>
            <Link href="/community" className="hidden md:block hover:text-white">Community</Link>
            <Link href="/policies" className="hidden md:block hover:text-white">Policies</Link>
            {/* Hidden on mobile — accessible via hamburger menu */}
            <Link href="/account" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs hidden sm:inline-flex">
              My Account
            </Link>
            <NavWrapper />
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-14 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Frequently Asked Questions</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
            Can&apos;t find an answer?{" "}
            <Link href="/policies" className="text-amber-300 hover:underline">Visit our policies page</Link> or contact us.
          </p>
        </div>

        {faqContent.items.length === 0 ? (
          <p className="text-neutral-500 text-sm">No FAQ items yet. Check back soon.</p>
        ) : (
          <div className="space-y-3">
            {faqContent.items.map((item) => (
              <details
                key={item.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] group open:border-white/20"
              >
                <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-medium text-neutral-200 hover:text-white">
                  {item.question}
                  <span className="text-neutral-500 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-neutral-400 leading-relaxed border-t border-white/5 pt-3">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
      <BackToTop />
    </main>
  );
}
