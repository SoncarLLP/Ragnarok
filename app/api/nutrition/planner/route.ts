import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/nutrition/planner?week=2026-04-07 — Returns meal plan for week containing date
 * PUT /api/nutrition/planner — Upsert a meal plan
 * GET /api/nutrition/planner?templates=true — Returns public templates (super_admin created)
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const templates = searchParams.get("templates") === "true";
  const week = searchParams.get("week");

  if (templates) {
    const { data } = await supabase
      .from("meal_plans")
      .select("id, name, plan_data, user_id, created_at")
      .eq("is_public", true)
      .eq("is_template", true)
      .order("created_at", { ascending: false });
    return NextResponse.json({ templates: data ?? [] });
  }

  let query = supabase.from("meal_plans").select("*").eq("user_id", user.id);

  if (week) {
    // Return the plan that covers this week
    const weekStart = getWeekStart(new Date(week));
    query = query.eq("name", `Week of ${weekStart.toISOString().split("T")[0]}`);
  }

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plans: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { id, name, plan_data, is_template = false } = body;

  if (!name || !plan_data) {
    return NextResponse.json({ error: "name and plan_data required" }, { status: 400 });
  }

  // Only super_admins can set is_public to true
  let is_public = false;
  if (body.is_public === true) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    is_public = profile?.role === "super_admin";
  }

  const upsertData = {
    user_id: user.id,
    name,
    plan_data,
    is_template,
    is_public,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (id) {
    const { data, error } = await supabase
      .from("meal_plans")
      .update(upsertData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase
      .from("meal_plans")
      .insert(upsertData)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json({ id: result.id, success: true });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff));
}
