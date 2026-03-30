import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role, full_name, username").eq("id", user.id).single();
  if (data?.role !== "super_admin") return null;
  return { user, profile: data };
}

type Params = { params: Promise<{ id: string }> };

// POST /api/site-management/products/[id]/publish
// Applies the draft (or provided data) to the live product row
export async function POST(req: NextRequest, { params }: Params) {
  const result = await assertSuperAdmin();
  if (!result) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user, profile } = result;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  // Fetch the existing product for the snapshot
  const { data: existing } = await admin
    .from("products")
    .select("*, product_images(*)")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Fetch the draft (if any) — merge with body overrides
  const { data: draft } = await admin
    .from("content_drafts")
    .select("draft_data")
    .eq("entity_type", "product")
    .eq("entity_id", id)
    .single();

  const draftData = draft?.draft_data ?? {};

  // Allowed publishable fields
  const publishable = [
    "slug", "name", "description_html", "price_pence", "stock_status",
    "visibility", "is_featured", "primary_image_url", "custom_segments",
    "meta_title", "meta_description", "related_product_ids", "loyalty_multiplier",
    "sort_order",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  for (const key of publishable) {
    if (key in draftData) patch[key] = draftData[key];
    if (key in body) patch[key] = body[key]; // body overrides draft
  }

  // Save publish history snapshot (current live state before overwrite)
  const publisherName = profile.full_name || profile.username || user.email || "Super Admin";
  await admin.from("publish_history").insert({
    entity_type: "product",
    entity_id: id,
    snapshot: existing,
    published_by: user.id,
    publisher_name: publisherName,
    notes: body.notes ?? null,
  });

  // Apply patch to live product
  const { data: updated, error } = await admin
    .from("products")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Clear the draft
  await admin
    .from("content_drafts")
    .update({ has_unpublished_changes: false })
    .eq("entity_type", "product")
    .eq("entity_id", id);

  return NextResponse.json({ product: updated });
}
