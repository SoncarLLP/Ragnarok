"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getProduct, type Product } from "@/lib/products";

type Line = { slug: Product["slug"]; qty: number };
const LS_KEY = "soncar_cart_v1";

export default function CartPage() {
  const [lines, setLines] = useCart();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const add = params.get("add");
    if (add && isSlug(add)) {
      setLines((prev) => {
        const f = prev.find((l) => l.slug === add);
        return f ? prev.map((l) => (l.slug === add ? { ...l, qty: l.qty + 1 } : l)) : [...prev, { slug: add, qty: 1 }];
      });
      history.replaceState(null, "", "/cart");
    }
  }, [setLines]);

  const items = useMemo(() => lines.map((l) => ({ ...getProduct(l.slug)!, qty: l.qty })), [lines]);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <main className="min-h-screen" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Your Cart</h1>

        {items.length === 0 ? (
          <p className="mt-6 text-neutral-400">
            Your cart is empty. <Link href="/#shop" className="underline">Continue shopping</Link>.
          </p>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {items.map((it) => (
                <div key={it.slug} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-3">
                  <Image
                    src={it.image}
                    alt=""
                    width={80}
                    height={80}
                    className="w-20 h-20 object-contain rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm text-neutral-400">£{it.price.toFixed(2)}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="px-2 py-1 bg-white/10 rounded" onClick={() => dec(setLines, it.slug)}>-</button>
                      <span>{it.qty}</span>
                      <button className="px-2 py-1 bg-white/10 rounded" onClick={() => inc(setLines, it.slug)}>+</button>
                      <button className="ml-3 px-2 py-1 bg-white/10 rounded" onClick={() => remove(setLines, it.slug)}>Remove</button>
                    </div>
                  </div>
                  <div className="font-medium">£{(it.price * it.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
              <div className="text-neutral-400">Subtotal</div>
              <div className="text-xl font-semibold">£{subtotal.toFixed(2)}</div>
            </div>
            <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 text-sm">
              <span className="px-2 py-0.5 mr-2 rounded bg-amber-500/20 text-xs">Premium</span>
              Same-day ship • next-day delivery available at checkout.
            </div>

            <div className="mt-6 space-y-3">
              <div className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-center text-sm text-neutral-400">
                Payments coming soon — thank you for your interest!
              </div>
              <Link
                href="/#shop"
                className="block text-center px-4 py-2 rounded bg-white/5 hover:bg-white/10 text-sm"
              >
                Continue shopping
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// ---------- cart helpers ----------
function isSlug(x: string): x is Product["slug"] {
  return ["freyjas-bloom", "duemmens-nectar", "loki-hell-fire"].includes(x);
}

function useCart() {
  const [lines, setLines] = useState<Line[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Line[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);
  return [lines, setLines] as const;
}
function inc(setLines: React.Dispatch<React.SetStateAction<Line[]>>, slug: Line["slug"]) {
  setLines((prev) => prev.map((l) => (l.slug === slug ? { ...l, qty: l.qty + 1 } : l)));
}
function dec(setLines: React.Dispatch<React.SetStateAction<Line[]>>, slug: Line["slug"]) {
  setLines((prev) => prev.map((l) => (l.slug === slug ? { ...l, qty: Math.max(1, l.qty - 1) } : l)));
}
function remove(setLines: React.Dispatch<React.SetStateAction<Line[]>>, slug: Line["slug"]) {
  setLines((prev) => prev.filter((l) => l.slug !== slug));
}
