import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cooldownExpired, MOD_COOLDOWN_MS } from "@/lib/email-cooldown";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate content",
  off_topic: "Off-topic",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    post_id?: string;
    comment_id?: string;
    reason: string;
  };
  const { post_id, comment_id, reason } = body;

  if ((!post_id && !comment_id) || !reason) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Insert flag — ignore duplicate (same user flagging same content twice)
  const { error: flagError } = await admin.from("content_flags").insert({
    ...(post_id ? { post_id } : { comment_id }),
    reported_by: user.id,
    reason,
  });
  // Unique index violation = already flagged; treat as success
  if (flagError && !flagError.message.includes("unique")) {
    return NextResponse.json({ error: flagError.message }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ ok: true });

  // ── Gather context for email ──────────────────────────────────────────────

  // Flagger's display name
  const { data: flaggerProfile } = await admin
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .single();
  const flaggerName =
    flaggerProfile?.full_name || flaggerProfile?.username || "Unknown member";

  // Flagged content excerpt + link
  let contentExcerpt = "";
  let contentLink = "";
  if (post_id) {
    const { data: post } = await admin
      .from("posts")
      .select("content")
      .eq("id", post_id)
      .single();
    contentExcerpt = (post?.content ?? "").slice(0, 300);
    contentLink = `/community/${post_id}`;
  } else if (comment_id) {
    const { data: comment } = await admin
      .from("comments")
      .select("content, post_id")
      .eq("id", comment_id)
      .single();
    contentExcerpt = (comment?.content ?? "").slice(0, 300);
    contentLink = comment?.post_id ? `/community/${comment.post_id}` : "/community";
  }

  // ── Burst detection: >1 flag on same content within last 5 minutes ───────
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { count: recentFlagCount } = await admin
    .from("content_flags")
    .select("id", { count: "exact", head: true })
    .match(post_id ? { post_id } : { comment_id })
    .gte("created_at", fiveMinAgo);
  const isBurst = (recentFlagCount ?? 0) > 1;

  // ── Send moderation email to all super admins ─────────────────────────────
  const { data: superAdmins } = await admin
    .from("profiles")
    .select("id, last_moderation_email_sent_at")
    .eq("role", "super_admin");

  if (!superAdmins || superAdmins.length === 0) return NextResponse.json({ ok: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://soncar.co.uk";
  const reasonLabel = REASON_LABELS[reason] ?? reason;
  const contentTypeLabel = post_id ? "post" : "comment";

  const urgencyBanner = isBurst
    ? `<p style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:12px 16px;color:#dc2626;font-weight:600;margin-bottom:16px">
        ⚠️ URGENT: Multiple reports received within the last 5 minutes — this content may require immediate review.
       </p>`
    : "";

  const escapedExcerpt = contentExcerpt
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  for (const sa of superAdmins) {
    const shouldSend = isBurst || cooldownExpired(sa.last_moderation_email_sent_at, MOD_COOLDOWN_MS);
    if (!shouldSend) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(sa.id);
    const email = authUser?.user?.email;
    if (!email) continue;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ragnarök Moderation <hello@soncar.co.uk>",
        to: [email],
        subject: `${isBurst ? "URGENT: " : ""}Content flagged for review — ${reasonLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:24px">
            <h2 style="color:#ef4444;margin-top:0">Content Flagged for Review</h2>
            ${urgencyBanner}
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr>
                <td style="padding:6px 0;color:#6b7280;width:130px;vertical-align:top">Reported by</td>
                <td style="padding:6px 0;font-weight:600">${flaggerName}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280">Content type</td>
                <td style="padding:6px 0;text-transform:capitalize">${contentTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280">Reason</td>
                <td style="padding:6px 0;font-weight:600;color:#ef4444">${reasonLabel}</td>
              </tr>
            </table>
            ${
              escapedExcerpt
                ? `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:8px">Content excerpt</h3>
                   <blockquote style="border-left:3px solid #ef4444;margin:0 0 20px;padding:12px 16px;background:#fef2f2;border-radius:4px;color:#374151;font-style:italic">
                     ${escapedExcerpt}${contentExcerpt.length >= 300 ? "…" : ""}
                   </blockquote>`
                : ""
            }
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <a href="${siteUrl}/admin" style="display:inline-block;background:#ef4444;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600">
                Review in Admin Panel &rarr;
              </a>
              ${
                contentLink
                  ? `<a href="${siteUrl}${contentLink}" style="display:inline-block;background:#f3f4f6;color:#1a1a1a;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600">View Content</a>`
                  : ""
              }
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
              This alert was sent to all Ragnarök super administrators.
            </p>
          </div>
        `,
      }),
    }).catch(() => {});

    // Update moderation email cooldown
    await admin
      .from("profiles")
      .update({ last_moderation_email_sent_at: new Date().toISOString() })
      .eq("id", sa.id);
  }

  return NextResponse.json({ ok: true });
}
