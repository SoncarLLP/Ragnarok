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

// POST /api/site-management/products/[id]/duplicate
export async function POST(_req: NextRequest, { params }: Params) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: source } = await admin
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate a unique slug
  const baseSlug = `${source.slug}-copy`;
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 10) {
    const { data: existing } = await admin
      .from("products")
      .select("id")
      .eq("slug", slug)
      .single();
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = source;
  void _id; void _ca; void _ua;

  const { data: created, error } = await admin
    .from("products")
    .insert({
      ...rest,
      slug,
      name: `${source.name} (Copy)`,
      visibility: "hidden",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: created }, { status: 201 });
}
