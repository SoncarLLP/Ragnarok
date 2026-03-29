import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("profiles") as any)
    .select("id, username, full_name, avatar_url")
    .not("username", "is", null)
    .order("created_at", { ascending: false })
    .limit(8);

  if (q) {
    query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
