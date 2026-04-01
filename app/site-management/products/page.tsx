import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DBProduct } from "@/lib/site-management";
import ProductsClient from "./ProductsClient";

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

      <ProductsClient
        products={(products ?? []) as DBProduct[]}
        draftIds={draftIds}
      />
    </div>
  );
}
