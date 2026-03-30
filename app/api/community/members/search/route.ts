import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("profiles") as any)
    .select("id, username, full_name, avatar_url, display_name_preference")
    .not("username", "is", null)
    // Exclude private accounts from @mention search results
    .neq("account_mode", "private")
    .order("created_at", { ascending: false })
    .limit(8);

  if (q) {
    query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data } = await query;

  // If authenticated, also filter out users who have blocked the current user
  if (user && data && data.length > 0) {
    const { data: incomingBlocks } = await supabase
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", user.id)
      .in("blocker_id", data.map((p: { id: string }) => p.id));

    if (incomingBlocks && incomingBlocks.length > 0) {
      const blockerIds = new Set(incomingBlocks.map((b: { blocker_id: string }) => b.blocker_id));
      return NextResponse.json(data.filter((p: { id: string }) => !blockerIds.has(p.id)));
    }
  }

  return NextResponse.json(data ?? []);
}
