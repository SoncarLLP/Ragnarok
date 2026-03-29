import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    action: "request" | "approve" | "decline" | "cancel" | "remove_follower";
    target_id?: string;
    request_id?: string;
    requester_id?: string;
  };
  const { action } = body;

  // ── Send a new follow request ────────────────────────────────
  if (action === "request") {
    const { target_id } = body;
    if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
    if (target_id === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

    // Verify target is in followers_only mode and follow requests are open
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("account_mode, privacy_settings")
      .eq("id", target_id)
      .single();

    if (targetProfile?.account_mode !== "followers_only") {
      return NextResponse.json({ error: "Target is not in followers-only mode" }, { status: 400 });
    }

    const ps = (targetProfile?.privacy_settings ?? {}) as { who_can_follow?: string };
    if (ps.who_can_follow === "nobody") {
      return NextResponse.json({ error: "This member is not accepting follow requests" }, { status: 403 });
    }

    const { error } = await supabase
      .from("follow_requests")
      .insert({ requester_id: user.id, target_id, status: "pending" });

    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create in-app notification for target
    await supabase.from("notifications").insert({
      user_id: target_id,
      type: "follow_request",
      message: "Someone requested to follow you",
      link: "/account/follow-requests",
    });

    return NextResponse.json({ ok: true });
  }

  // ── Approve a follow request ─────────────────────────────────
  if (action === "approve") {
    const { request_id, requester_id } = body;
    if (!request_id || !requester_id) {
      return NextResponse.json({ error: "request_id and requester_id required" }, { status: 400 });
    }

    // Update request status
    const { error: updateErr } = await supabase
      .from("follow_requests")
      .update({ status: "approved" })
      .eq("id", request_id)
      .eq("target_id", user.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Insert follow relationship
    const { error: followErr } = await supabase
      .from("follows")
      .insert({ follower_id: requester_id, following_id: user.id });

    if (followErr && followErr.code !== "23505") {
      return NextResponse.json({ error: followErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Decline a follow request ─────────────────────────────────
  if (action === "decline") {
    const { request_id } = body;
    if (!request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });

    const { error } = await supabase
      .from("follow_requests")
      .update({ status: "declined" })
      .eq("id", request_id)
      .eq("target_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Cancel an outgoing request ───────────────────────────────
  if (action === "cancel") {
    const { target_id } = body;
    if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });

    await supabase
      .from("follow_requests")
      .delete()
      .eq("requester_id", user.id)
      .eq("target_id", target_id);

    return NextResponse.json({ ok: true });
  }

  // ── Remove a follower ────────────────────────────────────────
  if (action === "remove_follower") {
    const { requester_id } = body;
    if (!requester_id) return NextResponse.json({ error: "requester_id required" }, { status: 400 });

    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", requester_id)
      .eq("following_id", user.id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
