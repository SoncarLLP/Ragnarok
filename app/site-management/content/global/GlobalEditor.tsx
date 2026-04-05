"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GlobalContent } from "@/lib/site-management";
import DraftBanner from "../../components/DraftBanner";
import ConfirmModal from "../../components/ConfirmModal";
import PublishHistory from "../../components/PublishHistory";

type Props = {
  liveContent: GlobalContent;
  initialDraft: GlobalContent | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
};

export default function GlobalEditor({ liveContent, initialDraft, hasDraft: initialHasDraft, draftUpdatedAt }: Props) {
  const router = useRouter();
  const [content, setContent] = useState<GlobalContent>(initialDraft ?? liveContent);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [lastSaved, setLastSaved] = useState<string | null>(draftUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"announcement" | "footer" | "contact" | "history">("announcement");
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveDraft = useCallback(async (data: GlobalContent) => {
    setSaving(true);
    try {
      const res = await fetch("/api/site-management/content/global", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_data: data }),
      });
      if (res.ok) {
        const json = await res.json();
        setLastSaved(json.draft?.updated_at ?? new Date().toISOString());
        setHasDraft(true);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const triggerSave = useCallback((data: GlobalContent) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(data), 1500);
  }, [saveDraft]);

  const update = useCallback((updater: (prev: GlobalContent) => GlobalContent) => {
    setContent((prev) => {
      const next = updater(prev);
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
      const res = await fetch("/api/site-management/content/global/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setHasDraft(false);
        showToast("Global content published!");
        router.refresh();
      } else {
        const data = await res.json();
        showToast(`Failed: ${data.error}`);
      }
    } finally {
      setPublishing(false);
    }
  }, [content, saveDraft, router]);

  const handleDiscard = useCallback(async () => {
    setShowDiscardModal(false);
    await fetch("/api/site-management/content/global", { method: "DELETE" });
    setContent(liveContent);
    setHasDraft(false);
    setLastSaved(null);
    showToast("Draft discarded.");
  }, [liveContent]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const addFooterLink = () => {
    update((p) => ({
      ...p,
      footer: { ...p.footer, links: [...p.footer.links, { label: "", url: "" }] },
    }));
  };

  const updateFooterLink = (i: number, key: "label" | "url", val: string) => {
    update((p) => {
      const links = [...p.footer.links];
      links[i] = { ...links[i], [key]: val };
      return { ...p, footer: { ...p.footer, links } };
    });
  };

  const removeFooterLink = (i: number) => {
    update((p) => ({
      ...p,
      footer: { ...p.footer, links: p.footer.links.filter((_, idx) => idx !== i) },
    }));
  };

  const tabs = [
    { key: "announcement", label: "Announcement bar" },
    { key: "footer", label: "Footer" },
    { key: "contact", label: "Contact" },
    { key: "history", label: "History" },
  ] as const;

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center gap-3">
        <Link href="/site-management/content" className="text-neutral-500 hover:text-white text-sm transition">
          ← Content
        </Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-lg font-semibold">Global & Footer</h1>
      </div>

      <DraftBanner
        hasChanges={hasDraft}
        lastSaved={lastSaved}
        saving={saving}
        entityType="site_content"
        entityId="global"
        onPublish={() => setShowPublishModal(true)}
        onDiscard={() => setShowDiscardModal(true)}
        publishing={publishing}
      />

      <div className="admin-tab-bar flex gap-1 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-amber-400 text-amber-200"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcement bar */}
      {activeTab === "announcement" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">
            The site-wide announcement bar appears at the very top of every page.
          </p>
          <Field label="Show announcement bar">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={content.announcement_bar.enabled}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_bar: { ...p.announcement_bar, enabled: e.target.checked } }))
                }
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-sm text-neutral-300">Show on all pages</span>
            </label>
          </Field>
          <Field label="Bar text">
            <input
              type="text"
              value={content.announcement_bar.text}
              onChange={(e) =>
                update((p) => ({ ...p, announcement_bar: { ...p.announcement_bar, text: e.target.value } }))
              }
              className="input-field"
              placeholder="Free UK delivery on orders over £60"
            />
          </Field>
          <Field label="Link URL (optional)">
            <input
              type="text"
              value={content.announcement_bar.link}
              onChange={(e) =>
                update((p) => ({ ...p, announcement_bar: { ...p.announcement_bar, link: e.target.value } }))
              }
              className="input-field font-mono text-xs"
              placeholder="/cart"
            />
          </Field>
          <Field label="Background colour">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={content.announcement_bar.background_color}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_bar: { ...p.announcement_bar, background_color: e.target.value } }))
                }
                className="w-10 h-10 rounded cursor-pointer border border-white/15 bg-transparent"
              />
              <input
                type="text"
                value={content.announcement_bar.background_color}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_bar: { ...p.announcement_bar, background_color: e.target.value } }))
                }
                className="input-field font-mono text-xs w-36"
              />
            </div>
          </Field>

          {content.announcement_bar.enabled && content.announcement_bar.text && (
            <div
              className="rounded-lg px-4 py-2.5 text-sm text-center font-medium"
              style={{ backgroundColor: content.announcement_bar.background_color }}
            >
              {content.announcement_bar.text}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {activeTab === "footer" && (
        <div className="space-y-5">
          <Field label="Company info text">
            <textarea
              value={content.footer.company_info}
              onChange={(e) =>
                update((p) => ({ ...p, footer: { ...p.footer, company_info: e.target.value } }))
              }
              rows={2}
              className="input-field resize-none"
              placeholder="SONCAR Limited · soncar.co.uk · All rights reserved."
            />
          </Field>

          <div>
            <p className="text-sm font-medium text-neutral-300 mb-3">Social media links</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(["instagram", "twitter", "facebook", "tiktok", "youtube"] as const).map((platform) => (
                <Field key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
                  <input
                    type="text"
                    value={content.footer.social_media[platform]}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        footer: {
                          ...p.footer,
                          social_media: { ...p.footer.social_media, [platform]: e.target.value },
                        },
                      }))
                    }
                    className="input-field font-mono text-xs"
                    placeholder={`https://www.${platform}.com/soncar`}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-neutral-300">Footer links</p>
              <button
                type="button"
                onClick={addFooterLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-neutral-400 hover:text-white hover:border-white/40 transition"
              >
                + Add link
              </button>
            </div>
            <div className="space-y-2">
              {content.footer.links.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateFooterLink(i, "label", e.target.value)}
                    className="input-field"
                    placeholder="Link label"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateFooterLink(i, "url", e.target.value)}
                    className="input-field font-mono text-xs"
                    placeholder="/policies"
                  />
                  <button
                    type="button"
                    onClick={() => removeFooterLink(i)}
                    className="shrink-0 px-2 py-1.5 text-red-400/60 hover:text-red-400 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {content.footer.links.length === 0 && (
                <p className="text-xs text-neutral-600">No footer links yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact */}
      {activeTab === "contact" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Contact information displayed on the site.</p>
          <Field label="Email address">
            <input
              type="email"
              value={content.contact.email}
              onChange={(e) => update((p) => ({ ...p, contact: { ...p.contact, email: e.target.value } }))}
              className="input-field"
              placeholder="hello@soncar.co.uk"
            />
          </Field>
          <Field label="Phone number">
            <input
              type="tel"
              value={content.contact.phone}
              onChange={(e) => update((p) => ({ ...p, contact: { ...p.contact, phone: e.target.value } }))}
              className="input-field"
              placeholder="+44 ..."
            />
          </Field>
          <Field label="Address">
            <textarea
              value={content.contact.address}
              onChange={(e) => update((p) => ({ ...p, contact: { ...p.contact, address: e.target.value } }))}
              rows={3}
              className="input-field resize-none"
              placeholder="123 Example Street, London, UK"
            />
          </Field>
        </div>
      )}

      {/* History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Last 10 published versions of global content.</p>
          <PublishHistory entityType="site_content" entityId="global" onReverted={() => router.refresh()} />
        </div>
      )}

      <ConfirmModal
        open={showPublishModal}
        title="Publish global content?"
        message="This will update the site-wide announcement bar, footer, and contact information immediately across all pages."
        confirmLabel="Publish now"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishModal(false)}
      />
      <ConfirmModal
        open={showDiscardModal}
        title="Discard draft?"
        message="All unsaved changes to global content will be lost."
        confirmLabel="Discard"
        confirmDestructive
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardModal(false)}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-neutral-800 border border-white/15 text-sm text-neutral-100 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-300">{label}</label>
      {hint && <p className="text-xs text-neutral-600">{hint}</p>}
      {children}
    </div>
  );
}
