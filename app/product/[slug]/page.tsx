import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProduct, type Product } from "@/lib/products";
import type { DBProductWithImages, CustomSegment, ProductTheme } from "@/lib/site-management";
import { STOCK_STATUS_LABELS, penceToDisplay, DEFAULT_PRODUCT_THEMES } from "@/lib/site-management";
import RunicDivider from "@/components/RunicDivider";
import ProductThemeApplier from "@/components/ProductThemeApplier";
import ProductParticleCanvas from "@/components/ProductParticleCanvas";
import NorseKnotworkFrame from "@/components/NorseKnotworkFrame";

const STATIC_SLUGS = ["freyjas-bloom", "duemmens-nectar", "loki-hell-fire"] as const;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export default async function ProductPage(props: Props) {
  const { slug }    = await props.params;
  const { preview } = await props.searchParams;
  const isPreview   = preview === "1";

  if (!slug) return notFound();

  const admin = createAdminClient();

  let dbProduct: DBProductWithImages | null = null;
  let previewDraft: DBProductWithImages | null = null;

  const { data: fromDb } = await admin
    .from("products")
    .select("*, product_images(*)")
    .eq("slug", slug)
    .single();

  dbProduct = fromDb as DBProductWithImages | null;

  if (isPreview && dbProduct) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role === "super_admin") {
        const { data: draft } = await admin
          .from("content_drafts")
          .select("draft_data")
          .eq("entity_type", "product")
          .eq("entity_id", dbProduct.id)
          .single();
        if (draft?.draft_data) {
          previewDraft = { ...dbProduct, ...(draft.draft_data as Partial<DBProductWithImages>) };
        }
      }
    }
  }

  const product = previewDraft ?? dbProduct;

  let staticProduct: Product | null = null;
  if (!product) {
    const isStaticSlug = (STATIC_SLUGS as readonly string[]).includes(slug);
    if (!isStaticSlug) return notFound();
    staticProduct = getProduct(slug as Product["slug"]);
    if (!staticProduct) return notFound();
  }

  if (product && product.visibility !== "published" && !isPreview) return notFound();

  // ── Resolve product theme ──────────────────────────────────────────────────
  // Priority: DB theme JSONB → DEFAULT_PRODUCT_THEMES fallback → null (no override)
  const resolvedTheme: ProductTheme | null =
    (product?.theme as ProductTheme | null | undefined) ??
    DEFAULT_PRODUCT_THEMES[slug] ??
    null;

  const particleEffect = resolvedTheme?.particleEffect ?? "none";

  // ── DB product render ──────────────────────────────────────────────────────
  if (product) {
    const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
    const primaryImage = images.find((img) => img.is_primary) ?? images[0];
    const displayImages = primaryImage
      ? [primaryImage, ...images.filter((img) => img.id !== primaryImage.id)]
      : images;

    const relatedProducts = product.related_product_ids?.length
      ? await admin
          .from("products")
          .select("id, slug, name, primary_image_url, price_pence")
          .in("id", product.related_product_ids)
          .eq("visibility", "published")
          .limit(4)
      : { data: [] };

    return (
      <>
        {/* Apply product theme client-side with smooth transition */}
        {resolvedTheme && <ProductThemeApplier theme={resolvedTheme} />}

        <main style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)", minHeight: "100vh", position: "relative" }}>
          {/* Ambient particle effect for this product */}
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
            <ProductParticleCanvas effectType={particleEffect} />
          </div>

          {/* Header */}
          <header className="nrs-header sticky top-0 z-40">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 no-underline">
                <Image src="/soncar-logo-ragnarok.png" alt="Ragnarök" width={48} height={48} className="h-7 w-auto" priority />
                <span className="font-semibold text-sm tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
                  Ragnarök
                </span>
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link href="/#shop" className="nrs-nav-link hidden md:block">Shop</Link>
                <Link href="/cart" className="nrs-btn text-xs py-1.5 px-3">Cart</Link>
              </nav>
            </div>
          </header>

          {isPreview && (
            <div className="sticky top-0 z-50 text-center text-sm py-2 font-semibold"
              style={{ background: "rgba(201,168,76,0.9)", color: "#0a0a0f" }}>
              ⚑ Preview mode — changes not yet published
            </div>
          )}

          <section className="mx-auto max-w-5xl px-4 py-12 relative z-10">
            <div className="grid md:grid-cols-2 gap-12">

              {/* ── Product images ─────────────────────────────────────────── */}
              <div className="space-y-4">
                {/* Main image with Norse knotwork frame */}
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    background: "var(--nrs-bg-2)",
                    border: "1px solid var(--nrs-accent-border)",
                    boxShadow: "var(--nrs-glow)",
                    padding: "1.5rem",
                    /* isolation:isolate keeps mix-blend-mode contained to this box */
                    isolation: "isolate",
                    color: "var(--nrs-accent)",
                  }}
                >
                  {/* Norse knotwork frame — full interlaced SVG border */}
                  <NorseKnotworkFrame />

                  {displayImages.length > 0 ? (
                    <Image
                      src={displayImages[0].url}
                      alt={displayImages[0].alt_text || product.name}
                      width={500} height={600}
                      className="object-contain w-full h-[30rem] relative z-[1]"
                      priority
                      style={{
                        /* multiply: white pixels blend into the dark container
                           background and disappear; packaging artwork remains visible */
                        mixBlendMode: "multiply",
                      }}
                    />
                  ) : product.primary_image_url ? (
                    <Image
                      src={product.primary_image_url}
                      alt={product.name}
                      width={500} height={600}
                      className="object-contain w-full h-[30rem] relative z-[1]"
                      priority
                      style={{ mixBlendMode: "multiply" }}
                    />
                  ) : (
                    <div className="w-full h-[30rem] flex items-center justify-center"
                      style={{ color: "var(--nrs-text-muted)" }}>
                      No image
                    </div>
                  )}
                </div>

                {/* Thumbnail strip */}
                {displayImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {displayImages.map((img) => (
                      <div key={img.id}
                        className="w-16 h-16 rounded-lg overflow-hidden shrink-0"
                        style={{
                          background: "var(--nrs-bg-2)",
                          border: "1px solid var(--nrs-border)",
                          isolation: "isolate",
                        }}>
                        <Image
                          src={img.url} alt={img.alt_text || product.name}
                          width={64} height={64}
                          className="w-full h-full object-contain"
                          style={{ mixBlendMode: "multiply" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Product details ────────────────────────────────────────── */}
              <div>
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {product.is_featured && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold tracking-wide"
                      style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", border: "1px solid var(--nrs-accent-border)" }}>
                      Featured
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    product.stock_status === "in_stock"     ? "bg-emerald-500/15 text-emerald-400" :
                    product.stock_status === "low_stock"    ? "bg-amber-500/15 text-amber-400"     :
                    product.stock_status === "out_of_stock" ? "bg-red-500/15 text-red-400"         :
                    "bg-neutral-700 text-neutral-400"
                  }`}>
                    {STOCK_STATUS_LABELS[product.stock_status]}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold mb-3 nrs-heading"
                  style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.04em", color: "var(--nrs-heading-color, var(--nrs-text))" }}>
                  {product.name}
                </h1>

                {/* Runic line under title */}
                <div className="mb-4 h-px"
                  style={{ background: "linear-gradient(90deg, var(--nrs-accent-border), transparent)" }}
                  aria-hidden="true" />

                {/* Description */}
                {product.description_html && (
                  <div
                    className="prose-norse prose prose-sm max-w-none mb-5"
                    style={{ fontFamily: "var(--font-body)", fontSize: "1.05rem", lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: product.description_html }}
                  />
                )}

                {/* Price */}
                <div className="text-3xl font-bold mb-1"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
                  {penceToDisplay(product.price_pence)}
                </div>

                {product.loyalty_multiplier > 1 && (
                  <div className="text-xs mb-5" style={{ color: "var(--nrs-accent)" }}>
                    ᚱ {product.loyalty_multiplier}× loyalty points on this item
                  </div>
                )}

                {/* CTA buttons */}
                <div className="mt-6 flex gap-3 flex-wrap">
                  <Link
                    href={`/cart?add=${product.slug}`}
                    className="nrs-btn nrs-btn-primary nrs-btn-traced px-7 py-3 font-bold uppercase tracking-widest text-sm"
                  >
                    Add to Cart
                  </Link>
                  <Link href="/#shop" className="nrs-btn px-5 py-3 text-sm">
                    Back to Shop
                  </Link>
                </div>

                {/* Delivery info — styled as ancient scroll panel */}
                <div className="mt-8 rounded-xl p-5"
                  style={{
                    background: "var(--nrs-panel)",
                    border: "1px solid var(--nrs-border)",
                  }}>
                  <p className="text-xs font-semibold mb-3 tracking-widest uppercase"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
                    Dispatch & Delivery
                  </p>
                  <ul className="space-y-1.5 text-sm" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
                    <li className="flex items-center gap-2">
                      <span style={{ color: "var(--nrs-accent)" }}>✦</span> UK dispatch 1–2 working days
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: "var(--nrs-accent)" }}>✦</span> Premium: same-day ship, next-day delivery
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: "var(--nrs-accent)" }}>✦</span> Free UK delivery £60+
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ── Custom segments (parchment panels) ──────────────────────── */}
            {product.custom_segments && product.custom_segments.length > 0 && (
              <div className="mt-14 space-y-1">
                <RunicDivider runes="ᛁᚾᚷᚱᛖᛞᛁᛖᚾᛏᛋ" className="mb-8" />
                {(product.custom_segments as CustomSegment[]).map((seg) => (
                  <div key={seg.id}
                    className="rounded-xl p-7"
                    style={{
                      background: "var(--nrs-panel)",
                      border: "1px solid var(--nrs-border)",
                      marginBottom: "1rem",
                    }}>
                    <h2 className="text-lg font-bold mb-4"
                      style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)", letterSpacing: "0.06em" }}>
                      {seg.title}
                    </h2>
                    <div className="h-px mb-4"
                      style={{ background: "linear-gradient(90deg, var(--nrs-accent-border), transparent)" }}
                      aria-hidden="true" />
                    <div
                      className="prose-norse prose prose-sm max-w-none"
                      style={{ fontFamily: "var(--font-body)", fontSize: "1rem", lineHeight: 1.75 }}
                      dangerouslySetInnerHTML={{ __html: seg.content_html }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Related products ──────────────────────────────────────────── */}
            {relatedProducts.data && relatedProducts.data.length > 0 && (
              <div className="mt-14">
                <RunicDivider runes="ᛋᛁᛗᛁᛚᚨᚱ" className="mb-8" />
                <h2 className="text-xl font-bold mb-6 text-center"
                  style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.06em" }}>
                  You Might Also Like
                </h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(relatedProducts.data as any[]).map((rp) => (
                    <Link key={rp.id} href={`/product/${rp.slug}`} className="nrs-card overflow-hidden group">
                      {rp.primary_image_url && (
                        <div className="p-3" style={{ background: "var(--nrs-bg-2)" }}>
                          <Image
                            src={rp.primary_image_url} alt={rp.name}
                            width={200} height={200}
                            className="w-full h-28 object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-text)" }}>{rp.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--nrs-accent)" }}>{penceToDisplay(rp.price_pence)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer style={{ borderTop: "1px solid var(--nrs-border)", background: "var(--nrs-bg-2)", position: "relative", zIndex: 10 }}>
            <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs"
              style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-ui)" }}>
              © {new Date().getFullYear()} SONCAR Limited · All rights reserved.
            </div>
          </footer>
        </main>
      </>
    );
  }

  // ── Static fallback ────────────────────────────────────────────────────────
  const p = staticProduct!;
  return (
    <>
      {resolvedTheme && <ProductThemeApplier theme={resolvedTheme} />}

      <main style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)", minHeight: "100vh", position: "relative" }}>
        {/* Ambient particles */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} aria-hidden="true">
          <ProductParticleCanvas effectType={particleEffect} />
        </div>

        <header className="nrs-header sticky top-0 z-40">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/soncar-logo-ragnarok.png" alt="Ragnarök" width={48} height={48} className="h-7 w-auto" />
              <span className="font-semibold text-sm tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
                Ragnarök
              </span>
            </Link>
          </div>
        </header>
        <section className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-2 gap-12 relative z-10">
          {/* Image */}
          <div className="relative rounded-xl overflow-hidden p-6"
            style={{
              background: "var(--nrs-bg-2)",
              border: "1px solid var(--nrs-accent-border)",
              boxShadow: "var(--nrs-glow)",
              isolation: "isolate",
              color: "var(--nrs-accent)",
            }}>
            {/* Norse knotwork frame — full interlaced SVG border */}
            <NorseKnotworkFrame />
            <Image
              src={p.image} alt={p.name}
              width={500} height={600}
              className="object-contain w-full h-[30rem] relative z-[1]"
              priority
              style={{ mixBlendMode: "multiply" }}
            />
          </div>
          {/* Details */}
          <div>
            <h1 className="text-3xl font-bold mb-3 nrs-heading"
              style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-heading-color, var(--nrs-text))" }}>
              {p.name}
            </h1>
            <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, var(--nrs-accent-border), transparent)" }} aria-hidden="true" />
            <div className="mb-5" style={{ color: "var(--nrs-text-muted)", fontFamily: "var(--font-body)", fontSize: "1.05rem" }}>
              {p.blurb}
            </div>
            <div className="text-3xl font-bold mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
              £{p.price.toFixed(2)}
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href={`/cart?add=${p.slug}`}
                className="nrs-btn nrs-btn-primary nrs-btn-traced px-7 py-3 font-bold uppercase tracking-widest text-sm">
                Add to Cart
              </Link>
              <Link href="/#shop" className="nrs-btn px-5 py-3 text-sm">
                Back to Shop
              </Link>
            </div>
            <div className="mt-8 rounded-xl p-5"
              style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)" }}>
              <p className="text-xs font-semibold mb-3 tracking-widest uppercase"
                style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
                Dispatch & Delivery
              </p>
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
                <li className="flex items-center gap-2"><span style={{ color: "var(--nrs-accent)" }}>✦</span> UK dispatch 1–2 working days</li>
                <li className="flex items-center gap-2"><span style={{ color: "var(--nrs-accent)" }}>✦</span> Premium: same-day ship, next-day delivery</li>
                <li className="flex items-center gap-2"><span style={{ color: "var(--nrs-accent)" }}>✦</span> Free UK delivery £60+</li>
              </ul>
            </div>
          </div>
        </section>
        <footer style={{ borderTop: "1px solid var(--nrs-border)", background: "var(--nrs-bg-2)", position: "relative", zIndex: 10 }}>
          <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            © {new Date().getFullYear()} SONCAR Limited · All rights reserved.
          </div>
        </footer>
      </main>
    </>
  );
}
