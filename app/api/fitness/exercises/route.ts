import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/exercises
 * Search the exercise library.
 * Query params: q (search term), category, classSlug, limit
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const q         = searchParams.get("q") ?? "";
  const category  = searchParams.get("category");
  const classSlug = searchParams.get("classSlug");
  const limit     = parseInt(searchParams.get("limit") ?? "30");

  let query = supabase
    .from("exercises")
    .select("*")
    .eq("approved", true)
    .order("name")
    .limit(limit);

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (classSlug) {
    query = query.contains("class_tags", [classSlug]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ exercises: data ?? [] });
}

/**
 * POST /api/fitness/exercises
 * Submit a custom exercise (requires auth; goes to admin review).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { name, category, description, muscleGroups, equipment, classTags } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name and category required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name,
      category,
      description: description ?? null,
      muscle_groups: muscleGroups ?? [],
      equipment: equipment ?? null,
      class_tags: classTags ?? [],
      is_custom: true,
      created_by: user.id,
      approved: false, // requires admin approval
      data_source: "custom",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, exerciseId: data.id, message: "Exercise submitted for review" });
}
