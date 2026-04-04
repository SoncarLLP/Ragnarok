import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NUTRITION_POINTS } from "@/lib/nutrition";

/**
 * GET /api/nutrition/custom-foods — Returns approved custom foods + member's own
 * POST /api/nutrition/custom-foods — Submit a new custom food for review
 * PATCH /api/nutrition/custom-foods/[id] — Admin: approve or reject
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";
  const adminReview = searchParams.get("admin_review") === "true";

  // Check role for admin review
  if (adminReview) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data } = await supabase
      .from("custom_foods")
      .select("*, profiles!submitted_by(full_name, username)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    return NextResponse.json({ foods: data ?? [] });
  }

  let query = supabase.from("custom_foods").select("*");

  if (mine) {
    query = query.eq("submitted_by", user.id);
  } else {
    query = query.eq("status", "approved");
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ foods: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { name, brand, serving_size = 100, serving_unit = "g", nutrient_data, label_photo_url } = body;

  if (!name || !nutrient_data) {
    return NextResponse.json({ error: "name and nutrient_data required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("custom_foods")
    .insert({
      submitted_by: user.id,
      name,
      brand: brand ?? null,
      serving_size,
      serving_unit,
      nutrient_data,
      label_photo_url: label_photo_url ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    message: "Your food submission has been sent for admin review. You will be notified when approved.",
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, review_notes } = body;

  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "id and status (approved|rejected) required" }, { status: 400 });
  }

  const { data: food, error } = await supabase
    .from("custom_foods")
    .update({ status, reviewed_by: user.id, review_notes: review_notes ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("submitted_by")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approved, award loyalty points to submitter
  if (status === "approved" && food?.submitted_by) {
    await supabase.rpc("award_nutrition_points", {
      p_user_id: food.submitted_by,
      p_reward_type: "custom_food_approved",
      p_points: NUTRITION_POINTS.custom_food_approved,
      p_date: new Date().toISOString().split("T")[0],
    });

    // Notify submitter
    try {
      await supabase.from("notifications").insert({
        user_id: food.submitted_by,
        type: "system",
        title: "Food submission approved",
        body: `Your custom food submission has been approved and added to the database. You earned ${NUTRITION_POINTS.custom_food_approved} loyalty points!`,
      });
    } catch { /* best effort */ }
  } else if (status === "rejected" && food?.submitted_by) {
    try {
      await supabase.from("notifications").insert({
        user_id: food.submitted_by,
        type: "system",
        title: "Food submission not approved",
        body: review_notes ? `Your food submission was not approved: ${review_notes}` : "Your food submission was not approved. Please check the details and resubmit.",
      });
    } catch { /* best effort */ }
  }

  return NextResponse.json({ success: true, status });
}
