import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "super_admin" ? user : null;
}

// POST /api/site-management/content/upload — upload a site content image
export async function POST(req: NextRequest) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) ?? "misc";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WebP or GIF." }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${Date.now()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("site-content")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("site-content").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
