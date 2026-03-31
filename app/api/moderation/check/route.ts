import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkTextContent,
  getModerationsFromDB,
  logModerationEvent,
  applyModerationStrike,
} from "@/lib/content-moderation";

// POST /api/moderation/check
// Body: { content: string, contentType: string }
// Returns: { allowed: boolean, reason?: string }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = (await req.json()) as { content: string; contentType: string };
  if (!body.content || !body.contentType) {
    return NextResponse.json({ allowed: true });
  }

  const admin = createAdminClient();
  const { blocked, whitelist } = await getModerationsFromDB(admin as Parameters<typeof getModerationsFromDB>[0]);

  const result = checkTextContent(body.content, blocked, whitelist);

  if (!result.allowed && user) {
    // Log the event
    await logModerationEvent(
      admin as Parameters<typeof logModerationEvent>[0],
      user.id,
      body.contentType,
      body.content,
      result.reason,
      result.blockedWords
    );

    // Apply strike
    const { strikes, suspended } = await applyModerationStrike(
      admin as Parameters<typeof applyModerationStrike>[0],
      user.id
    );

    return NextResponse.json({
      allowed: false,
      reason: "Your content was blocked because it contains language that violates our community guidelines. Please review our Community Guidelines and try again.",
      strikes,
      suspended,
    });
  }

  return NextResponse.json({ allowed: result.allowed });
}
