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

// GET /api/site-management/publish-history?entity_type=...&entity_id=...
export async function GET(req: NextRequest) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get("entity_type");
  const entity_id = searchParams.get("entity_id");

  const admin = createAdminClient();
  let query = admin
    .from("publish_history")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(10);

  if (entity_type) query = query.eq("entity_type", entity_type);
  if (entity_id) query = query.eq("entity_id", entity_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data });
}

// POST /api/site-management/publish-history/revert — revert to a previous version
export async function POST(req: NextRequest) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { history_id } = body;
  if (!history_id) return NextResponse.json({ error: "history_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("publish_history")
    .select("*")
    .eq("id", history_id)
    .single();

  if (!entry) return NextResponse.json({ error: "History entry not found" }, { status: 404 });

  if (entry.entity_type === "product") {
    const allowed = [
      "slug", "name", "description_html", "price_pence", "stock_status",
      "visibility", "is_featured", "primary_image_url", "custom_segments",
      "meta_title", "meta_description", "related_product_ids", "loyalty_multiplier",
      "sort_order",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (key in entry.snapshot) patch[key] = entry.snapshot[key];
    }
    await admin.from("products").update(patch).eq("id", entry.entity_id);
  } else if (entry.entity_type === "site_content") {
    await admin
      .from("site_content")
      .update({ content: entry.snapshot, updated_at: new Date().toISOString() })
      .eq("key", entry.entity_id);
  }

  return NextResponse.json({ success: true });
}
