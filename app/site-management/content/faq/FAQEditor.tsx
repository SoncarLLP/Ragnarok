"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FAQContent, FAQItem } from "@/lib/site-management";
import DraftBanner from "../../components/DraftBanner";
import ConfirmModal from "../../components/ConfirmModal";

type Props = {
  liveContent: FAQContent;
  initialDraft: FAQContent | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
};

export default function FAQEditor({ liveContent, initialDraft, hasDraft: initialHasDraft, draftUpdatedAt }: Props) {
  const router = useRouter();
  const [content, setContent] = useState<FAQContent>(initialDraft ?? liveContent);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [lastSaved, setLastSaved] = useState<string | null>(draftUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const saveDraft = useCallback(async (data: FAQContent) => {
    setSaving(true);
    try {
      const res = await fetch("/api/site-management/content/faq", {
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

  const triggerSave = useCallback((data: FAQContent) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(data), 1500);
  }, [saveDraft]);

  const updateItems = useCallback((items: FAQItem[]) => {
    setContent((prev) => {
      const next = { ...prev, items };
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  const addItem = () => {
    updateItems([...content.items, { id: `faq-${Date.now()}`, question: "", answer: "" }]);
  };

  const updateItem = (id: string, key: "question" | "answer", val: string) => {
    updateItems(content.items.map((item) => (item.id === id ? { ...item, [key]: val } : item)));
  };

  const removeItem = (id: string) => {
    updateItems(content.items.filter((item) => item.id !== id));
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    const arr = [...content.items];
    const i = arr.findIndex((item) => item.id === id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updateItems(arr);
  };

  const handlePublish = useCallback(async () => {
    setShowPublishModal(false);
    setPublishing(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await saveDraft(content);
      const res = await fetch("/api/site-management/content/faq/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.ok) { setHasDraft(false); showToast("FAQ published!"); router.refresh(); }
      else { const d = await res.json(); showToast(`Failed: ${d.error}`); }
    } finally { setPublishing(false); }
  }, [content, saveDraft, router]);

  const handleDiscard = useCallback(async () => {
    setShowDiscardModal(false);
    await fetch("/api/site-management/content/faq", { method: "DELETE" });
    setContent(liveContent); setHasDraft(false); setLastSaved(null); showToast("Draft discarded.");
  }, [liveContent]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center gap-3">
        <Link href="/site-management/content" className="text-neutral-500 hover:text-white text-sm transition">← Content</Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-lg font-semibold">FAQ Page</h1>
      </div>

      <DraftBanner hasChanges={hasDraft} lastSaved={lastSaved} saving={saving} entityType="site_content" entityId="faq" onPublish={() => setShowPublishModal(true)} onDiscard={() => setShowDiscardModal(true)} publishing={publishing} />

      <div className="space-y-4">
        {content.items.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-neutral-600">
            No FAQ items yet. Add your first question below.
          </div>
        )}

        {content.items.map((item, i) => (
          <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 font-mono w-5">{i + 1}.</span>
              <div className="flex items-center gap-1 ml-auto">
                <button type="button" onClick={() => moveItem(item.id, -1)} disabled={i === 0} className="px-2 py-1 text-neutral-500 hover:text-white disabled:opacity-30 transition text-xs">↑</button>
                <button type="button" onClick={() => moveItem(item.id, 1)} disabled={i === content.items.length - 1} className="px-2 py-1 text-neutral-500 hover:text-white disabled:opacity-30 transition text-xs">↓</button>
                <button type="button" onClick={() => removeItem(item.id)} className="px-2 py-1 text-red-400/60 hover:text-red-400 transition text-xs">✕</button>
              </div>
            </div>
            <input
              type="text"
              value={item.question}
              onChange={(e) => updateItem(item.id, "question", e.target.value)}
              className="input-field font-medium"
              placeholder="Question"
            />
            <textarea
              value={item.answer}
              onChange={(e) => updateItem(item.id, "answer", e.target.value)}
              rows={3}
              className="input-field resize-none text-neutral-300"
              placeholder="Answer"
            />
          </div>
        ))}

        <button type="button" onClick={addItem} className="px-4 py-2 rounded-lg border border-dashed border-white/20 text-sm text-neutral-400 hover:text-white hover:border-white/40 transition">
          + Add FAQ item
        </button>
      </div>

      <ConfirmModal open={showPublishModal} title="Publish FAQ?" message="This will update the live FAQ page immediately." confirmLabel="Publish now" onConfirm={handlePublish} onCancel={() => setShowPublishModal(false)} />
      <ConfirmModal open={showDiscardModal} title="Discard FAQ draft?" message="Unsaved FAQ changes will be lost." confirmLabel="Discard" confirmDestructive onConfirm={handleDiscard} onCancel={() => setShowDiscardModal(false)} />
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-neutral-800 border border-white/15 text-sm text-neutral-100 shadow-2xl">{toast}</div>}
    </div>
  );
}
