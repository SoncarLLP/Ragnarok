import Link from "next/link";
import Image from "next/image";
import { products } from "@/lib/products";

export default function HomePage() {
  return (
    <main className="bg-neutral-950 text-neutral-100 min-h-screen">
      {/* Header (SONCAR + domain) */}
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
          </nav>
        </div>
      </header>

      {/* RAGNAROK Hero (prominent brand) */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10
            bg-[radial-gradient(1000px_500px_at_50%_-10%,rgba(182,125,42,0.20),transparent),
                radial-gradient(800px_400px_at_80%_10%,rgba(46,94,58,0.18),transparent)]"
        />
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
              RAGNAROK
            </span>{" "}
            by SONCAR
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-300">
            Functional protein blends with mythic flair—crafted for hydration, recovery, and daily glow.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="#shop" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
              Shop Bestsellers
            </Link>
            <Link href="/policies" className="px-4 py-2 rounded bg-white/5 hover:bg-white/10">
              Policies
            </Link>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="shop" className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-semibold">Bestsellers</h2>
        <p className="mt-2 text-neutral-300">£30 each · Free UK delivery over £60</p>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <article
              key={p.slug}
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition"
            >
              {/* Image wrapper: object-contain to show the full pouch */}
              <div className="bg-neutral-900/40 grid place-items-center p-3">
                <Link href={`/product/${p.slug}`} className="block w-full">
                  <Image
                    src={p.image}
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
                <div className="mt-2 text-neutral-400 text-sm">{p.blurb}</div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold">£{p.price.toFixed(2)}</span>
                  <Link
                    href={`/cart?add=${p.slug}`}
                    className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
                  >
                    Add to cart
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Premium Shipping callout */}
        <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 text-sm">
          <span className="px-2 py-0.5 mr-2 rounded bg-amber-500/20 text-xs">Premium</span>
          Same-day ship • next-day delivery available at checkout.
        </div>
      </section>

      {/* Footer (lightweight; replace with your full Footer component if preferred) */}
      <footer className="border-t border-white/10 bg-neutral-950/60">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} SONCAR Limited · soncar.co.uk · All rights reserved.
        </div>
      </footer>
    </main>
  );
}
