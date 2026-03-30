"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ShopContent } from "@/lib/site-management";
import DraftBanner from "../../components/DraftBanner";
import ConfirmModal from "../../components/ConfirmModal";

type Props = {
  liveContent: ShopContent;
  initialDraft: ShopContent | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
};

export default function ShopContentEditor({ liveContent, initialDraft, hasDraft: initialHasDraft, draftUpdatedAt }: Props) {
  const router = useRouter();
  const [content, setContent] = useState<ShopContent>(initialDraft ?? liveContent);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [lastSaved, setLastSaved] = useState<string | null>(draftUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const saveDraft = useCallback(async (data: ShopContent) => {
    setSaving(true);
    try {
      const res = await fetch("/api/site-management/content/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_data: data }),
      });
      if (res.ok) {
        const json = await res.json();
        setLastSaved(json.draft?.updated_at ?? new Date().toISOString());
        setHasDraft(true);
      }
    } finally { setSaving(false); }
  }, []);

  const triggerSave = useCallback((data: ShopContent) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(data), 1500);
  }, [saveDraft]);

  const update = useCallback(<K extends keyof ShopContent>(key: K, value: ShopContent[K]) => {
    setContent((prev) => {
      const next = { ...prev, [key]: value };
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  const handlePublish = useCallback(async () => {
    setShowPublishModal(false);
    setPublishing(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await saveDraft(content);
      const res = await fetch("/api/site-management/content/shop/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.ok) { setHasDraft(false); showToast("Shop page published!"); router.refresh(); }
      else { const d = await res.json(); showToast(`Failed: ${d.error}`); }
    } finally { setPublishing(false); }
  }, [content, saveDraft, router]);

  const handleDiscard = useCallback(async () => {
    setShowDiscardModal(false);
    await fetch("/api/site-management/content/shop", { method: "DELETE" });
    setContent(liveContent); setHasDraft(false); setLastSaved(null); showToast("Draft discarded.");
  }, [liveContent]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <div className="space-y-5 max-w-lg pb-16">
      <div className="flex items-center gap-3">
        <Link href="/site-management/content" className="text-neutral-500 hover:text-white text-sm transition">← Content</Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-lg font-semibold">Shop Page</h1>
      </div>

      <DraftBanner hasChanges={hasDraft} lastSaved={lastSaved} saving={saving} entityType="site_content" entityId="shop" onPublish={() => setShowPublishModal(true)} onDiscard={() => setShowDiscardModal(true)} publishing={publishing} />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-300">Shop page heading</label>
          <input type="text" value={content.heading} onChange={(e) => update("heading", e.target.value)} className="input-field" placeholder="Bestsellers" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-300">Shop page description</label>
          <input type="text" value={content.description} onChange={(e) => update("description", e.target.value)} className="input-field" placeholder="£30 each · Free UK delivery over £60" />
        </div>
      </div>

      <ConfirmModal open={showPublishModal} title="Publish shop page content?" message="This will update the shop page heading and description immediately." confirmLabel="Publish now" onConfirm={handlePublish} onCancel={() => setShowPublishModal(false)} />
      <ConfirmModal open={showDiscardModal} title="Discard draft?" message="Unsaved shop page changes will be lost." confirmLabel="Discard" confirmDestructive onConfirm={handleDiscard} onCancel={() => setShowDiscardModal(false)} />
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-neutral-800 border border-white/15 text-sm text-neutral-100 shadow-2xl">{toast}</div>}
    </div>
  );
}
