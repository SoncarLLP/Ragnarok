import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/moderation/settings?key=blocked_words|whitelist_words
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "super_admin"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  const query = admin.from("moderation_settings").select("key, value");
  const { data, error } = key
    ? await query.eq("key", key).single()
    : await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PUT /api/moderation/settings
// Body: { key: string, words: string[], action: 'set' | 'add' | 'remove' }
export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — super_admin only" }, { status: 403 });
  }

  const body = (await req.json()) as {
    key: "blocked_words" | "whitelist_words";
    words: string[];
    action: "set" | "add" | "remove";
  };

  if (!body.key || !["blocked_words", "whitelist_words"].includes(body.key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  // Fetch existing
  const { data: existing } = await admin
    .from("moderation_settings")
    .select("value")
    .eq("key", body.key)
    .single();

  let currentList: string[] = Array.isArray(existing?.value) ? (existing.value as string[]) : [];

  if (body.action === "set") {
    currentList = body.words.map((w) => w.toLowerCase().trim()).filter(Boolean);
  } else if (body.action === "add") {
    const toAdd = body.words.map((w) => w.toLowerCase().trim()).filter(Boolean);
    currentList = [...new Set([...currentList, ...toAdd])];
  } else if (body.action === "remove") {
    const toRemove = new Set(body.words.map((w) => w.toLowerCase().trim()));
    currentList = currentList.filter((w) => !toRemove.has(w));
  }

  const { error } = await admin
    .from("moderation_settings")
    .upsert({
      key: body.key,
      value: currentList,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, words: currentList });
}
