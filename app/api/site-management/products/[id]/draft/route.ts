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

// GET /api/site-management/products/[id]/draft — fetch current draft
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: draft } = await admin
    .from("content_drafts")
    .select("*")
    .eq("entity_type", "product")
    .eq("entity_id", id)
    .single();

  return NextResponse.json({ draft: draft ?? null });
}

// PUT /api/site-management/products/[id]/draft — save draft (upsert)
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("content_drafts")
    .upsert(
      {
        entity_type: "product",
        entity_id: id,
        draft_data: body.draft_data,
        has_unpublished_changes: true,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data });
}

// DELETE /api/site-management/products/[id]/draft — discard draft
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("content_drafts")
    .delete()
    .eq("entity_type", "product")
    .eq("entity_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
