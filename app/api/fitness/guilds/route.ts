import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/guilds
 * Returns all guilds with member counts. Includes user's guild if any.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: guilds, error } = await supabase
    .from("guilds")
    .select(`
      *,
      fitness_classes(name, icon, slug),
      guild_members(count)
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user's guilds
  const { data: myMemberships } = await supabase
    .from("guild_members")
    .select("guild_id, role")
    .eq("user_id", user.id);

  const myGuildIds = new Set((myMemberships ?? []).map((m) => m.guild_id));
  const myRoles    = Object.fromEntries((myMemberships ?? []).map((m) => [m.guild_id, m.role]));

  const guildsWithMeta = (guilds ?? []).map((g) => ({
    ...g,
    memberCount: Array.isArray(g.guild_members) ? g.guild_members[0]?.count ?? 0 : 0,
    isMember: myGuildIds.has(g.id),
    userRole: myRoles[g.id] ?? null,
  }));

  return NextResponse.json({ guilds: guildsWithMeta });
}

/**
 * POST /api/fitness/guilds
 * Create a new guild.
 * Body: { name, description?, classFocusId? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { name, description, classFocusId } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Guild name required" }, { status: 400 });

  // Create guild
  const { data: guild, error: gError } = await supabase
    .from("guilds")
    .insert({
      name: name.trim(),
      description: description?.trim() ?? null,
      class_focus: classFocusId ?? null,
      guild_master_id: user.id,
    })
    .select("id")
    .single();

  if (gError) {
    if (gError.code === "23505") return NextResponse.json({ error: "Guild name already taken" }, { status: 409 });
    return NextResponse.json({ error: gError.message }, { status: 500 });
  }

  // Add creator as guild master
  await supabase
    .from("guild_members")
    .insert({ guild_id: guild.id, user_id: user.id, role: "master" });

  return NextResponse.json({ success: true, guildId: guild.id });
}
