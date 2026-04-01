import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role, full_name, username")
    .eq("id", user.id)
    .single();
  if (data?.role !== "super_admin") return null;
  return { user, profile: data };
}

type Params = { params: Promise<{ id: string }> };

// POST — publish the current design draft to the live product theme
export async function POST(req: NextRequest, { params }: Params) {
  const result = await assertSuperAdmin();
  if (!result) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user, profile } = result;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  // Determine theme to publish: body.theme_data > draft > current theme
  const { data: draft } = await admin
    .from("product_design_drafts")
    .select("theme_data")
    .eq("product_id", id)
    .single();

  const themeData = body.theme_data ?? draft?.theme_data ?? null;
  if (!themeData) {
    return NextResponse.json({ error: "No theme data to publish" }, { status: 400 });
  }

  const publisherName =
    profile.full_name || profile.username || user.email || "Super Admin";

  // Save current live theme to design history before overwriting
  const { data: currentProduct } = await admin
    .from("products")
    .select("theme")
    .eq("id", id)
    .single();

  if (currentProduct?.theme) {
    await admin.from("product_design_history").insert({
      product_id: id,
      theme_data: currentProduct.theme,
      published_by: user.id,
      publisher_name: publisherName,
    });
  }

  // Apply new design to live product theme field
  const { error: updateError } = await admin
    .from("products")
    .update({ theme: themeData, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record the new published version in history too
  const { data: newHistoryEntry } = await admin
    .from("product_design_history")
    .insert({
      product_id: id,
      theme_data: themeData,
      published_by: user.id,
      publisher_name: publisherName,
    })
    .select()
    .single();

  // Mark draft as no longer having unpublished changes
  await admin
    .from("product_design_drafts")
    .update({ has_unpublished_changes: false })
    .eq("product_id", id);

  return NextResponse.json({ success: true, history_entry: newHistoryEntry });
}
