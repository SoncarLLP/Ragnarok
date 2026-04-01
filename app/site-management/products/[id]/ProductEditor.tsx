"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  DBProductWithImages,
  ProductImage,
  CustomSegment,
  StockStatus,
  ProductVisibility,
  ProductTheme,
  ParticleEffectType,
} from "@/lib/site-management";
import {
  STOCK_STATUS_LABELS,
  VISIBILITY_LABELS,
  DEFAULT_SEGMENT_TEMPLATES,
  DEFAULT_PRODUCT_THEMES,
  penceToDisplay,
  displayToPence,
} from "@/lib/site-management";
import RichTextEditor from "../../components/RichTextEditor";
import ImageUploader from "../../components/ImageUploader";
import DraftBanner from "../../components/DraftBanner";
import ConfirmModal from "../../components/ConfirmModal";
import PublishHistory from "../../components/PublishHistory";

type FormState = {
  slug: string;
  name: string;
  description_html: string;
  price_display: string;
  stock_status: StockStatus;
  visibility: ProductVisibility;
  is_featured: boolean;
  custom_segments: CustomSegment[];
  meta_title: string;
  meta_description: string;
  related_product_ids: string[];
  loyalty_multiplier: string;
  sort_order: string;
  theme: ProductTheme | null;
};

type Props = {
  product: DBProductWithImages;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialDraft: Record<string, any> | null;
  hasDraft: boolean;
  draftUpdatedAt: string | null;
  allProducts: { id: string; slug: string; name: string }[];
};

function productToForm(p: DBProductWithImages): FormState {
  return {
    slug: p.slug,
    name: p.name,
    description_html: p.description_html ?? "",
    price_display: (p.price_pence / 100).toFixed(2),
    stock_status: p.stock_status,
    visibility: p.visibility,
    is_featured: p.is_featured,
    custom_segments: p.custom_segments ?? [],
    meta_title: p.meta_title ?? "",
    meta_description: p.meta_description ?? "",
    related_product_ids: p.related_product_ids ?? [],
    loyalty_multiplier: String(p.loyalty_multiplier ?? 1),
    sort_order: String(p.sort_order ?? 0),
    theme: (p.theme as ProductTheme | null) ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function draftToForm(draft: Record<string, any>): Partial<FormState> {
  const out: Partial<FormState> = {};
  if ("slug" in draft) out.slug = draft.slug;
  if ("name" in draft) out.name = draft.name;
  if ("description_html" in draft) out.description_html = draft.description_html;
  if ("price_pence" in draft) out.price_display = (draft.price_pence / 100).toFixed(2);
  if ("stock_status" in draft) out.stock_status = draft.stock_status;
  if ("visibility" in draft) out.visibility = draft.visibility;
  if ("is_featured" in draft) out.is_featured = draft.is_featured;
  if ("custom_segments" in draft) out.custom_segments = draft.custom_segments;
  if ("meta_title" in draft) out.meta_title = draft.meta_title;
  if ("meta_description" in draft) out.meta_description = draft.meta_description;
  if ("related_product_ids" in draft) out.related_product_ids = draft.related_product_ids;
  if ("loyalty_multiplier" in draft) out.loyalty_multiplier = String(draft.loyalty_multiplier);
  if ("sort_order" in draft) out.sort_order = String(draft.sort_order);
  if ("theme" in draft) out.theme = draft.theme as ProductTheme | null;
  return out;
}

function formToDraft(form: FormState) {
  return {
    slug: form.slug,
    name: form.name,
    description_html: form.description_html,
    price_pence: displayToPence(form.price_display),
    stock_status: form.stock_status,
    visibility: form.visibility,
    is_featured: form.is_featured,
    custom_segments: form.custom_segments,
    meta_title: form.meta_title || null,
    meta_description: form.meta_description || null,
    related_product_ids: form.related_product_ids,
    loyalty_multiplier: parseFloat(form.loyalty_multiplier) || 1,
    sort_order: parseInt(form.sort_order) || 0,
    theme: form.theme,
  };
}

export default function ProductEditor({
  product,
  initialDraft,
  hasDraft: initialHasDraft,
  draftUpdatedAt: initialDraftUpdatedAt,
  allProducts,
}: Props) {
  const router = useRouter();
  const baseForm = productToForm(product);
  const [form, setForm] = useState<FormState>(() => ({
    ...baseForm,
    ...(initialDraft ? draftToForm(initialDraft) : {}),
  }));
  const [images, setImages] = useState<ProductImage[]>(
    [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)
  );
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [lastSaved, setLastSaved] = useState<string | null>(initialDraftUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"core" | "segments" | "theme" | "seo" | "history">("core");
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  // Auto-save with debounce
  const saveDraft = useCallback(async (data: FormState) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/site-management/products/${product.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_data: formToDraft(data) }),
      });
      if (res.ok) {
        const json = await res.json();
        setLastSaved(json.draft?.updated_at ?? new Date().toISOString());
        setHasDraft(true);
      }
    } finally {
      setSaving(false);
    }
  }, [product.id]);

  const triggerSave = useCallback((data: FormState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(data), 1500);
  }, [saveDraft]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      isDirty.current = true;
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  // Show toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Publish
  const handlePublish = useCallback(async () => {
    setShowPublishModal(false);
    setPublishing(true);
    try {
      // Save draft first to ensure latest
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await saveDraft(form);

      const res = await fetch(`/api/site-management/products/${product.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToDraft(form)),
      });
      if (res.ok) {
        setHasDraft(false);
        showToast("Published successfully!");
        router.refresh();
      } else {
        const data = await res.json();
        showToast(`Publish failed: ${data.error}`);
      }
    } finally {
      setPublishing(false);
    }
  }, [form, product.id, saveDraft, router]);

  // Discard draft
  const handleDiscard = useCallback(async () => {
    setShowDiscardModal(false);
    await fetch(`/api/site-management/products/${product.id}/draft`, { method: "DELETE" });
    setForm(productToForm(product));
    setHasDraft(false);
    setLastSaved(null);
    showToast("Draft discarded.");
  }, [product]);

  // Segment helpers
  const addSegment = (title?: string) => {
    const seg: CustomSegment = {
      id: `seg-${Date.now()}`,
      title: title ?? "",
      content_html: "",
    };
    update("custom_segments", [...form.custom_segments, seg]);
  };

  const updateSegment = (id: string, key: "title" | "content_html", val: string) => {
    update(
      "custom_segments",
      form.custom_segments.map((s) => (s.id === id ? { ...s, [key]: val } : s))
    );
  };

  const removeSegment = (id: string) => {
    update("custom_segments", form.custom_segments.filter((s) => s.id !== id));
  };

  const moveSegment = (id: string, dir: -1 | 1) => {
    const arr = [...form.custom_segments];
    const i = arr.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    update("custom_segments", arr);
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const tabs = [
    { key: "core",     label: "Core details" },
    { key: "segments", label: `Segments (${form.custom_segments.length})` },
    { key: "theme",    label: "Theme" },
    { key: "seo",      label: "SEO & settings" },
    { key: "history",  label: "Version history" },
  ] as const;

  const designStudioHref = `/site-management/products/${product.id}/design`;

  return (
    <div className="space-y-5 pb-16">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/site-management/products"
          className="text-neutral-500 hover:text-white text-sm transition"
        >
          ← Products
        </Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-lg font-semibold truncate">{form.name || "Untitled product"}</h1>
      </div>

      {/* Draft banner */}
      <DraftBanner
        hasChanges={hasDraft}
        lastSaved={lastSaved}
        saving={saving}
        entityType="product"
        entityId={product.id}
        onPublish={() => setShowPublishModal(true)}
        onDiscard={() => setShowDiscardModal(true)}
        publishing={publishing}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-0 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-amber-400 text-amber-200"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {/* Design Studio external link tab */}
        <Link
          href={designStudioHref}
          className="px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px border-transparent hover:border-amber-400/40"
          style={{ color: "#e8a878" }}
          title="Open full Design Studio"
        >
          ✦ Design Studio ↗
        </Link>
      </div>

      {/* ── Tab: Core details ── */}
      {activeTab === "core" && (
        <div className="space-y-6">
          {/* Product name + slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Product name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
                placeholder="e.g. Freyja's Bloom"
              />
            </Field>
            <Field label="URL slug" hint="Used in the product URL: /product/[slug]">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30 font-mono"
                placeholder="freyjas-bloom"
              />
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" hint="Shown on the product page.">
            <RichTextEditor
              value={form.description_html}
              onChange={(v) => update("description_html", v)}
              placeholder="Describe this product…"
              minHeight="160px"
            />
          </Field>

          {/* Price + stock + visibility */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Price (£)">
              <input
                type="text"
                inputMode="decimal"
                value={form.price_display}
                onChange={(e) => update("price_display", e.target.value)}
                onBlur={(e) => {
                  const n = parseFloat(e.target.value);
                  if (!isNaN(n)) update("price_display", n.toFixed(2));
                }}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
                placeholder="30.00"
              />
              <p className="text-xs text-neutral-600 mt-1">
                = {penceToDisplay(displayToPence(form.price_display) || 0)}
              </p>
            </Field>
            <Field label="Stock status">
              <select
                value={form.stock_status}
                onChange={(e) => update("stock_status", e.target.value as StockStatus)}
                className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
              >
                {(Object.entries(STOCK_STATUS_LABELS) as [StockStatus, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Visibility">
              <select
                value={form.visibility}
                onChange={(e) => update("visibility", e.target.value as ProductVisibility)}
                className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
              >
                {(Object.entries(VISIBILITY_LABELS) as [ProductVisibility, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Featured + loyalty */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Featured product" hint="Featured products appear highlighted in the shop.">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => update("is_featured", e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span className="text-sm text-neutral-300">Mark as featured</span>
              </label>
            </Field>
            <Field label="Loyalty points multiplier" hint="1.0 = standard rate (10pts per £1). 2.0 = double points.">
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={form.loyalty_multiplier}
                onChange={(e) => update("loyalty_multiplier", e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
              />
            </Field>
          </div>

          {/* Images */}
          <Field label="Product images" hint="Drag to reorder. Click an image to set it as primary.">
            <ImageUploader
              productId={product.id}
              images={images}
              onImagesChange={setImages}
            />
          </Field>

          {/* Related products */}
          <Field label="Related products" hint="Up to 4 related products shown at the bottom of the product page.">
            <div className="space-y-2">
              {allProducts.map((p) => {
                const checked = form.related_product_ids.includes(p.id);
                const atLimit = form.related_product_ids.length >= 4 && !checked;
                return (
                  <label key={p.id} className={`flex items-center gap-3 cursor-pointer ${atLimit ? "opacity-40" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atLimit}
                      onChange={(e) => {
                        if (e.target.checked) {
                          update("related_product_ids", [...form.related_product_ids, p.id].slice(0, 4));
                        } else {
                          update("related_product_ids", form.related_product_ids.filter((id) => id !== p.id));
                        }
                      }}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="text-sm text-neutral-300">{p.name}</span>
                    <span className="text-xs text-neutral-600">{p.slug}</span>
                  </label>
                );
              })}
              {allProducts.length === 0 && (
                <p className="text-sm text-neutral-600">No other products available.</p>
              )}
            </div>
          </Field>
        </div>
      )}

      {/* ── Tab: Custom segments ── */}
      {activeTab === "segments" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">
                Add content sections to the product page (e.g. Ingredients, Nutritional Info).
              </p>
            </div>
          </div>

          {/* Existing segments */}
          {form.custom_segments.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-neutral-600">
              No segments yet. Add one below.
            </div>
          )}

          {form.custom_segments.map((seg, i) => (
            <div key={seg.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={seg.title}
                  onChange={(e) => updateSegment(seg.id, "title", e.target.value)}
                  placeholder="Section title"
                  className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-white/30 font-medium"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveSegment(seg.id, -1)}
                    disabled={i === 0}
                    className="px-2 py-1 text-neutral-500 hover:text-white disabled:opacity-30 transition"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSegment(seg.id, 1)}
                    disabled={i === form.custom_segments.length - 1}
                    className="px-2 py-1 text-neutral-500 hover:text-white disabled:opacity-30 transition"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSegment(seg.id)}
                    className="px-2 py-1 text-red-400/60 hover:text-red-400 transition"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <RichTextEditor
                value={seg.content_html}
                onChange={(v) => updateSegment(seg.id, "content_html", v)}
                placeholder="Section content…"
                minHeight="100px"
              />
            </div>
          ))}

          {/* Add segment */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => addSegment()}
              className="px-4 py-2 rounded-lg border border-dashed border-white/20 text-sm text-neutral-400 hover:text-white hover:border-white/40 transition"
            >
              + Add custom segment
            </button>

            {/* Suggested templates */}
            <div>
              <p className="text-xs text-neutral-600 mb-2">Quick-add from template:</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SEGMENT_TEMPLATES.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => addSegment(title)}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/25 transition"
                  >
                    + {title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Theme ── */}
      {activeTab === "theme" && (
        <ThemeTab
          slug={form.slug}
          theme={form.theme}
          onChange={(t) => update("theme", t)}
        />
      )}

      {/* ── Tab: SEO & Settings ── */}
      {activeTab === "seo" && (
        <div className="space-y-5">
          <Field label="Meta title" hint="Overrides the default page title in search results. Leave blank to use product name.">
            <input
              type="text"
              value={form.meta_title}
              onChange={(e) => update("meta_title", e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
              placeholder={form.name}
              maxLength={60}
            />
            <p className="text-xs text-neutral-600 mt-1">{form.meta_title.length}/60 chars</p>
          </Field>
          <Field label="Meta description" hint="Shown in search engine results. Keep under 160 characters.">
            <textarea
              value={form.meta_description}
              onChange={(e) => update("meta_description", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30 resize-none"
              placeholder="Brief description for search engines…"
              maxLength={160}
            />
            <p className="text-xs text-neutral-600 mt-1">{form.meta_description.length}/160 chars</p>
          </Field>
          <Field label="Sort order" hint="Lower numbers appear first in the shop listing.">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => update("sort_order", e.target.value)}
              className="w-40 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
            />
          </Field>

          {/* Live preview link */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-200">Preview this product</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Opens a live preview of the product page with your draft changes applied.
              </p>
            </div>
            <a
              href={`/product/${form.slug}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm px-4 py-2 rounded-lg bg-white/8 hover:bg-white/15 text-neutral-300 hover:text-white transition"
            >
              Preview ↗
            </a>
          </div>
        </div>
      )}

      {/* ── Tab: Version history ── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">
            Last 10 published versions. You can revert to any previous version.
          </p>
          <PublishHistory
            entityType="product"
            entityId={product.id}
            onReverted={() => router.refresh()}
          />
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        open={showPublishModal}
        title="Publish this product?"
        message={`This will make your changes to "${form.name}" live on the site immediately. The current live version will be saved to version history.`}
        confirmLabel="Publish now"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishModal(false)}
      />
      <ConfirmModal
        open={showDiscardModal}
        title="Discard draft?"
        message="This will revert all unsaved changes to the last published version. This cannot be undone."
        confirmLabel="Discard draft"
        confirmDestructive
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardModal(false)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-neutral-800 border border-white/15 text-sm text-neutral-100 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── ThemeTab ──────────────────────────────────────────────────────────────────

const PARTICLE_OPTIONS: { value: ParticleEffectType; label: string }[] = [
  { value: "petals",   label: "Petals (Freyja's Bloom)"     },
  { value: "embers",   label: "Embers (Loki Hell Fire)"     },
  { value: "droplets", label: "Droplets (Dümmens Nectar)"   },
  { value: "sparks",   label: "Sparks"                       },
  { value: "none",     label: "None"                         },
];

const THEME_FIELDS: { key: keyof ProductTheme; label: string; type: "color" | "text" }[] = [
  { key: "bg",           label: "Primary background",   type: "color" },
  { key: "bg2",          label: "Secondary background", type: "color" },
  { key: "card",         label: "Card background",      type: "color" },
  { key: "panel",        label: "Panel background",     type: "color" },
  { key: "accent",       label: "Accent colour",        type: "color" },
  { key: "heading",      label: "Heading colour",       type: "color" },
  { key: "marbleC1",     label: "Marble base 1",        type: "color" },
  { key: "marbleC2",     label: "Marble base 2",        type: "color" },
  { key: "accentGlow",   label: "Accent glow (rgba)",   type: "text"  },
  { key: "accentBorder", label: "Accent border (rgba)", type: "text"  },
  { key: "marbleVein",   label: "Marble vein (rgba)",   type: "text"  },
  { key: "marbleSpeed",  label: "Marble speed (e.g. 14s)", type: "text" },
  { key: "glowColor",    label: "Atmospheric glow (rgba)", type: "text" },
];

function ThemeTab({
  slug,
  theme,
  onChange,
}: {
  slug: string;
  theme: ProductTheme | null;
  onChange: (t: ProductTheme | null) => void;
}) {
  const defaultTheme = DEFAULT_PRODUCT_THEMES[slug] ?? null;
  // Effective theme for the editor: custom override or default
  const effective: ProductTheme | null = theme ?? defaultTheme;

  const update = (key: keyof ProductTheme, value: string) => {
    const base = effective ?? (defaultTheme ?? ({} as ProductTheme));
    onChange({ ...base, [key]: value } as ProductTheme);
  };

  const handleReset = () => {
    // Reset to the Claude Code default for this slug (null = use default)
    onChange(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-neutral-400">
            Customise the atmospheric theme that appears when members visit this product page.
            Changes are saved to the draft and published with the product.
          </p>
          {!defaultTheme && (
            <p className="text-xs text-amber-400 mt-1">
              No default theme defined for slug <code className="font-mono">{slug}</code>. A custom theme must be set manually.
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {defaultTheme && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition"
            >
              Reset to default
            </button>
          )}
          <a
            href={`/product/${slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition"
          >
            Preview ↗
          </a>
        </div>
      </div>

      {/* Live mini-preview */}
      {effective && (
        <div
          className="rounded-xl overflow-hidden border border-white/10"
          style={{ background: effective.bg }}
        >
          <div className="px-5 py-3 flex items-center gap-3 border-b border-white/10"
            style={{ background: effective.bg2 }}>
            <div className="w-3 h-3 rounded-full" style={{ background: effective.accent }} />
            <span className="text-xs font-semibold tracking-widest" style={{ color: effective.accent, fontFamily: "var(--font-heading, serif)" }}>
              Ragnarök
            </span>
          </div>
          <div className="p-5 grid grid-cols-[1fr_auto] gap-4 items-start">
            {/* Text preview */}
            <div>
              <div className="text-lg font-bold mb-1" style={{ color: effective.heading, fontFamily: "var(--font-heading, serif)" }}>
                {slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </div>
              <div className="h-px mb-3" style={{ background: effective.accentBorder }} />
              <div className="text-xs mb-3" style={{ color: "rgba(240,236,228,0.5)" }}>
                Product description preview…
              </div>
              <div className="text-xl font-bold" style={{ color: effective.accent }}>£30.00</div>
            </div>
            {/* Colour swatches */}
            <div className="grid grid-cols-3 gap-1.5">
              {[effective.bg, effective.bg2, effective.card, effective.panel, effective.accent, effective.heading].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded" style={{ background: c, border: "1px solid rgba(255,255,255,0.12)" }} title={c} />
              ))}
            </div>
          </div>
          {/* Particle type indicator */}
          <div className="px-5 pb-4 text-xs" style={{ color: effective.accent }}>
            ✦ Particle effect: {effective.particleEffect}
          </div>
        </div>
      )}

      {/* Colour pickers */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-4">Colours &amp; effects</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {THEME_FIELDS.map(({ key, label, type }) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-400">{label}</label>
              {type === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(effective?.[key] as string | undefined) ?? "#000000"}
                    onChange={(e) => update(key, e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-white/15 bg-transparent"
                    style={{ padding: "2px" }}
                  />
                  <input
                    type="text"
                    value={(effective?.[key] as string | undefined) ?? ""}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder="#rrggbb"
                    className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-white/30"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={(effective?.[key] as string | undefined) ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={key === "marbleSpeed" ? "14s" : "rgba(r,g,b,a)"}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-white/30"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Particle effect selector */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-300">Particle effect</label>
        <p className="text-xs text-neutral-600">The ambient particle animation shown on the product page.</p>
        <select
          value={effective?.particleEffect ?? "none"}
          onChange={(e) => update("particleEffect", e.target.value)}
          className="w-full max-w-xs rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-white/30"
        >
          {PARTICLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Custom theme indicator */}
      {theme !== null && defaultTheme && (
        <p className="text-xs text-amber-400/70">
          This product has a custom theme override. Reset to default to restore the Claude Code defaults.
        </p>
      )}
      {theme === null && defaultTheme && (
        <p className="text-xs text-neutral-600">
          Using default theme. Changing any value above will create a custom override.
        </p>
      )}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-neutral-600">{hint}</p>}
      {children}
    </div>
  );
}
