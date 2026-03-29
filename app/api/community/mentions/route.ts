import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractMentionedUsernames } from "@/lib/mentions";
import { cooldownExpired, MEMBER_COOLDOWN_MS } from "@/lib/email-cooldown";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    text: string;
    post_id?: string;
    comment_id?: string;
  };
  const { text, post_id, comment_id } = body;

  if (!text || (!post_id && !comment_id)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const usernames = extractMentionedUsernames(text);
  if (usernames.length === 0) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

  // Look up mentioned users by username
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, full_name")
    .in("username", usernames);

  if (!profiles || profiles.length === 0) return NextResponse.json({ ok: true });

  // Get mentioner's display name for emails
  const { data: mentionerProfile } = await admin
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .single();
  const mentionerName =
    mentionerProfile?.full_name || mentionerProfile?.username || "Someone";

  // Insert mentions (exclude self-mentions; DB unique index prevents duplicates)
  const target = post_id ? { post_id } : { comment_id };
  const mentionRows = profiles
    .filter((p) => p.id !== user.id)
    .map((p) => ({
      ...target,
      mentioned_user_id: p.id,
      mentioned_by_user_id: user.id,
    }));

  if (mentionRows.length > 0) {
    // Ignore errors (e.g. duplicate unique-index violation on re-edit)
    await admin.from("mentions").insert(mentionRows);
  }

  // ── Email notifications (requires RESEND_API_KEY in env) ──────
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && mentionRows.length > 0) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://soncar.co.uk";

    // Resolve link for comment mentions (need the parent post_id)
    let link: string;
    if (post_id) {
      link = `${siteUrl}/community/${post_id}`;
    } else {
      const { data: commentRow } = await admin
        .from("comments")
        .select("post_id")
        .eq("id", comment_id!)
        .single();
      link = commentRow
        ? `${siteUrl}/community/${commentRow.post_id}`
        : `${siteUrl}/community`;
    }

    const context = post_id ? "post" : "comment";
    const excerpt = text.slice(0, 200) + (text.length > 200 ? "…" : "");

    for (const p of profiles.filter((pr) => pr.id !== user.id)) {
      // Check 12-hour email cooldown; in-app notification was already created by DB trigger
      const { data: cooldownRow } = await admin
        .from("profiles")
        .select("last_email_sent_at")
        .eq("id", p.id)
        .single();
      if (!cooldownExpired(cooldownRow?.last_email_sent_at, MEMBER_COOLDOWN_MS)) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(p.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SONCAR <hello@soncar.co.uk>",
          to: [email],
          subject: `${mentionerName} mentioned you on SONCAR`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:24px">
              <h2 style="color:#f59e0b;margin-top:0">You were mentioned on SONCAR</h2>
              <p style="margin-bottom:8px">
                <strong>${mentionerName}</strong> mentioned you in a ${context}:
              </p>
              <blockquote style="border-left:3px solid #f59e0b;margin:16px 0;padding:12px 16px;background:#fefce8;border-radius:4px;color:#374151;font-style:italic">
                ${excerpt.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
              </blockquote>
              <p>
                <a href="${link}" style="display:inline-block;background:#f59e0b;color:#1a1a1a;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600">
                  View ${context} &rarr;
                </a>
              </p>
              <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
                You received this because you were mentioned in a SONCAR community ${context}.
                Visit your
                <a href="${siteUrl}/account/notifications" style="color:#f59e0b">notification settings</a>
                to manage preferences.
              </p>
            </div>
          `,
        }),
      }).catch(() => {}); // never let an email failure break the response

      // Update cooldown timestamp (best-effort)
      await admin
        .from("profiles")
        .update({ last_email_sent_at: new Date().toISOString() })
        .eq("id", p.id);
    }
  }

  return NextResponse.json({ ok: true });
}
