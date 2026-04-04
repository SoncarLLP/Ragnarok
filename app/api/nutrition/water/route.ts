import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NUTRITION_POINTS } from "@/lib/nutrition";

/**
 * GET /api/nutrition/water?date=2026-04-07
 * Returns water logs for date + total ml
 *
 * POST /api/nutrition/water
 * Body: { amount_ml: number }
 * Adds a water log entry
 *
 * DELETE /api/nutrition/water?id=<id>
 * Removes a water log entry
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay   = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", startOfDay)
    .lte("logged_at", endOfDay)
    .order("logged_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totalMl = (data ?? []).reduce((s: number, w: { amount_ml: number }) => s + w.amount_ml, 0);

  return NextResponse.json({ logs: data ?? [], total_ml: totalMl, date });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { amount_ml } = await req.json();
  if (!amount_ml || amount_ml <= 0 || amount_ml > 5000) {
    return NextResponse.json({ error: "amount_ml must be between 1 and 5000" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("water_logs")
    .insert({ user_id: user.id, amount_ml })
    .select("id, amount_ml, logged_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if daily water target met — award points
  const today = new Date().toISOString().split("T")[0];
  const { data: todayLogs } = await supabase
    .from("water_logs")
    .select("amount_ml")
    .eq("user_id", user.id)
    .gte("logged_at", `${today}T00:00:00.000Z`)
    .lte("logged_at", `${today}T23:59:59.999Z`);

  const totalToday = (todayLogs ?? []).reduce((s: number, w: { amount_ml: number }) => s + w.amount_ml, 0);

  const { data: goals } = await supabase
    .from("nutrition_goals")
    .select("water_ml")
    .eq("user_id", user.id)
    .maybeSingle();

  const target = goals?.water_ml ?? 2000;
  if (totalToday >= target) {
    await supabase.rpc("award_nutrition_points", {
      p_user_id: user.id,
      p_reward_type: "hit_water_target",
      p_points: NUTRITION_POINTS.hit_water_target,
      p_date: today,
    });

    // Update water streak
    await supabase
      .from("nutrition_streaks")
      .upsert({
        user_id: user.id,
        last_water_date: today,
      }, { onConflict: "user_id" });
  }

  return NextResponse.json({ id: data.id, amount_ml: data.amount_ml, total_today_ml: totalToday });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("water_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
