// lib/products.ts
export type Product = {
  slug: "freyjas-bloom" | "duemmens-nectar" | "loki-hell-fire";
  name: string;
  price: number;
  image: string;        // /public path, e.g. /images/products/xxx.jpg
  blurb: string;
};

export const products: Product[] = [
  {
    slug: "freyjas-bloom",
    name: "Freyja’s Bloom",
    price: 30,
    image: "/images/products/freyjas-bloom.jpg",
    blurb: "Radiant blend for recovery & glow.",
    // checkoutUrl: "https://buy.stripe.com/...", // optional if you have per-SKU links
  },
  {
    slug: "duemmens-nectar",
    name: "Dümmens Nectar",
    price: 30,
    image: "/images/products/duemmens-nectar.jpg",
    blurb: "Golden hydration with performance minerals.",
  },
  {
    slug: "loki-hell-fire",
    name: "Loki hell fire",
    price: 30,
    image: "/images/products/loki-hell-fire.jpg",
    blurb: "Bold energy with a mythic edge.",
  },
];

export function getProduct(slug: Product["slug"]) {
  return products.find(p => p.slug === slug) || null;
}
