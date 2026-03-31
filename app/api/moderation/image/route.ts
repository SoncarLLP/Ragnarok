import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkImageSafety } from "@/lib/image-moderation";
import { logModerationEvent } from "@/lib/content-moderation";

// POST /api/moderation/image
// Body: FormData with 'image' file field
// Returns: { allowed: boolean, reason?: string }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ allowed: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await checkImageSafety(buffer);

    if (!result.safe) {
      const admin = createAdminClient();
      await logModerationEvent(
        admin as Parameters<typeof logModerationEvent>[0],
        user?.id ?? null,
        "image",
        `Image upload: ${file.name}`,
        "image_safety",
        [result.reason ?? "unsafe_content"]
      );

      return NextResponse.json({
        allowed: false,
        reason: "This image cannot be uploaded as it may contain content that violates our community guidelines. Please choose a different image.",
      });
    }

    return NextResponse.json({ allowed: true });
  } catch {
    // Fail-open: if image check errors, allow the upload
    return NextResponse.json({ allowed: true });
  }
}
