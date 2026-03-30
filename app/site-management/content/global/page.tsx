import { createAdminClient } from "@/lib/supabase/admin";
import GlobalEditor from "./GlobalEditor";
import type { GlobalContent } from "@/lib/site-management";
import { defaultGlobalContent } from "@/lib/site-management";

export const dynamic = "force-dynamic";

export default async function GlobalContentPage() {
  const admin = createAdminClient();

  const [{ data: content }, { data: draft }] = await Promise.all([
    admin.from("site_content").select("*").eq("key", "global").single(),
    admin
      .from("content_drafts")
      .select("*")
      .eq("entity_type", "site_content")
      .eq("entity_id", "global")
      .single(),
  ]);

  const liveContent: GlobalContent = (content?.content as GlobalContent) ?? defaultGlobalContent();
  const draftContent: GlobalContent | null = (draft?.draft_data as GlobalContent) ?? null;

  return (
    <GlobalEditor
      liveContent={liveContent}
      initialDraft={draftContent}
      hasDraft={draft?.has_unpublished_changes ?? false}
      draftUpdatedAt={draft?.updated_at ?? null}
    />
  );
}
