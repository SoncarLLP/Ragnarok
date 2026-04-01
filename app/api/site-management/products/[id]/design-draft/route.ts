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

// GET — fetch current design draft
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from("product_design_drafts")
    .select("*")
    .eq("product_id", id)
    .single();

  return NextResponse.json({ draft: data ?? null });
}

// PUT — save / upsert design draft
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("product_design_drafts")
    .upsert(
      {
        product_id: id,
        theme_data: body.theme_data,
        has_unpublished_changes: true,
        last_modified_by: user.id,
        last_modified_at: new Date().toISOString(),
      },
      { onConflict: "product_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data });
}

// DELETE — discard design draft
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  await admin
    .from("product_design_drafts")
    .delete()
    .eq("product_id", id);

  return NextResponse.json({ success: true });
}
