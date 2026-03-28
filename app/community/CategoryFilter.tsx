"use client";

import { useRouter, usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/community";

export default function CategoryFilter({ activeCategory }: { activeCategory?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function select(cat: string | undefined) {
    if (!cat) {
      router.push(pathname);
    } else {
      router.push(`${pathname}?category=${encodeURIComponent(cat)}`);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => select(undefined)}
        className={`px-3 py-1.5 rounded-full text-sm transition ${
          !activeCategory
            ? "bg-white/15 text-white"
            : "bg-white/5 text-neutral-400 hover:text-white"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => select(cat)}
          className={`px-3 py-1.5 rounded-full text-sm transition ${
            activeCategory === cat
              ? "bg-amber-500/25 text-amber-300"
              : "bg-white/5 text-neutral-400 hover:text-white"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
