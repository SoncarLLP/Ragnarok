import { createAdminClient } from "@/lib/supabase/admin";
import ShopContentEditor from "./ShopContentEditor";
import type { ShopContent } from "@/lib/site-management";

export const dynamic = "force-dynamic";

export default async function ShopContentPage() {
  const admin = createAdminClient();

  const [{ data: content }, { data: draft }] = await Promise.all([
    admin.from("site_content").select("*").eq("key", "shop").single(),
    admin
      .from("content_drafts")
      .select("*")
      .eq("entity_type", "site_content")
      .eq("entity_id", "shop")
      .single(),
  ]);

  const liveContent: ShopContent = (content?.content as ShopContent) ?? {
    heading: "Bestsellers",
    description: "£30 each · Free UK delivery over £60",
  };
  const draftContent: ShopContent | null = (draft?.draft_data as ShopContent) ?? null;

  return (
    <ShopContentEditor
      liveContent={liveContent}
      initialDraft={draftContent}
      hasDraft={draft?.has_unpublished_changes ?? false}
      draftUpdatedAt={draft?.updated_at ?? null}
    />
  );
}
