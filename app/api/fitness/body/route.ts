import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/fitness/body
 * Returns body measurements history for the current user.
 * Query params: limit, offset
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit  = parseInt(searchParams.get("limit") ?? "30");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const { data, count, error } = await supabase
    .from("body_measurements")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ measurements: data ?? [], total: count ?? 0 });
}

/**
 * POST /api/fitness/body
 * Log a new body measurement entry.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    weightKg, chestCm, waistCm, hipsCm,
    leftArmCm, rightArmCm, leftThighCm, rightThighCm,
    leftCalfCm, rightCalfCm, bodyFatPercentage,
    energyRating, moodRating, sleepHours, waterLitres,
    notes, measuredAt,
  } = body;

  const { data, error } = await supabase
    .from("body_measurements")
    .insert({
      user_id: user.id,
      weight_kg: weightKg ?? null,
      chest_cm: chestCm ?? null,
      waist_cm: waistCm ?? null,
      hips_cm: hipsCm ?? null,
      left_arm_cm: leftArmCm ?? null,
      right_arm_cm: rightArmCm ?? null,
      left_thigh_cm: leftThighCm ?? null,
      right_thigh_cm: rightThighCm ?? null,
      left_calf_cm: leftCalfCm ?? null,
      right_calf_cm: rightCalfCm ?? null,
      body_fat_percentage: bodyFatPercentage ?? null,
      energy_rating: energyRating ?? null,
      mood_rating: moodRating ?? null,
      sleep_hours: sleepHours ?? null,
      water_litres: waterLitres ?? null,
      notes: notes ?? null,
      measured_at: measuredAt ? new Date(measuredAt).toISOString() : new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, measurementId: data.id });
}
