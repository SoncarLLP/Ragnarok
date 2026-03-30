import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ProductEditor from "./ProductEditor";
import type { DBProductWithImages } from "@/lib/site-management";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProductEditorPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: product }, { data: draft }, { data: allProducts }] = await Promise.all([
    admin.from("products").select("*, product_images(*)").eq("id", id).single(),
    admin
      .from("content_drafts")
      .select("*")
      .eq("entity_type", "product")
      .eq("entity_id", id)
      .single(),
    admin.from("products").select("id, slug, name").order("name"),
  ]);

  if (!product) notFound();

  return (
    <ProductEditor
      product={product as DBProductWithImages}
      initialDraft={draft?.draft_data ?? null}
      hasDraft={draft?.has_unpublished_changes ?? false}
      draftUpdatedAt={draft?.updated_at ?? null}
      allProducts={(allProducts ?? []).filter((p: { id: string }) => p.id !== id)}
    />
  );
}
