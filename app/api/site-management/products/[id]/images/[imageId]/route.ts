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

type Params = { params: Promise<{ id: string; imageId: string }> };

// DELETE /api/site-management/products/[id]/images/[imageId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, imageId } = await params;
  const admin = createAdminClient();

  // Fetch image to get storage path
  const { data: image } = await admin
    .from("product_images")
    .select("*")
    .eq("id", imageId)
    .eq("product_id", id)
    .single();

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Try to delete from storage (extract path from URL)
  try {
    const url = new URL(image.url);
    const parts = url.pathname.split("/storage/v1/object/public/products/");
    if (parts[1]) {
      await admin.storage.from("products").remove([parts[1]]);
    }
  } catch {
    // Ignore storage deletion errors (might be a static URL)
  }

  // Delete DB record
  const { error } = await admin.from("product_images").delete().eq("id", imageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If this was the primary, promote the next image
  if (image.is_primary) {
    const { data: remaining } = await admin
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("position", { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      await admin.from("product_images").update({ is_primary: true }).eq("id", remaining[0].id);
      await admin.from("products").update({ primary_image_url: remaining[0].url }).eq("id", id);
    } else {
      await admin.from("products").update({ primary_image_url: null }).eq("id", id);
    }
  }

  return NextResponse.json({ success: true });
}
