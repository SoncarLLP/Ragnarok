import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/fitness/prestige
 * Prestige a class (available when class level = 50).
 * Body: { classId }
 *
 * Resets level to 1, awards prestige star, grants 1000 XP and 500 loyalty points.
 * Viking members also receive an extra 10 loyalty points.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  // Verify user is at level 50 in this class
  const { data: progress } = await supabase
    .from("member_class_progress")
    .select("current_level, prestige_count")
    .eq("user_id", user.id)
    .eq("class_id", classId)
    .single();

  if (!progress) return NextResponse.json({ error: "No progress found for this class" }, { status: 404 });
  if (progress.current_level < 50) {
    return NextResponse.json({ error: "Must reach Level 50 to prestige" }, { status: 400 });
  }

  // Call the DB prestige function
  const { error } = await supabase.rpc("record_prestige", {
    p_user_id: user.id,
    p_class_id: classId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate tier
  try { await supabase.rpc("recalculate_member_tier", { p_user_id: user.id }); } catch { /* best effort */ }

  return NextResponse.json({
    success: true,
    newPrestigeCount: (progress.prestige_count ?? 0) + 1,
    message: `Prestige ${(progress.prestige_count ?? 0) + 1} achieved! 1000 XP and 500 loyalty points awarded.`,
  });
}
