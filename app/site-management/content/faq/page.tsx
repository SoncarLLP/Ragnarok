import { createAdminClient } from "@/lib/supabase/admin";
import FAQEditor from "./FAQEditor";
import type { FAQContent } from "@/lib/site-management";

export const dynamic = "force-dynamic";

export default async function FAQContentPage() {
  const admin = createAdminClient();

  const [{ data: content }, { data: draft }] = await Promise.all([
    admin.from("site_content").select("*").eq("key", "faq").single(),
    admin.from("content_drafts").select("*").eq("entity_type", "site_content").eq("entity_id", "faq").single(),
  ]);

  const liveContent: FAQContent = (content?.content as FAQContent) ?? { items: [] };
  const draftContent: FAQContent | null = (draft?.draft_data as FAQContent) ?? null;

  return (
    <FAQEditor
      liveContent={liveContent}
      initialDraft={draftContent}
      hasDraft={draft?.has_unpublished_changes ?? false}
      draftUpdatedAt={draft?.updated_at ?? null}
    />
  );
}
