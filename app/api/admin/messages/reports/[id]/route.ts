import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/admin/messages/reports/[id] — resolve a report (super_admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body as { action: "resolve" | "delete_conversation" };

  const admin = createAdminClient();

  if (action === "delete_conversation") {
    // Get conversation_id first
    const { data: report } = await admin
      .from("conversation_reports")
      .select("conversation_id")
      .eq("id", id)
      .single();

    if (report) {
      // Delete the whole conversation (cascades to messages, participants, reports)
      await admin.from("conversations").delete().eq("id", report.conversation_id);
      return NextResponse.json({ success: true, deleted: true });
    }
  }

  // Resolve the report
  const { error } = await admin
    .from("conversation_reports")
    .update({
      status: "resolved",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
