import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ProductTheme,
  DesignPreset,
  DesignHistoryEntry,
} from "@/lib/site-management";
import DesignStudio from "./DesignStudio";

type Props = { params: Promise<{ id: string }> };

export default async function DesignStudioPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // Auth check
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") redirect("/site-management");

  // Load product
  const { data: product } = await admin
    .from("products")
    .select("id, slug, name, price_pence, primary_image_url, theme")
    .eq("id", id)
    .single();
  if (!product) notFound();

  // Load design draft
  const { data: draft } = await admin
    .from("product_design_drafts")
    .select("*")
    .eq("product_id", id)
    .single();

  // Load design history (last 10)
  const { data: historyRows } = await admin
    .from("product_design_history")
    .select("*")
    .eq("product_id", id)
    .order("published_at", { ascending: false })
    .limit(10);

  // Load all presets
  const { data: presetRows } = await admin
    .from("product_design_presets")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const liveTheme = (product.theme as ProductTheme | null) ?? null;
  const draftTheme = draft?.has_unpublished_changes
    ? (draft.theme_data as ProductTheme)
    : null;

  return (
    <DesignStudio
      productId={product.id}
      productSlug={product.slug}
      productName={product.name}
      pricePence={product.price_pence}
      primaryImageUrl={product.primary_image_url}
      liveTheme={liveTheme}
      initialDraftTheme={draftTheme}
      hasDraft={!!draft?.has_unpublished_changes}
      draftLastModified={draft?.last_modified_at ?? null}
      initialPresets={(presetRows ?? []) as DesignPreset[]}
      initialHistory={(historyRows ?? []) as DesignHistoryEntry[]}
    />
  );
}
