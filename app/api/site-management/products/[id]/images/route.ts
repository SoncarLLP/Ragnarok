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

// POST /api/site-management/products/[id]/images — upload image to storage + register in DB
export async function POST(req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WebP or GIF." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upload to Supabase storage
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${id}/${Date.now()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("products")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Get public URL
  const { data: { publicUrl } } = admin.storage.from("products").getPublicUrl(path);

  // Count existing images for position
  const { count } = await admin
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  const position = count ?? 0;
  const isPrimary = position === 0;

  const { data: image, error: dbError } = await admin
    .from("product_images")
    .insert({
      product_id: id,
      url: publicUrl,
      alt_text: formData.get("alt_text") as string ?? "",
      position,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // If this is the first image, also set primary_image_url on the product
  if (isPrimary) {
    await admin
      .from("products")
      .update({ primary_image_url: publicUrl })
      .eq("id", id);
  }

  return NextResponse.json({ image }, { status: 201 });
}

// PUT /api/site-management/products/[id]/images — reorder images
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  // body.order: [{ id: string, position: number, is_primary: boolean }]
  if (!Array.isArray(body.order)) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }

  for (const item of body.order) {
    await admin
      .from("product_images")
      .update({ position: item.position, is_primary: item.is_primary })
      .eq("id", item.id)
      .eq("product_id", id);
  }

  // Update primary_image_url on product
  const primary = body.order.find((i: { is_primary: boolean; url?: string }) => i.is_primary);
  if (primary?.url) {
    await admin.from("products").update({ primary_image_url: primary.url }).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
