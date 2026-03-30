import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "super_admin" ? user : null;
}

type Params = { params: Promise<{ id: string }> };

// GET /api/site-management/products/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("*, product_images(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ product: data });
}

// PUT /api/site-management/products/[id] — update product fields
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  // Only update allowed fields
  const allowed = [
    "slug", "name", "description_html", "price_pence", "stock_status",
    "visibility", "is_featured", "primary_image_url", "custom_segments",
    "meta_title", "meta_description", "related_product_ids", "loyalty_multiplier",
    "sort_order",
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const { data, error } = await admin
    .from("products")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

// DELETE /api/site-management/products/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  // Also clean up drafts and images (cascaded by FK, but clean drafts manually)
  await admin.from("content_drafts").delete().eq("entity_type", "product").eq("entity_id", id);

  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
