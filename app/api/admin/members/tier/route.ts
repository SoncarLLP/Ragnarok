import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_TIERS } from "@/lib/loyalty";

// POST /api/admin/members/tier
// Super-admin only: manually set a member's tier + cumulative_points
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — super_admin only" }, { status: 403 });
  }

  const body = (await req.json()) as { userId: string; newTier: string };
  if (!body.userId || !body.newTier) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const tierDef = ALL_TIERS.find((t) => t.tier === body.newTier);
  if (!tierDef) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  // Fetch current profile
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("tier, cumulative_points")
    .eq("id", body.userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const previousTier = targetProfile.tier ?? "Bronze 1";

  // Update tier + cumulative_points to tier minimum
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      tier: body.newTier,
      cumulative_points: Math.max(targetProfile.cumulative_points ?? 0, tierDef.min),
    })
    .eq("id", body.userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log to loyalty_events
  const { error: loyaltyError } = await admin.from("loyalty_events").insert({
    user_id: body.userId,
    points: Math.max(0, tierDef.min - (targetProfile.cumulative_points ?? 0)),
    reason: `Manual tier promotion to ${body.newTier} by super admin`,
    order_id: null,
  });

  if (loyaltyError) {
    console.warn("Failed to insert loyalty_event for tier promotion:", loyaltyError.message);
  }

  // Log to tier_promotion_log
  const { error: logError } = await admin.from("tier_promotion_log").insert({
    member_id: body.userId,
    previous_tier: previousTier,
    new_tier: body.newTier,
    promoted_by: user.id,
    note: "Manually promoted by super admin",
  });

  if (logError) {
    console.warn("Failed to insert tier_promotion_log:", logError.message);
  }

  // Send in-app notification to the member
  await admin.from("notifications").insert({
    user_id: body.userId,
    type: "tier_promotion",
    message: `Your loyalty tier has been updated to ${body.newTier} by the Ragnarök team. Keep rising, warrior!`,
    link: "/account/rewards",
    admin_notice: true,
  });

  return NextResponse.json({ ok: true, newTier: body.newTier, newPoints: Math.max(targetProfile.cumulative_points ?? 0, tierDef.min) });
}
