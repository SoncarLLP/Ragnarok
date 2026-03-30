"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { HomepageContent, CustomHomepageSection } from "@/lib/site-management";
import RichTextEditor from "../../components/RichTextEditor";
import DraftBanner from "../../components/DraftBanner";
import ConfirmModal from "../../components/ConfirmModal";
import PublishHistory from "../../components/PublishHistory";

type Product = { id: string; slug: string; name: string; primary_image_url: string | null };

type Props = {
  liveContent: HomepageContent;
  initialDraft: HomepageContent | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  publishedProducts: Product[];
};

export default function HomepageEditor({
  liveContent,
  initialDraft,
  hasDraft: initialHasDraft,
  draftUpdatedAt: initialDraftUpdatedAt,
  publishedProducts,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState<HomepageContent>(initialDraft ?? liveContent);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [lastSaved, setLastSaved] = useState<string | null>(initialDraftUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"hero" | "featured" | "banner" | "brand" | "custom" | "history">("hero");
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveDraft = useCallback(async (data: HomepageContent) => {
    setSaving(true);
    try {
      const res = await fetch("/api/site-management/content/homepage", {
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

  const triggerSave = useCallback((data: HomepageContent) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(data), 1500);
  }, [saveDraft]);

  const update = useCallback((updater: (prev: HomepageContent) => HomepageContent) => {
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
      const res = await fetch("/api/site-management/content/homepage/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setHasDraft(false);
        showToast("Homepage published!");
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
    await fetch("/api/site-management/content/homepage", { method: "DELETE" });
    setContent(liveContent);
    setHasDraft(false);
    setLastSaved(null);
    showToast("Draft discarded.");
  }, [liveContent]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const addCustomSection = () => {
    const sec: CustomHomepageSection = {
      id: `sec-${Date.now()}`,
      type: "text",
      heading: "",
      body_html: "",
      image_url: null,
      image_position: "right",
    };
    update((p) => ({ ...p, custom_sections: [...p.custom_sections, sec] }));
  };

  const updateSection = (id: string, patch: Partial<CustomHomepageSection>) => {
    update((p) => ({
      ...p,
      custom_sections: p.custom_sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeSection = (id: string) => {
    update((p) => ({ ...p, custom_sections: p.custom_sections.filter((s) => s.id !== id) }));
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    update((p) => {
      const arr = [...p.custom_sections];
      const i = arr.findIndex((s) => s.id === id);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...p, custom_sections: arr };
    });
  };

  const tabs = [
    { key: "hero", label: "Hero" },
    { key: "featured", label: "Featured products" },
    { key: "banner", label: "Banner" },
    { key: "brand", label: "Brand story" },
    { key: "custom", label: `Custom sections (${content.custom_sections.length})` },
    { key: "history", label: "History" },
  ] as const;

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center gap-3">
        <Link href="/site-management/content" className="text-neutral-500 hover:text-white text-sm transition">
          ← Content
        </Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-lg font-semibold">Homepage</h1>
        <a
          href="/?preview=1"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition"
        >
          Preview ↗
        </a>
      </div>

      <DraftBanner
        hasChanges={hasDraft}
        lastSaved={lastSaved}
        saving={saving}
        entityType="site_content"
        entityId="homepage"
        onPublish={() => setShowPublishModal(true)}
        onDiscard={() => setShowDiscardModal(true)}
        publishing={publishing}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
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

      {/* Hero tab */}
      {activeTab === "hero" && (
        <div className="space-y-4">
          <Field label="Main heading">
            <input
              type="text"
              value={content.hero.heading}
              onChange={(e) => update((p) => ({ ...p, hero: { ...p.hero, heading: e.target.value } }))}
              className="input-field"
              placeholder="Ragnarök"
            />
          </Field>
          <Field label="Subtitle">
            <textarea
              value={content.hero.subtitle}
              onChange={(e) => update((p) => ({ ...p, hero: { ...p.hero, subtitle: e.target.value } }))}
              rows={3}
              className="input-field resize-none"
              placeholder="Tagline shown below the heading"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Primary button text">
              <input
                type="text"
                value={content.hero.primary_cta_text}
                onChange={(e) => update((p) => ({ ...p, hero: { ...p.hero, primary_cta_text: e.target.value } }))}
                className="input-field"
              />
            </Field>
            <Field label="Primary button link">
              <input
                type="text"
                value={content.hero.primary_cta_link}
                onChange={(e) => update((p) => ({ ...p, hero: { ...p.hero, primary_cta_link: e.target.value } }))}
                className="input-field font-mono text-xs"
              />
            </Field>
            <Field label="Secondary button text">
              <input
                type="text"
                value={content.hero.secondary_cta_text}
                onChange={(e) => update((p) => ({ ...p, hero: { ...p.hero, secondary_cta_text: e.target.value } }))}
                className="input-field"
              />
            </Field>
            <Field label="Secondary button link">
              <input
                type="text"
                value={content.hero.secondary_cta_link}
                onChange={(e) => update((p) => ({ ...p, hero: { ...p.hero, secondary_cta_link: e.target.value } }))}
                className="input-field font-mono text-xs"
              />
            </Field>
          </div>
          <Field label="Background image URL" hint="Optional. Leave blank to use the default gradient background.">
            <input
              type="text"
              value={content.hero.background_image_url ?? ""}
              onChange={(e) => update((p) => ({ ...p, hero: { ...p.hero, background_image_url: e.target.value || null } }))}
              className="input-field font-mono text-xs"
              placeholder="https://..."
            />
          </Field>
        </div>
      )}

      {/* Featured products tab */}
      {activeTab === "featured" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">
            Select which published products appear in the featured section on the homepage.
          </p>
          <div className="space-y-2">
            {publishedProducts.map((p) => {
              const checked = content.featured_product_slugs.includes(p.slug);
              return (
                <label key={p.id} className="flex items-center gap-3 cursor-pointer py-2 border-b border-white/5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      update((prev) => ({
                        ...prev,
                        featured_product_slugs: e.target.checked
                          ? [...prev.featured_product_slugs, p.slug]
                          : prev.featured_product_slugs.filter((s) => s !== p.slug),
                      }));
                    }}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  {p.primary_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.primary_image_url} alt="" className="w-8 h-8 rounded object-contain bg-neutral-800" />
                  )}
                  <span className="text-sm text-neutral-200">{p.name}</span>
                  <span className="text-xs text-neutral-600">{p.slug}</span>
                </label>
              );
            })}
            {publishedProducts.length === 0 && (
              <p className="text-sm text-neutral-600">No published products yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Announcement banner tab */}
      {activeTab === "banner" && (
        <div className="space-y-4">
          <Field label="Show announcement banner">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={content.announcement_banner.enabled}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_banner: { ...p.announcement_banner, enabled: e.target.checked } }))
                }
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-sm text-neutral-300">Show banner on homepage</span>
            </label>
          </Field>
          <Field label="Banner text">
            <input
              type="text"
              value={content.announcement_banner.text}
              onChange={(e) =>
                update((p) => ({ ...p, announcement_banner: { ...p.announcement_banner, text: e.target.value } }))
              }
              className="input-field"
              placeholder="e.g. 🎉 New flavours just dropped — free shipping this week!"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Link URL">
              <input
                type="text"
                value={content.announcement_banner.link}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_banner: { ...p.announcement_banner, link: e.target.value } }))
                }
                className="input-field font-mono text-xs"
                placeholder="/product/..."
              />
            </Field>
            <Field label="Link text">
              <input
                type="text"
                value={content.announcement_banner.link_text}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_banner: { ...p.announcement_banner, link_text: e.target.value } }))
                }
                className="input-field"
                placeholder="Shop now →"
              />
            </Field>
          </div>
          <Field label="Background colour">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={content.announcement_banner.background_color}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_banner: { ...p.announcement_banner, background_color: e.target.value } }))
                }
                className="w-10 h-10 rounded cursor-pointer border border-white/15 bg-transparent"
              />
              <input
                type="text"
                value={content.announcement_banner.background_color}
                onChange={(e) =>
                  update((p) => ({ ...p, announcement_banner: { ...p.announcement_banner, background_color: e.target.value } }))
                }
                className="input-field font-mono text-xs w-36"
              />
            </div>
          </Field>

          {/* Preview */}
          {content.announcement_banner.enabled && content.announcement_banner.text && (
            <div
              className="rounded-lg px-4 py-3 text-sm text-center font-medium"
              style={{ backgroundColor: content.announcement_banner.background_color + "33", border: `1px solid ${content.announcement_banner.background_color}55` }}
            >
              {content.announcement_banner.text}
              {content.announcement_banner.link_text && (
                <span className="ml-2 underline opacity-80">{content.announcement_banner.link_text}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Brand story tab */}
      {activeTab === "brand" && (
        <div className="space-y-4">
          <Field label="Show brand story section">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={content.brand_story.enabled}
                onChange={(e) =>
                  update((p) => ({ ...p, brand_story: { ...p.brand_story, enabled: e.target.checked } }))
                }
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-sm text-neutral-300">Show on homepage</span>
            </label>
          </Field>
          <Field label="Section heading">
            <input
              type="text"
              value={content.brand_story.heading}
              onChange={(e) =>
                update((p) => ({ ...p, brand_story: { ...p.brand_story, heading: e.target.value } }))
              }
              className="input-field"
              placeholder="Our story"
            />
          </Field>
          <Field label="Body text">
            <RichTextEditor
              value={content.brand_story.body_html}
              onChange={(v) => update((p) => ({ ...p, brand_story: { ...p.brand_story, body_html: v } }))}
              placeholder="Tell your brand story…"
              minHeight="160px"
            />
          </Field>
          <Field label="Image URL" hint="Optional image shown alongside the brand story.">
            <input
              type="text"
              value={content.brand_story.image_url ?? ""}
              onChange={(e) =>
                update((p) => ({ ...p, brand_story: { ...p.brand_story, image_url: e.target.value || null } }))
              }
              className="input-field font-mono text-xs"
              placeholder="https://..."
            />
          </Field>
        </div>
      )}

      {/* Custom sections tab */}
      {activeTab === "custom" && (
        <div className="space-y-5">
          <p className="text-sm text-neutral-400">
            Add custom content blocks to the homepage below the main sections.
          </p>

          {content.custom_sections.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-neutral-600">
              No custom sections. Add one below.
            </div>
          )}

          {content.custom_sections.map((sec, i) => (
            <div key={sec.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <select
                  value={sec.type}
                  onChange={(e) => updateSection(sec.id, { type: e.target.value as CustomHomepageSection["type"] })}
                  className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 focus:outline-none"
                >
                  <option value="text">Text only</option>
                  <option value="image">Image only</option>
                  <option value="text_image">Text + Image</option>
                </select>
                <div className="flex items-center gap-1 ml-auto shrink-0">
                  <button type="button" onClick={() => moveSection(sec.id, -1)} disabled={i === 0} className="px-2 py-1 text-neutral-500 hover:text-white disabled:opacity-30 transition">↑</button>
                  <button type="button" onClick={() => moveSection(sec.id, 1)} disabled={i === content.custom_sections.length - 1} className="px-2 py-1 text-neutral-500 hover:text-white disabled:opacity-30 transition">↓</button>
                  <button type="button" onClick={() => removeSection(sec.id)} className="px-2 py-1 text-red-400/60 hover:text-red-400 transition">✕</button>
                </div>
              </div>

              <Field label="Heading">
                <input
                  type="text"
                  value={sec.heading}
                  onChange={(e) => updateSection(sec.id, { heading: e.target.value })}
                  className="input-field"
                  placeholder="Section heading"
                />
              </Field>

              {(sec.type === "text" || sec.type === "text_image") && (
                <Field label="Body content">
                  <RichTextEditor
                    value={sec.body_html}
                    onChange={(v) => updateSection(sec.id, { body_html: v })}
                    placeholder="Section content…"
                    minHeight="100px"
                  />
                </Field>
              )}

              {(sec.type === "image" || sec.type === "text_image") && (
                <>
                  <Field label="Image URL">
                    <input
                      type="text"
                      value={sec.image_url ?? ""}
                      onChange={(e) => updateSection(sec.id, { image_url: e.target.value || null })}
                      className="input-field font-mono text-xs"
                      placeholder="https://..."
                    />
                  </Field>
                  {sec.type === "text_image" && (
                    <Field label="Image position">
                      <select
                        value={sec.image_position}
                        onChange={(e) => updateSection(sec.id, { image_position: e.target.value as "left" | "right" })}
                        className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 focus:outline-none"
                      >
                        <option value="right">Right of text</option>
                        <option value="left">Left of text</option>
                      </select>
                    </Field>
                  )}
                </>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addCustomSection}
            className="px-4 py-2 rounded-lg border border-dashed border-white/20 text-sm text-neutral-400 hover:text-white hover:border-white/40 transition"
          >
            + Add section
          </button>
        </div>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Last 10 published versions of the homepage content.</p>
          <PublishHistory
            entityType="site_content"
            entityId="homepage"
            onReverted={() => router.refresh()}
          />
        </div>
      )}

      <ConfirmModal
        open={showPublishModal}
        title="Publish homepage changes?"
        message="This will update the live homepage immediately. The current version will be saved to history."
        confirmLabel="Publish now"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishModal(false)}
      />
      <ConfirmModal
        open={showDiscardModal}
        title="Discard homepage draft?"
        message="All unsaved changes to the homepage will be lost."
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
