import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProduct, type Product } from "@/lib/products";
import type { DBProductWithImages, CustomSegment } from "@/lib/site-management";
import { STOCK_STATUS_LABELS, penceToDisplay } from "@/lib/site-management";

const STATIC_SLUGS = ["freyjas-bloom", "duemmens-nectar", "loki-hell-fire"] as const;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export default async function ProductPage(props: Props) {
  const { slug } = await props.params;
  const { preview } = await props.searchParams;
  const isPreview = preview === "1";

  if (!slug) return notFound();

  const admin = createAdminClient();

  // ── Try DB first ──────────────────────────────────────────────
  let dbProduct: DBProductWithImages | null = null;
  let previewDraft: DBProductWithImages | null = null;

  const { data: fromDb } = await admin
    .from("products")
    .select("*, product_images(*)")
    .eq("slug", slug)
    .single();

  dbProduct = fromDb as DBProductWithImages | null;

  // In preview mode, check if the user is a super_admin and load draft
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

  // ── Fall back to static data if not in DB ─────────────────────
  let staticProduct: Product | null = null;
  if (!product) {
    const isStaticSlug = (STATIC_SLUGS as readonly string[]).includes(slug);
    if (!isStaticSlug) return notFound();
    staticProduct = getProduct(slug as Product["slug"]);
    if (!staticProduct) return notFound();
  }

  // ── If product is hidden/archived and not in preview mode, 404 ─
  if (product && product.visibility !== "published" && !isPreview) {
    return notFound();
  }

  // Render DB product
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
      <main className="bg-neutral-950 text-neutral-100 min-h-screen">
        {isPreview && (
          <div className="sticky top-0 z-50 bg-amber-500/90 text-neutral-950 text-center text-sm py-2 font-semibold">
            ⚑ Preview mode — changes not yet published
          </div>
        )}

        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Images */}
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-4 grid place-items-center">
                {displayImages.length > 0 ? (
                  <Image
                    src={displayImages[0].url}
                    alt={displayImages[0].alt_text || product.name}
                    width={500}
                    height={600}
                    className="object-contain w-full h-[28rem]"
                    priority
                  />
                ) : product.primary_image_url ? (
                  <Image
                    src={product.primary_image_url}
                    alt={product.name}
                    width={500}
                    height={600}
                    className="object-contain w-full h-[28rem]"
                    priority
                  />
                ) : (
                  <div className="w-full h-[28rem] flex items-center justify-center text-neutral-600">
                    No image
                  </div>
                )}
              </div>
              {/* Thumbnail strip */}
              {displayImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {displayImages.map((img) => (
                    <div key={img.id} className="w-16 h-16 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                      <Image
                        src={img.url}
                        alt={img.alt_text || product.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {product.is_featured && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Featured</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  product.stock_status === "in_stock" ? "bg-emerald-500/15 text-emerald-400" :
                  product.stock_status === "low_stock" ? "bg-amber-500/15 text-amber-400" :
                  product.stock_status === "out_of_stock" ? "bg-red-500/15 text-red-400" :
                  "bg-neutral-700 text-neutral-400"
                }`}>
                  {STOCK_STATUS_LABELS[product.stock_status]}
                </span>
              </div>

              <h1 className="text-3xl font-semibold">{product.name}</h1>
              {product.description_html && (
                <div
                  className="mt-3 text-neutral-300 prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description_html }}
                />
              )}
              <div className="mt-4 text-xl font-semibold">{penceToDisplay(product.price_pence)}</div>
              {product.loyalty_multiplier > 1 && (
                <div className="mt-1 text-xs text-amber-300">
                  🏅 {product.loyalty_multiplier}× loyalty points on this product
                </div>
              )}

              <div className="mt-6 flex gap-3 flex-wrap">
                <Link
                  href={`/cart?add=${product.slug}`}
                  className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition"
                >
                  Add to cart
                </Link>
                <Link
                  href="/#shop"
                  className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 transition"
                >
                  Back to shop
                </Link>
              </div>

              <ul className="mt-8 text-sm text-neutral-300 space-y-2">
                <li>• UK dispatch 1–2 working days</li>
                <li>• Premium: same-day ship, next-day delivery</li>
                <li>• Free UK delivery £60+</li>
              </ul>
            </div>
          </div>

          {/* Custom segments */}
          {product.custom_segments && product.custom_segments.length > 0 && (
            <div className="mt-12 space-y-6">
              {(product.custom_segments as CustomSegment[]).map((seg) => (
                <div key={seg.id} className="border-t border-white/10 pt-6">
                  <h2 className="text-lg font-semibold mb-3">{seg.title}</h2>
                  <div
                    className="text-neutral-300 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: seg.content_html }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Related products */}
          {relatedProducts.data && relatedProducts.data.length > 0 && (
            <div className="mt-12">
              <h2 className="text-lg font-semibold mb-4">You might also like</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(relatedProducts.data as any[]).map((rp) => (
                  <Link
                    key={rp.id}
                    href={`/product/${rp.slug}`}
                    className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20 overflow-hidden transition"
                  >
                    {rp.primary_image_url && (
                      <div className="bg-neutral-900 p-2">
                        <Image
                          src={rp.primary_image_url}
                          alt={rp.name}
                          width={200}
                          height={200}
                          className="w-full h-32 object-contain"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium">{rp.name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{penceToDisplay(rp.price_pence)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }

  // ── Static fallback ───────────────────────────────────────────
  const p = staticProduct!;
  return (
    <main className="bg-neutral-950 text-neutral-100 min-h-screen">
      <section className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-2 gap-10">
        <div className="bg-white/5 rounded-xl p-4 grid place-items-center">
          <Image
            src={p.image}
            alt={p.name}
            width={500}
            height={600}
            className="object-contain w-full h-[28rem]"
            priority
          />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">{p.name}</h1>
          <div className="mt-2 text-neutral-300">{p.blurb}</div>
          <div className="mt-4 text-xl font-semibold">£{p.price.toFixed(2)}</div>
          <div className="mt-6 flex gap-3">
            <Link href={`/cart?add=${p.slug}`} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
              Add to cart
            </Link>
            <Link href="/#shop" className="px-4 py-2 rounded bg-white/5 hover:bg-white/10">
              Back to shop
            </Link>
          </div>
          <ul className="mt-8 text-sm text-neutral-300 space-y-2">
            <li>• UK dispatch 1–2 working days</li>
            <li>• Premium: same-day ship, next-day delivery</li>
            <li>• Free UK delivery £60+</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
