import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { products as staticProducts } from "@/lib/products";
import NavWrapper from "@/components/NavWrapper";
import type { HomepageContent, GlobalContent, AnnouncementBar } from "@/lib/site-management";
import { defaultHomepageContent } from "@/lib/site-management";

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

  // Fetch homepage content (draft in preview mode, live otherwise)
  let homepageContent: HomepageContent = defaultHomepageContent();
  let globalContent: GlobalContent | null = null;

  if (isPreviewAuthorised) {
    // Load drafts for preview
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

  // Fetch products from DB; fall back to static
  const { data: dbProducts } = await admin
    .from("products")
    .select("id, slug, name, description_html, price_pence, primary_image_url, is_featured, visibility, sort_order")
    .eq("visibility", "published")
    .order("sort_order", { ascending: true });

  // Build display products list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProducts: any[] = dbProducts && dbProducts.length > 0 ? dbProducts : staticProducts.map((p) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    description_html: `<p>${p.blurb}</p>`,
    price_pence: p.price * 100,
    primary_image_url: p.image,
    is_featured: false,
    visibility: "published",
    sort_order: 0,
  }));

  // Featured products (if specified in content)
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
    <main className="bg-neutral-950 text-neutral-100 min-h-screen">
      {/* Preview banner */}
      {isPreviewAuthorised && (
        <div className="sticky top-0 z-50 bg-amber-500/90 text-neutral-950 text-center text-sm py-2 font-semibold">
          ⚑ Preview mode — changes not yet published ·{" "}
          <Link href="/" className="underline">Exit preview</Link>
        </div>
      )}

      {/* Site-wide announcement bar */}
      {announcementBar && (
        <div
          className="w-full text-center text-sm py-2 px-4 font-medium"
          style={{ backgroundColor: announcementBar.background_color }}
        >
          {announcementBar.link ? (
            <Link href={announcementBar.link} className="hover:underline">
              {announcementBar.text}
            </Link>
          ) : (
            announcementBar.text
          )}
        </div>
      )}

      {/* Header */}
      <header
        className="
          sticky top-0 z-40 border-b border-white/10
          bg-[radial-gradient(240px_120px_at_0%_50%,rgba(182,125,42,0.35),transparent),
              radial-gradient(180px_100px_at_15%_0%,rgba(46,94,58,0.25),transparent)]
          backdrop-blur
        "
      >
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/soncar-logo-ragnarok.png"
              alt="RAGNAROK logo"
              width={112}
              height={112}
              className="h-8 w-auto"
              priority
            />
            <span className="font-semibold tracking-wide">SONCAR</span>
            <span className="ml-2 text-xs px-2 py-1 rounded bg-white/10">soncar.co.uk</span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-neutral-300">
            <Link href="#shop" className="hidden md:block hover:text-white">Shop</Link>
            <Link href="/community" className="hidden md:block hover:text-white">Community</Link>
            <Link href="/policies" className="hidden md:block hover:text-white">Policies</Link>
            <Link href="/account" className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs">
              My Account
            </Link>
            <NavWrapper />
          </nav>
        </div>
      </header>

      {/* Homepage announcement banner */}
      {banner?.enabled && banner.text && (
        <div
          className="w-full text-center py-3 px-4 text-sm font-medium"
          style={{ backgroundColor: banner.background_color + "33", borderBottom: `1px solid ${banner.background_color}55` }}
        >
          {banner.text}
          {banner.link && banner.link_text && (
            <Link href={banner.link} className="ml-2 underline opacity-90 hover:opacity-100">
              {banner.link_text}
            </Link>
          )}
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        {hero.background_image_url ? (
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${hero.background_image_url})` }}
          />
        ) : (
          <div
            className="absolute inset-0 -z-10
              bg-[radial-gradient(1000px_500px_at_50%_-10%,rgba(182,125,42,0.20),transparent),
                  radial-gradient(800px_400px_at_80%_10%,rgba(46,94,58,0.18),transparent)]"
          />
        )}
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20 grid place-items-center text-center">
          <Image
            src="/soncar-logo-ragnarok.png"
            alt="RAGNAROK logo"
            width={320}
            height={320}
            className="h-28 md:h-40 w-auto drop-shadow-[0_0_12px_rgba(182,125,42,0.35)]"
            priority
          />
          <h1 className="mt-6 text-4xl md:text-6xl font-semibold leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300">
              {hero.heading}
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-300">{hero.subtitle}</p>
          <div className="mt-7 flex gap-3 flex-wrap justify-center">
            {hero.primary_cta_text && (
              <Link href={hero.primary_cta_link} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition">
                {hero.primary_cta_text}
              </Link>
            )}
            {hero.secondary_cta_text && (
              <Link href={hero.secondary_cta_link} className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 transition">
                {hero.secondary_cta_text}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured products section */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="text-xl font-semibold mb-5 text-amber-200">Featured</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 overflow-hidden transition"
              >
                {p.primary_image_url && (
                  <div className="bg-neutral-900/40 grid place-items-center p-3">
                    <Image src={p.primary_image_url} alt={p.name} width={300} height={300} className="h-48 w-full object-contain" loading="lazy" />
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-amber-300 text-sm mt-1 font-medium">
                    £{(p.price_pence / 100).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All products */}
      <section id="shop" className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-semibold">Bestsellers</h2>
        <p className="mt-2 text-neutral-300">£30 each · Free UK delivery over £60</p>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProducts.map((p) => (
            <article
              key={p.id ?? p.slug}
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition"
            >
              <div className="bg-neutral-900/40 grid place-items-center p-3">
                <Link href={`/product/${p.slug}`} className="block w-full">
                  <Image
                    src={p.primary_image_url ?? p.image ?? "/images/products/placeholder.jpg"}
                    alt={p.name}
                    width={600}
                    height={800}
                    className="h-80 w-full object-contain"
                    loading="lazy"
                  />
                </Link>
              </div>
              <div className="p-5">
                <Link href={`/product/${p.slug}`} className="text-lg font-semibold hover:underline">
                  {p.name}
                </Link>
                <div
                  className="mt-2 text-neutral-400 text-sm line-clamp-2"
                  dangerouslySetInnerHTML={{
                    __html: p.description_html ?? p.blurb ?? "",
                  }}
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold">
                    £{((p.price_pence ?? (p.price * 100)) / 100).toFixed(2)}
                  </span>
                  <Link
                    href={`/cart?add=${p.slug}`}
                    className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm transition"
                  >
                    Add to cart
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 text-sm">
          <span className="px-2 py-0.5 mr-2 rounded bg-amber-500/20 text-xs">Premium</span>
          Same-day ship • next-day delivery available at checkout.
        </div>
      </section>

      {/* Brand story section */}
      {brandStory.enabled && (brandStory.heading || brandStory.body_html) && (
        <section className="mx-auto max-w-7xl px-4 py-14 border-t border-white/5">
          <div className={`grid gap-10 ${brandStory.image_url ? "md:grid-cols-2" : ""} items-center`}>
            <div>
              {brandStory.heading && (
                <h2 className="text-2xl md:text-3xl font-semibold mb-4">{brandStory.heading}</h2>
              )}
              {brandStory.body_html && (
                <div
                  className="text-neutral-300 prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: brandStory.body_html }}
                />
              )}
            </div>
            {brandStory.image_url && (
              <div className="rounded-xl overflow-hidden">
                <Image
                  src={brandStory.image_url}
                  alt={brandStory.heading || "Brand story"}
                  width={600}
                  height={400}
                  className="w-full h-64 md:h-80 object-cover"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Custom homepage sections */}
      {customSections.map((sec) => (
        <section key={sec.id} className="mx-auto max-w-7xl px-4 py-14 border-t border-white/5">
          {sec.type === "text" && (
            <div>
              {sec.heading && <h2 className="text-2xl font-semibold mb-4">{sec.heading}</h2>}
              <div
                className="text-neutral-300 prose prose-invert prose-sm max-w-2xl"
                dangerouslySetInnerHTML={{ __html: sec.body_html }}
              />
            </div>
          )}
          {sec.type === "image" && sec.image_url && (
            <div>
              {sec.heading && <h2 className="text-2xl font-semibold mb-4">{sec.heading}</h2>}
              <Image src={sec.image_url} alt={sec.heading || ""} width={1200} height={400} className="w-full rounded-xl object-cover" />
            </div>
          )}
          {sec.type === "text_image" && (
            <div className={`grid md:grid-cols-2 gap-10 items-center ${sec.image_position === "left" ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div>
                {sec.heading && <h2 className="text-2xl font-semibold mb-4">{sec.heading}</h2>}
                <div
                  className="text-neutral-300 prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sec.body_html }}
                />
              </div>
              {sec.image_url && (
                <Image src={sec.image_url} alt={sec.heading || ""} width={600} height={400} className="w-full rounded-xl object-cover" />
              )}
            </div>
          )}
        </section>
      ))}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-neutral-950/60">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-neutral-500">
          {globalContent?.footer?.company_info ?? `© ${new Date().getFullYear()} SONCAR Limited · soncar.co.uk · All rights reserved.`}
        </div>
      </footer>
    </main>
  );
}
