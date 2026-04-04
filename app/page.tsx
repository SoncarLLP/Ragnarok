import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { products as staticProducts } from "@/lib/products";
import NavWrapper from "@/components/NavWrapper";
import ParticleCanvas from "@/components/ParticleCanvas";
import RunicDivider from "@/components/RunicDivider";
import type { HomepageContent, GlobalContent, AnnouncementBar } from "@/lib/site-management";
import { defaultHomepageContent } from "@/lib/site-management";
import { getProductCardAccent, getProductCardGlow } from "@/lib/product-card-theme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchProps = { searchParams: Promise<{ preview?: string }> };

export default async function HomePage({ searchParams }: SearchProps) {
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const admin = createAdminClient();

  // Check preview auth
  let isPreviewAuthorised = false;
  if (isPreview) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
      isPreviewAuthorised = profile?.role === "super_admin";
    }
  }

  // Fetch homepage content
  let homepageContent: HomepageContent = defaultHomepageContent();
  let globalContent: GlobalContent | null = null;

  if (isPreviewAuthorised) {
    const [{ data: hpDraft }, { data: gbDraft }, { data: hpLive }, { data: gbLive }] = await Promise.all([
      admin.from("content_drafts").select("draft_data").eq("entity_type", "site_content").eq("entity_id", "homepage").single(),
      admin.from("content_drafts").select("draft_data").eq("entity_type", "site_content").eq("entity_id", "global").single(),
      admin.from("site_content").select("content").eq("key", "homepage").single(),
      admin.from("site_content").select("content").eq("key", "global").single(),
    ]);
    homepageContent = (hpDraft?.draft_data ?? hpLive?.content ?? defaultHomepageContent()) as HomepageContent;
    globalContent = (gbDraft?.draft_data ?? gbLive?.content ?? null) as GlobalContent | null;
  } else {
    const [{ data: hpRow }, { data: gbRow }] = await Promise.all([
      admin.from("site_content").select("content").eq("key", "homepage").single(),
      admin.from("site_content").select("content").eq("key", "global").single(),
    ]);
    homepageContent = (hpRow?.content ?? defaultHomepageContent()) as HomepageContent;
    globalContent = (gbRow?.content ?? null) as GlobalContent | null;
  }

  // Fetch products (include theme for card colouring)
  const { data: dbProducts } = await admin
    .from("products")
    .select("id, slug, name, description_html, price_pence, primary_image_url, is_featured, visibility, sort_order, theme")
    .eq("visibility", "published")
    .order("sort_order", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProducts: any[] = dbProducts && dbProducts.length > 0 ? dbProducts : staticProducts.map((p) => ({
    id: p.slug, slug: p.slug, name: p.name,
    description_html: `<p>${p.blurb}</p>`, price_pence: p.price * 100,
    primary_image_url: p.image, is_featured: false, visibility: "published", sort_order: 0,
  }));

  const featuredSlugs = homepageContent.featured_product_slugs ?? [];
  const featuredProducts = featuredSlugs.length > 0
    ? allProducts.filter((p) => featuredSlugs.includes(p.slug))
    : allProducts.filter((p) => p.is_featured);

  const announcementBar: AnnouncementBar | null =
    globalContent?.announcement_bar?.enabled ? globalContent.announcement_bar : null;

  const hero = homepageContent.hero;
  const banner = homepageContent.announcement_banner;
  const brandStory = homepageContent.brand_story;
  const customSections = homepageContent.custom_sections ?? [];

  return (
    <main style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)", minHeight: "100vh" }}>
      {/* Preview banner */}
      {isPreviewAuthorised && (
        <div className="sticky top-0 z-50 text-center text-sm py-2 font-semibold"
          style={{ background: "rgba(201,168,76,0.9)", color: "#0a0a0f" }}>
          ⚑ Preview mode — changes not yet published ·{" "}
          <Link href="/" className="underline">Exit preview</Link>
        </div>
      )}

      {/* Site-wide announcement bar */}
      {announcementBar && (
        <div className="w-full text-center text-sm py-2 px-4 font-medium"
          style={{ backgroundColor: announcementBar.background_color }}>
          {announcementBar.link ? (
            <Link href={announcementBar.link} className="hover:underline">{announcementBar.text}</Link>
          ) : announcementBar.text}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <Image
              src="/soncar-logo-ragnarok.png"
              alt="RAGNAROK logo"
              width={112}
              height={112}
              className="h-8 w-auto shrink-0"
              priority
            />
            <span
              className="hidden sm:inline font-heading font-semibold tracking-widest text-sm"
              style={{ color: "var(--nrs-accent)", fontFamily: "var(--font-heading)" }}
            >
              Ragnarök
            </span>
          </div>
          {/* Nav — profile icon is rendered inside NavWrapper */}
          <nav className="flex items-center gap-1 text-sm shrink-0">
            <Link href="#shop" className="nrs-nav-link hidden md:block mr-1">Shop</Link>
            <Link href="/community" className="nrs-nav-link hidden md:block mr-1">Community</Link>
            <Link href="/policies" className="nrs-nav-link hidden md:block mr-1">Policies</Link>
            <NavWrapper />
          </nav>
        </div>
      </header>

      {/* Homepage announcement banner */}
      {banner?.enabled && banner.text && (
        <div className="w-full text-center py-3 px-4 text-sm font-medium"
          style={{
            background: (banner.background_color ?? "#c9a84c") + "22",
            borderBottom: `1px solid ${banner.background_color ?? "#c9a84c"}44`,
            color: "var(--nrs-text-body)",
          }}>
          {banner.text}
          {banner.link && banner.link_text && (
            <Link href={banner.link} className="ml-2 underline opacity-90 hover:opacity-100">
              {banner.link_text}
            </Link>
          )}
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="nrs-hero-bg nrs-aurora relative overflow-hidden"
        style={{ minHeight: "min(85vh, 700px)" }}
      >
        {/* Background image if provided */}
        {hero.background_image_url && (
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{
              backgroundImage: `url(${hero.background_image_url})`,
              animation: "nrs-hero-zoom 14s ease-out forwards",
            }}
          />
        )}

        {/* Particle canvas */}
        <ParticleCanvas />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 md:py-28 flex flex-col items-center text-center">
          <Image
            src="/soncar-logo-ragnarok.png"
            alt="RAGNAROK"
            width={600}
            height={600}
            className="h-52 md:h-80 w-auto nrs-reveal"
            priority
            style={{
              filter: "drop-shadow(0 0 40px var(--nrs-accent-glow)) drop-shadow(0 0 80px var(--nrs-accent-dim))",
              animation: "nrs-hero-zoom 12s ease-out forwards",
            }}
          />

          <h1
            className="mt-8 nrs-heading nrs-reveal nrs-reveal-delay-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {(() => {
              const byIndex = hero.heading.toLowerCase().indexOf(" by ");
              if (byIndex !== -1) {
                const main = hero.heading.slice(0, byIndex);
                const sub  = hero.heading.slice(byIndex + 1);
                return (
                  <>
                    <span className="block text-4xl md:text-6xl font-bold" style={{ color: "var(--nrs-text)" }}>
                      {main}
                    </span>
                    <span className="block text-lg md:text-xl font-normal mt-2" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
                      {sub}
                    </span>
                  </>
                );
              }
              return (
                <span className="block text-4xl md:text-6xl font-bold" style={{ color: "var(--nrs-text)" }}>
                  {hero.heading}
                </span>
              );
            })()}
          </h1>

          <p className="mt-5 max-w-xl text-base md:text-lg nrs-reveal nrs-reveal-delay-2"
            style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
            {hero.subtitle}
          </p>

          <div className="mt-8 flex gap-3 flex-wrap justify-center nrs-reveal nrs-reveal-delay-3">
            {hero.primary_cta_text && (
              <Link href={hero.primary_cta_link} className="nrs-btn nrs-btn-primary nrs-btn-traced px-6 py-3 text-sm font-bold tracking-widest uppercase">
                {hero.primary_cta_text}
              </Link>
            )}
            {hero.secondary_cta_text && (
              <Link href={hero.secondary_cta_link} className="nrs-btn px-6 py-3 text-sm tracking-wide">
                {hero.secondary_cta_text}
              </Link>
            )}
          </div>

          {/* Norse knotwork bottom border */}
          <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
            <svg viewBox="0 0 1440 32" preserveAspectRatio="none" className="w-full h-8" fill="none">
              <path
                d="M0 16 C120 4, 240 28, 360 16 C480 4, 600 28, 720 16 C840 4, 960 28, 1080 16 C1200 4, 1320 28, 1440 16 L1440 32 L0 32 Z"
                fill="var(--nrs-bg)"
                opacity="0.8"
              />
              <path
                d="M0 16 C120 4, 240 28, 360 16 C480 4, 600 28, 720 16 C840 4, 960 28, 1080 16 C1200 4, 1320 28, 1440 16"
                stroke="var(--nrs-accent)"
                strokeWidth="0.8"
                strokeOpacity="0.4"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Featured products ─────────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <RunicDivider runes="ᚠᛖᚨᛏᚢᚱᛖᛞ" className="mb-8" />
          <h2 className="text-xl font-semibold mb-7 text-center"
            style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)", letterSpacing: "0.15em" }}>
            Featured
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map((p) => {
              const pAccent = getProductCardAccent(p.slug, p.theme);
              const pGlow   = getProductCardGlow(p.slug, p.theme);
              return (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="nrs-card overflow-hidden group"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${pAccent} 7%, var(--nrs-card, #1a1a2e))`,
                    border: `1px solid ${pAccent}28`,
                    transition: "box-shadow 0.3s, border-color 0.3s",
                  }}
                  onMouseEnter={undefined}
                  data-prd-accent={pAccent}
                >
                  {p.primary_image_url && (
                    <div className="grid place-items-center p-3 relative overflow-hidden"
                      style={{ background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${pGlow}, var(--nrs-bg-2))` }}>
                      <Image
                        src={p.primary_image_url} alt={p.name}
                        width={300} height={300}
                        className="h-48 w-full object-contain transition-transform duration-500 group-hover:scale-105 relative z-10"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-semibold text-sm" style={{ color: pAccent, fontFamily: "var(--font-heading)", letterSpacing: "0.04em" }}>
                      {p.name}
                    </p>
                    <p className="text-sm mt-1 font-medium" style={{ color: pAccent, opacity: 0.85 }}>
                      £{(p.price_pence / 100).toFixed(2)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── All Products — Bestsellers ─────────────────────────────────── */}
      <section id="shop" className="mx-auto max-w-7xl px-4 py-14">
        <RunicDivider runes="ᛒᛖᛋᛏᛋᛖᛚᛚᛖᚱᛋ" className="mb-8" />
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.06em" }}>
            Bestsellers
          </h2>
          <p className="text-sm" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
            £30 each · Free UK delivery over £60
          </p>
        </div>

        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProducts.map((p) => {
            const pAccent = getProductCardAccent(p.slug, p.theme);
            const pGlow   = getProductCardGlow(p.slug, p.theme);
            return (
              <article
                key={p.id ?? p.slug}
                className="nrs-card overflow-hidden group nrs-reveal"
                style={{
                  backgroundColor: `color-mix(in srgb, ${pAccent} 7%, var(--nrs-card, #1a1a2e))`,
                  border: `1px solid ${pAccent}28`,
                }}
              >
                <div className="grid place-items-center p-4 relative overflow-hidden"
                  style={{ background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${pGlow}, var(--nrs-bg-2))` }}>
                  {/* Product-themed glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${pAccent}22, transparent)` }}
                    aria-hidden="true"
                  />
                  <Link href={`/product/${p.slug}`} className="block w-full relative z-10">
                    <Image
                      src={p.primary_image_url ?? p.image ?? "/images/products/placeholder.jpg"}
                      alt={p.name}
                      width={600}
                      height={800}
                      className="h-80 w-full object-contain transition-transform duration-500 group-hover:scale-104"
                      loading="lazy"
                    />
                  </Link>
                </div>

                <div className="p-5">
                  {/* Product-accented top border */}
                  <div className="mb-3 h-px w-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${pAccent}60, transparent)` }}
                    aria-hidden="true"
                  />

                  <Link href={`/product/${p.slug}`}
                    className="text-lg font-semibold hover:underline underline-offset-4 block"
                    style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.03em", color: pAccent, textDecorationColor: pAccent }}>
                    {p.name}
                  </Link>
                  <div
                    className="mt-2 text-sm line-clamp-2"
                    style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}
                    dangerouslySetInnerHTML={{ __html: p.description_html ?? p.blurb ?? "" }}
                  />

                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-bold text-lg" style={{ color: pAccent }}>
                      £{((p.price_pence ?? (p.price * 100)) / 100).toFixed(2)}
                    </span>
                    <Link
                      href={`/cart?add=${p.slug}`}
                      className="nrs-btn nrs-btn-traced text-xs py-2 px-4 uppercase tracking-widest font-bold"
                      style={{ borderColor: `${pAccent}60`, color: pAccent }}
                    >
                      Acquire
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Premium delivery notice */}
        <div className="mt-8 p-4 rounded-lg flex items-center gap-3"
          style={{ background: "var(--nrs-accent-dim)", border: "1px solid var(--nrs-accent-border)" }}>
          <span style={{ color: "var(--nrs-accent)", fontSize: "1.25rem" }}>⚡</span>
          <div>
            <span className="font-semibold text-sm" style={{ color: "var(--nrs-accent)", fontFamily: "var(--font-heading)", letterSpacing: "0.05em" }}>
              Forged for Speed —
            </span>
            <span className="text-sm ml-1" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
              Same-day dispatch · Next-day delivery available at checkout
            </span>
          </div>
        </div>
      </section>

      {/* ── Brand story ───────────────────────────────────────────────── */}
      {brandStory.enabled && (brandStory.heading || brandStory.body_html) && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <RunicDivider runes="ᛚᛖᚷᛖᚾᛞ" className="mb-10" />
          <div className={`grid gap-10 ${brandStory.image_url ? "md:grid-cols-2" : ""} items-center`}>
            <div>
              {brandStory.heading && (
                <h2 className="text-2xl md:text-3xl font-bold mb-5 nrs-heading"
                  style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.05em" }}>
                  {brandStory.heading}
                </h2>
              )}
              {brandStory.body_html && (
                <div
                  className="prose-norse prose prose-sm max-w-none"
                  style={{ fontFamily: "var(--font-body)", fontSize: "1.05rem", lineHeight: 1.7, color: "var(--nrs-text-body)" }}
                  dangerouslySetInnerHTML={{ __html: brandStory.body_html }}
                />
              )}
            </div>
            {brandStory.image_url && (
              <div className="rounded-xl overflow-hidden nrs-card">
                <Image
                  src={brandStory.image_url}
                  alt={brandStory.heading || "Brand story"}
                  width={600} height={400}
                  className="w-full h-64 md:h-80 object-cover"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Custom sections ────────────────────────────────────────────── */}
      {customSections.map((sec) => (
        <section key={sec.id} className="mx-auto max-w-7xl px-4 py-14">
          <RunicDivider className="mb-8" />
          {sec.type === "text" && (
            <div>
              {sec.heading && (
                <h2 className="text-2xl font-bold mb-5"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-text)" }}>
                  {sec.heading}
                </h2>
              )}
              <div
                className="prose-norse prose prose-sm max-w-2xl"
                style={{ fontFamily: "var(--font-body)", color: "var(--nrs-text-body)" }}
                dangerouslySetInnerHTML={{ __html: sec.body_html }}
              />
            </div>
          )}
          {sec.type === "image" && sec.image_url && (
            <div>
              {sec.heading && (
                <h2 className="text-2xl font-bold mb-5"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-text)" }}>
                  {sec.heading}
                </h2>
              )}
              <Image src={sec.image_url} alt={sec.heading || ""} width={1200} height={400}
                className="w-full rounded-xl object-cover" />
            </div>
          )}
          {sec.type === "text_image" && (
            <div className={`grid md:grid-cols-2 gap-10 items-center ${sec.image_position === "left" ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div>
                {sec.heading && (
                  <h2 className="text-2xl font-bold mb-5"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-text)" }}>
                    {sec.heading}
                  </h2>
                )}
                <div
                  className="prose-norse prose prose-sm max-w-none"
                  style={{ fontFamily: "var(--font-body)", color: "var(--nrs-text-body)" }}
                  dangerouslySetInnerHTML={{ __html: sec.body_html }}
                />
              </div>
              {sec.image_url && (
                <Image src={sec.image_url} alt={sec.heading || ""} width={600} height={400}
                  className="w-full rounded-xl object-cover nrs-card" />
              )}
            </div>
          )}
        </section>
      ))}

      {/* ── Loyalty teaser ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <RunicDivider runes="ᚱᛖᚹᚨᚱᛞᛋ" className="mb-10" />
        <div className="rounded-2xl overflow-hidden nrs-marble-bg relative"
          style={{ border: "1px solid var(--nrs-accent-border)" }}>
          <div className="relative z-10 p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4 nrs-heading"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.08em" }}>
              Join the Ragnarök Brotherhood
            </h2>
            <p className="max-w-xl mx-auto mb-8 text-base"
              style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)", lineHeight: 1.7 }}>
              Earn loyalty points with every order. Rise through Bronze, Silver, Gold, Platinum and Diamond tiers.
              Unlock exclusive Norse visual themes as your legend grows.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/auth/signup" className="nrs-btn nrs-btn-primary px-8 py-3 font-bold uppercase tracking-widest">
                Begin Your Journey
              </Link>
              <Link href="/account/rewards" className="nrs-btn px-8 py-3">
                View Tiers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--nrs-border)", background: "var(--nrs-bg-2)" }}>
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/soncar-logo-ragnarok.png"
                alt="Ragnarök"
                width={48} height={48}
                className="h-8 w-auto opacity-70"
                loading="lazy"
              />
              <span className="text-sm font-semibold tracking-widest"
                style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
                Ragnarök
              </span>
            </div>
            <nav className="flex gap-5 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
              <Link href="#shop" className="hover:text-white transition-colors">Shop</Link>
              <Link href="/account" className="hover:text-white transition-colors">Account</Link>
              <Link href="/policies" className="hover:text-white transition-colors">Policies</Link>
              <Link href="/community" className="hover:text-white transition-colors">Community</Link>
            </nav>
          </div>
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--nrs-border-subtle)" }}>
            <RunicDivider runes="ᚱ" className="mb-4 opacity-40" />
            <p className="text-center text-xs" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
              {globalContent?.footer?.company_info ?? `© ${new Date().getFullYear()} SONCAR Limited · soncar.co.uk · All rights reserved.`}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
