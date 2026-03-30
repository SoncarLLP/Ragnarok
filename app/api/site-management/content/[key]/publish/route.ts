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

type Params = { params: Promise<{ key: string }> };

// POST /api/site-management/content/[key]/publish
export async function POST(req: NextRequest, { params }: Params) {
  const result = await assertSuperAdmin();
  if (!result) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { user, profile } = result;

  const { key } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  // Fetch current live content for snapshot
  const { data: existing } = await admin
    .from("site_content")
    .select("*")
    .eq("key", key)
    .single();

  // Fetch draft
  const { data: draft } = await admin
    .from("content_drafts")
    .select("draft_data")
    .eq("entity_type", "site_content")
    .eq("entity_id", key)
    .single();

  if (!draft?.draft_data) {
    return NextResponse.json({ error: "No draft to publish" }, { status: 400 });
  }

  // Save publish history snapshot
  const publisherName = profile.full_name || profile.username || user.email || "Super Admin";
  if (existing) {
    await admin.from("publish_history").insert({
      entity_type: "site_content",
      entity_id: key,
      snapshot: existing.content,
      published_by: user.id,
      publisher_name: publisherName,
      notes: body.notes ?? null,
    });
  }

  // Apply draft to live site_content
  const { data: updated, error } = await admin
    .from("site_content")
    .upsert(
      {
        key,
        content: draft.draft_data,
        published_at: new Date().toISOString(),
        published_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark draft as published
  await admin
    .from("content_drafts")
    .update({ has_unpublished_changes: false })
    .eq("entity_type", "site_content")
    .eq("entity_id", key);

  return NextResponse.json({ content: updated });
}
