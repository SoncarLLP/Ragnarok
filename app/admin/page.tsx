"use client";

import Link from "next/link";
import { products } from "@/lib/products";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">SONCAR Admin</h1>
          <Link href="/" className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            View site
          </Link>
        </div>

        <p className="mt-2 text-neutral-400 text-sm">
          Product descriptions are managed in <code className="text-neutral-200">lib/products.ts</code>.
        </p>

        <div className="mt-8 space-y-4">
          {products.map((p) => (
            <div key={p.slug} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-neutral-400">{p.slug}</div>
              <div className="text-lg font-medium">{p.name}</div>
              <div className="mt-2 text-sm text-neutral-300">{p.blurb}</div>
              <Link
                href={`/product/${p.slug}`}
                className="mt-3 inline-block text-xs text-neutral-400 hover:text-white"
              >
                View page →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
