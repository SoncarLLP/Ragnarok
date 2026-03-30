import { createAdminClient } from "@/lib/supabase/admin";
import HomepageEditor from "./HomepageEditor";
import type { HomepageContent } from "@/lib/site-management";
import { defaultHomepageContent } from "@/lib/site-management";

export const dynamic = "force-dynamic";

export default async function HomepageContentPage() {
  const admin = createAdminClient();

  const [{ data: content }, { data: draft }, { data: products }] = await Promise.all([
    admin.from("site_content").select("*").eq("key", "homepage").single(),
    admin
      .from("content_drafts")
      .select("*")
      .eq("entity_type", "site_content")
      .eq("entity_id", "homepage")
      .single(),
    admin.from("products").select("id, slug, name, primary_image_url").eq("visibility", "published").order("sort_order"),
  ]);

  const liveContent: HomepageContent = (content?.content as HomepageContent) ?? defaultHomepageContent();
  const draftContent: HomepageContent | null = (draft?.draft_data as HomepageContent) ?? null;

  return (
    <HomepageEditor
      liveContent={liveContent}
      initialDraft={draftContent}
      hasDraft={draft?.has_unpublished_changes ?? false}
      draftUpdatedAt={draft?.updated_at ?? null}
      publishedProducts={products ?? []}
    />
  );
}
