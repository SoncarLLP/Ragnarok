import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return null;
  return admin;
}

// GET /api/search/synonyms — list all synonyms (super admin only)
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await admin
    .from("search_synonyms")
    .select("*")
    .order("term", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ synonyms: data });
}

// POST /api/search/synonyms — upsert a synonym pair
export async function POST(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const term = (body.term ?? "").trim().toLowerCase();
  const synonyms: string[] = (body.synonyms ?? []).map((s: string) => s.trim().toLowerCase()).filter(Boolean);

  if (!term) return NextResponse.json({ error: "term is required" }, { status: 400 });

  const { data, error } = await admin
    .from("search_synonyms")
    .upsert({ term, synonyms }, { onConflict: "term" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ synonym: data });
}

// DELETE /api/search/synonyms?term=... — delete a synonym entry
export async function DELETE(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const term = new URL(req.url).searchParams.get("term")?.trim().toLowerCase();
  if (!term) return NextResponse.json({ error: "term is required" }, { status: 400 });

  const { error } = await admin.from("search_synonyms").delete().eq("term", term);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
