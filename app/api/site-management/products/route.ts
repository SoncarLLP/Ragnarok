import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Verify the caller is a super_admin
async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "super_admin" ? user : null;
}

// GET /api/site-management/products — list all products
export async function GET() {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("*, product_images(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

// POST /api/site-management/products — create new product
export async function POST(req: NextRequest) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("products")
    .insert({
      slug: body.slug,
      name: body.name,
      description_html: body.description_html ?? "",
      price_pence: body.price_pence ?? 3000,
      stock_status: body.stock_status ?? "in_stock",
      visibility: body.visibility ?? "hidden",
      is_featured: body.is_featured ?? false,
      primary_image_url: body.primary_image_url ?? null,
      custom_segments: body.custom_segments ?? [],
      meta_title: body.meta_title ?? null,
      meta_description: body.meta_description ?? null,
      related_product_ids: body.related_product_ids ?? [],
      loyalty_multiplier: body.loyalty_multiplier ?? 1.0,
      sort_order: body.sort_order ?? 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data }, { status: 201 });
}
