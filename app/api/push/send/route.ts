import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendToSubscriptions, type PushPayload, type PushEvent } from "@/lib/push";

// Internal utility: send push notifications to a specific user.
// This is called from other API routes (e.g. when a reaction is added, a message is received).
// Can also be called from admin dashboard.
export async function POST(req: NextRequest) {
  try {
    // Require admin or internal call (basic auth header)
    const authHeader = req.headers.get("authorization");
    const isInternal = authHeader === `Bearer ${process.env.INTERNAL_API_SECRET}`;

    if (!isInternal) {
      // Also allow super_admin users to send push notifications
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "super_admin" && profile?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { targetUserId, payload, event } = await req.json() as {
      targetUserId: string;
      payload: PushPayload;
      event: PushEvent;
    };

    if (!targetUserId || !payload) {
      return NextResponse.json({ error: "Missing targetUserId or payload" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check user notification preferences
    const { data: prefs } = await supabase
      .from("push_notification_preferences")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    // If preferences exist, check if this event type is enabled
    if (prefs && event) {
      const prefKey = `${event}_enabled` as keyof typeof prefs;
      if (prefs[prefKey] === false) {
        return NextResponse.json({ ok: true, skipped: true, reason: "User preference" });
      }
    }

    // Get user's push subscriptions
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // Send notifications
    const expiredIds = await sendToSubscriptions(subs, payload);

    // Remove expired subscriptions
    if (expiredIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    return NextResponse.json({ ok: true, sent: subs.length - expiredIds.length });
  } catch (err) {
    console.error("/api/push/send error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
