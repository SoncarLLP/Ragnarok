"use client";

import { useState } from "react";
import Link from "next/link";
import type { DBProduct } from "@/lib/site-management";
import { STOCK_STATUS_LABELS, VISIBILITY_LABELS, penceToDisplay } from "@/lib/site-management";
import ProductListActions from "./ProductListActions";

interface Props {
  products: DBProduct[];
  draftIds: Set<string>;
}

export default function ProductsClient({ products, draftIds }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? products.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description_html?.toLowerCase() ?? "").includes(q) ||
          (typeof p.custom_segments === "string"
            ? (p.custom_segments as string).toLowerCase().includes(q)
            : JSON.stringify(p.custom_segments).toLowerCase().includes(q))
        );
      })
    : products;

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-3 mb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, description…"
          className="flex-1 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-amber-400/40"
        />
        {search && (
          <span className="text-xs text-neutral-500">
            {filtered.length} of {products.length}
          </span>
        )}
      </div>

      {/* Products list */}
      <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-sm">
            {search ? `No products match "${search}".` : "No products yet."}{" "}
            {!search && (
              <Link href="/site-management/products/new" className="text-amber-300 hover:underline">
                Create your first product →
              </Link>
            )}
          </div>
        ) : (
          filtered.map((p) => {
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
                    href={`/site-management/products/${p.id}/design`}
                    className="text-xs px-3 py-1.5 rounded-lg border transition font-medium"
                    style={{
                      background: "linear-gradient(135deg, rgba(201,132,156,0.1), rgba(212,152,10,0.1))",
                      borderColor: "rgba(200,150,100,0.2)",
                      color: "#e8a878",
                    }}
                    title="Open Design Studio"
                  >
                    ✦ Design
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
    </>
  );
}
