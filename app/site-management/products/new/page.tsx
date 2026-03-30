"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(
      v
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/site-management/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          visibility: "hidden",
          stock_status: "in_stock",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create product");
      router.push(`/site-management/products/${data.product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setCreating(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/site-management/products" className="text-neutral-500 hover:text-white text-sm transition">
          ← Products
        </Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-lg font-semibold">New product</h1>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-300">Product name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
            placeholder="e.g. Freyja's Bloom"
            autoFocus
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-300">URL slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
            }
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30 font-mono"
            placeholder="freyjas-bloom"
            required
          />
          <p className="text-xs text-neutral-600">/product/{slug || "..."}</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={creating || !name.trim() || !slug.trim()}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-semibold transition disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create product"}
          </button>
          <Link
            href="/site-management/products"
            className="px-4 py-2 rounded-lg border border-white/15 text-sm text-neutral-400 hover:text-white transition"
          >
            Cancel
          </Link>
        </div>
      </form>

      <p className="text-xs text-neutral-600">
        The product will start as Hidden. You can add details and publish when ready.
      </p>
    </div>
  );
}
