import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DBProduct } from "@/lib/site-management";
import { STOCK_STATUS_LABELS, VISIBILITY_LABELS, penceToDisplay } from "@/lib/site-management";
import ProductListActions from "./ProductListActions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const admin = createAdminClient();

  const [{ data: products }, { data: drafts }] = await Promise.all([
    admin
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    admin
      .from("content_drafts")
      .select("entity_id, has_unpublished_changes")
      .eq("entity_type", "product")
      .eq("has_unpublished_changes", true),
  ]);

  const draftIds = new Set(drafts?.map((d) => d.entity_id) ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-neutral-400 text-sm mt-0.5">
            {products?.length ?? 0} products · changes go live only when you publish
          </p>
        </div>
        <Link
          href="/site-management/products/new"
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-semibold transition"
        >
          + New product
        </Link>
      </div>

      {/* Products list */}
      <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {!products || products.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-sm">
            No products yet.{" "}
            <Link href="/site-management/products/new" className="text-amber-300 hover:underline">
              Create your first product →
            </Link>
          </div>
        ) : (
          products.map((p: DBProduct) => {
            const hasDraft = draftIds.has(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition"
              >
                {/* Primary image thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {p.primary_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.primary_image_url}
                      alt={p.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-neutral-600 text-xl">📦</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{p.name}</span>
                    {hasDraft && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                        Draft
                      </span>
                    )}
                    {p.is_featured && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    <span>{p.slug}</span>
                    <span>·</span>
                    <span>{penceToDisplay(p.price_pence)}</span>
                    <span>·</span>
                    <span className={
                      p.stock_status === "in_stock" ? "text-emerald-400" :
                      p.stock_status === "low_stock" ? "text-amber-400" :
                      p.stock_status === "out_of_stock" ? "text-red-400" :
                      "text-neutral-400"
                    }>
                      {STOCK_STATUS_LABELS[p.stock_status]}
                    </span>
                    <span>·</span>
                    <span className={
                      p.visibility === "published" ? "text-emerald-400" :
                      p.visibility === "hidden" ? "text-neutral-400" :
                      "text-red-400/70"
                    }>
                      {VISIBILITY_LABELS[p.visibility]}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/product/${p.slug}?preview=1`}
                    target="_blank"
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:border-white/25 transition"
                  >
                    Preview ↗
                  </Link>
                  <Link
                    href={`/site-management/products/${p.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-neutral-300 hover:text-white transition"
                  >
                    Edit
                  </Link>
                  <ProductListActions productId={p.id} productName={p.name} productSlug={p.slug} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
