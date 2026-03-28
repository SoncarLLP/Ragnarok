import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProduct, type Product } from "@/lib/products";

// Known slugs – used to safely narrow the dynamic route param
const SLUGS = ["freyjas-bloom", "duemmens-nectar", "loki-hell-fire"] as const;
type Slug = typeof SLUGS[number];
function isSlug(s: unknown): s is Slug {
  return typeof s === "string" && (SLUGS as readonly string[]).includes(s);
}

export default function ProductPage(props: unknown) {
  const params =
    props && typeof props === "object" && "params" in props
      ? (props as { params?: unknown }).params
      : undefined;

  const slug =
    params && typeof params === "object" && "slug" in params
      ? (params as { slug?: unknown }).slug
      : undefined;

  if (!isSlug(slug)) return notFound();

  const p = getProduct(slug as Product["slug"]);
  if (!p) return notFound();

  const blurb = p.blurb;

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
          <div className="mt-2 text-neutral-300">{blurb}</div>
          <div className="mt-4 text-xl font-semibold">£{p.price.toFixed(2)}</div>

          <div className="mt-6 flex gap-3">
            <Link
              href={`/cart?add=${p.slug}`}
              className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
            >
              Add to cart
            </Link>
            <Link
              href="/#shop"
              className="px-4 py-2 rounded bg-white/5 hover:bg-white/10"
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
      </section>
    </main>
  );
}
