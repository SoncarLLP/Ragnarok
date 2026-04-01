"use client";

/**
 * DesignStudio
 * Full split-screen design control panel for product themes.
 * Left: controls. Right: live preview.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type {
  ProductTheme,
  ParticleEffectType,
  GlowPositionType,
  MarbleDirectionType,
  KnotworkStyleType,
  HeadingWeightType,
  BgBlendModeType,
  GradientDirectionType,
  DesignPreset,
  DesignHistoryEntry,
  DesignTemplateKey,
} from "@/lib/site-management";
import {
  DEFAULT_PRODUCT_THEMES,
  DESIGN_TEMPLATES,
} from "@/lib/site-management";
import ColourWheelPicker from "@/components/design-studio/ColourWheelPicker";
import DesignPreview from "@/components/design-studio/DesignPreview";

// ── Section accordion ────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition"
      >
        <span className="text-sm font-semibold text-neutral-200">{title}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
              {badge}
            </span>
          )}
          <span className="text-neutral-600 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-4 border-t border-white/8">{children}</div>}
    </div>
  );
}

// ── Slider control ────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  gradient,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  gradient?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-400">{label}</label>
        <span className="text-xs font-mono text-neutral-300">{value}{unit}</span>
      </div>
      <div
        className="relative h-2 rounded-full"
        style={{ background: gradient ?? "rgba(255,255,255,0.12)" }}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-0 bottom-0 h-2 rounded-full pointer-events-none"
          style={{
            width: `${((value - min) / (max - min)) * 100}%`,
            background: "rgba(251,191,36,0.7)",
          }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow pointer-events-none"
          style={{
            top: "50%",
            left: `calc(${((value - min) / (max - min)) * 100}% - 7px)`,
            transform: "translateY(-50%)",
          }}
        />
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-neutral-300">{label}</p>
        {hint && <p className="text-xs text-neutral-600 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors shrink-0 relative ${
          checked ? "bg-amber-500" : "bg-white/10"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ── InlineColour ─────────────────────────────────────────────────

function InlineColour({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-neutral-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#888888"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-white/15 bg-transparent shrink-0"
          style={{ padding: "1px" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#rrggbb or rgba(…)"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-white/30"
        />
      </div>
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-neutral-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-white/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

interface Props {
  productId: string;
  productSlug: string;
  productName: string;
  pricePence: number;
  primaryImageUrl: string | null;
  liveTheme: ProductTheme | null;      // currently published theme
  initialDraftTheme: ProductTheme | null;
  hasDraft: boolean;
  draftLastModified: string | null;
  initialPresets: DesignPreset[];
  initialHistory: DesignHistoryEntry[];
}

const PARTICLE_OPTIONS: { value: ParticleEffectType; label: string }[] = [
  { value: "none",       label: "None"       },
  { value: "petals",     label: "Petals"     },
  { value: "embers",     label: "Embers"     },
  { value: "droplets",   label: "Droplets"   },
  { value: "sparks",     label: "Sparks"     },
  { value: "snowflakes", label: "Snowflakes" },
  { value: "leaves",     label: "Leaves"     },
  { value: "stars",      label: "Stars"      },
  { value: "dust",       label: "Dust"       },
];

const GLOW_POSITIONS: { value: GlowPositionType; label: string }[] = [
  { value: "center", label: "Centre"  },
  { value: "top",    label: "Top"     },
  { value: "bottom", label: "Bottom"  },
  { value: "left",   label: "Left"    },
  { value: "right",  label: "Right"   },
];

const MARBLE_DIRECTIONS: { value: MarbleDirectionType; label: string }[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical",   label: "Vertical"   },
  { value: "diagonal",   label: "Diagonal"   },
  { value: "radial",     label: "Radial"     },
];

const KNOTWORK_STYLES: { value: KnotworkStyleType; label: string }[] = [
  { value: "simple_corners", label: "Simple corners" },
  { value: "full_border",    label: "Full border"    },
  { value: "elaborate",      label: "Elaborate full knotwork" },
  { value: "minimal",        label: "Minimal lines"  },
];

const HEADING_WEIGHTS: { value: HeadingWeightType; label: string }[] = [
  { value: "400", label: "Normal (400)"    },
  { value: "500", label: "Medium (500)"    },
  { value: "600", label: "Semi-bold (600)" },
  { value: "700", label: "Bold (700)"      },
  { value: "800", label: "Extra bold (800)" },
];

const BG_BLEND_MODES: { value: BgBlendModeType; label: string }[] = [
  { value: "normal",     label: "Normal"      },
  { value: "multiply",   label: "Multiply"    },
  { value: "screen",     label: "Screen"      },
  { value: "overlay",    label: "Overlay"     },
  { value: "soft-light", label: "Soft light"  },
  { value: "hard-light", label: "Hard light"  },
  { value: "color-dodge", label: "Color dodge" },
  { value: "color-burn", label: "Color burn"  },
];

const GRADIENT_DIRECTIONS: { value: GradientDirectionType; label: string }[] = [
  { value: "to bottom",       label: "Top to bottom"       },
  { value: "to top",          label: "Bottom to top"       },
  { value: "to right",        label: "Left to right"       },
  { value: "to left",         label: "Right to left"       },
  { value: "to bottom right", label: "Diagonal ↘"          },
  { value: "to bottom left",  label: "Diagonal ↙"          },
  { value: "135deg",          label: "135°"                },
  { value: "45deg",           label: "45°"                 },
];

function buildDefaultTheme(slug: string): ProductTheme {
  const base = DEFAULT_PRODUCT_THEMES[slug];
  if (base) return base;
  return DESIGN_TEMPLATES.blank.theme as ProductTheme;
}

export default function DesignStudio({
  productId,
  productSlug,
  productName,
  pricePence,
  primaryImageUrl,
  liveTheme,
  initialDraftTheme,
  hasDraft: initialHasDraft,
  draftLastModified,
  initialPresets,
  initialHistory,
}: Props) {
  const defaultTheme = buildDefaultTheme(productSlug);
  const [theme, setTheme] = useState<ProductTheme>(
    initialDraftTheme ?? liveTheme ?? defaultTheme
  );
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [lastSaved, setLastSaved] = useState<string | null>(draftLastModified);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "err" } | null>(null);
  const [presets, setPresets] = useState<DesignPreset[]>(initialPresets);
  const [history, setHistory] = useState<DesignHistoryEntry[]>(initialHistory);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Auto-save draft ──────────────────────────────────────────────
  const saveDraft = useCallback(async (data: ProductTheme) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/site-management/products/${productId}/design-draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_data: data }),
      });
      if (res.ok) {
        const json = await res.json();
        setLastSaved(json.draft?.last_modified_at ?? new Date().toISOString());
        setHasDraft(true);
      }
    } finally {
      setSaving(false);
    }
  }, [productId]);

  const triggerSave = useCallback((data: ProductTheme) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(data), 1200);
  }, [saveDraft]);

  const update = useCallback(<K extends keyof ProductTheme>(key: K, val: ProductTheme[K]) => {
    setTheme((prev) => {
      const next = { ...prev, [key]: val };
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // ── Publish ──────────────────────────────────────────────────────
  const handlePublish = async () => {
    setShowPublishConfirm(false);
    setPublishing(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await saveDraft(theme);
      const res = await fetch(`/api/site-management/products/${productId}/design-publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_data: theme }),
      });
      if (res.ok) {
        const json = await res.json();
        setHasDraft(false);
        if (json.history_entry) {
          setHistory((prev) => [json.history_entry, ...prev].slice(0, 10));
        }
        showToast("Design published successfully!");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error ?? "Publish failed", "err");
      }
    } finally {
      setPublishing(false);
    }
  };

  // ── Discard draft ────────────────────────────────────────────────
  const handleDiscard = async () => {
    setShowDiscardConfirm(false);
    await fetch(`/api/site-management/products/${productId}/design-draft`, { method: "DELETE" });
    setTheme(liveTheme ?? defaultTheme);
    setHasDraft(false);
    setLastSaved(null);
    showToast("Draft discarded.");
  };

  // ── Revert to history version ─────────────────────────────────
  const handleRevert = async (entry: DesignHistoryEntry) => {
    setRevertingId(entry.id);
    try {
      setTheme(entry.theme_data);
      triggerSave(entry.theme_data);
      showToast(`Reverted to version from ${new Date(entry.published_at).toLocaleString()}`);
    } finally {
      setRevertingId(null);
    }
  };

  // ── Save preset ──────────────────────────────────────────────────
  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    setSavingPreset(true);
    try {
      const res = await fetch("/api/site-management/design-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: presetName.trim(), theme_data: theme }),
      });
      if (res.ok) {
        const json = await res.json();
        setPresets((prev) => [json.preset, ...prev]);
        setPresetName("");
        showToast("Preset saved!");
      } else {
        showToast("Failed to save preset", "err");
      }
    } finally {
      setSavingPreset(false);
    }
  };

  // ── Delete preset ─────────────────────────────────────────────
  const handleDeletePreset = async (id: string) => {
    const res = await fetch(`/api/site-management/design-presets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPresets((prev) => prev.filter((p) => p.id !== id));
      showToast("Preset deleted.");
    }
  };

  // ── Apply preset ──────────────────────────────────────────────
  const handleApplyPreset = (preset: DesignPreset) => {
    setTheme(preset.theme_data);
    triggerSave(preset.theme_data);
    showToast(`Applied preset: ${preset.name}`);
  };

  // ── Apply template ────────────────────────────────────────────
  const handleApplyTemplate = (key: DesignTemplateKey) => {
    const tpl = DESIGN_TEMPLATES[key];
    const merged: ProductTheme = { ...defaultTheme, ...tpl.theme };
    setTheme(merged);
    triggerSave(merged);
    showToast(`Applied template: ${tpl.label}`);
  };

  // ── Reset to default ──────────────────────────────────────────
  const handleReset = () => {
    setTheme(defaultTheme);
    triggerSave(defaultTheme);
    showToast("Reset to default theme.");
  };

  // ── Export JSON ───────────────────────────────────────────────
  const handleExport = () => {
    setExporting(true);
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productSlug}-design.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 1000);
  };

  // ── Import JSON ───────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data === "object" && data !== null && "accent" in data) {
          setTheme(data as ProductTheme);
          triggerSave(data as ProductTheme);
          showToast("Design imported successfully!");
        } else {
          showToast("Invalid design file format.", "err");
        }
      } catch {
        showToast("Failed to parse design file.", "err");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const formattedLastSaved = lastSaved
    ? new Date(lastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-wrap">
        <Link
          href={`/site-management/products/${productId}`}
          className="text-xs text-neutral-500 hover:text-white transition"
        >
          ← Back to editor
        </Link>
        <span className="text-neutral-700">/</span>
        <span className="text-sm font-semibold text-neutral-100">{productName}</span>
        <div
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(201,132,156,0.15), rgba(212,152,10,0.15))",
            color: "#e8a878",
            border: "1px solid rgba(200,150,100,0.2)",
          }}
        >
          Design Studio
        </div>

        <div className="flex-1" />

        {/* Status indicators */}
        {saving && <span className="text-xs text-neutral-500 animate-pulse">Saving…</span>}
        {!saving && hasDraft && (
          <span className="text-xs text-amber-400">
            {formattedLastSaved ? `Draft · saved ${formattedLastSaved}` : "Draft (unsaved changes)"}
          </span>
        )}
        {!hasDraft && <span className="text-xs text-neutral-600">No pending changes</span>}

        <div className="flex items-center gap-2">
          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition"
            title="Export design as JSON"
          >
            ↓ Export
          </button>

          {/* Import */}
          <label className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition cursor-pointer">
            ↑ Import
            <input type="file" accept=".json" className="sr-only" onChange={handleImport} />
          </label>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition"
          >
            Reset
          </button>

          {/* Discard */}
          {hasDraft && (
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 transition"
            >
              Discard
            </button>
          )}

          {/* Publish */}
          <button
            type="button"
            onClick={() => setShowPublishConfirm(true)}
            disabled={publishing}
            className="text-xs px-4 py-1.5 rounded-lg font-semibold transition"
            style={{
              background: hasDraft ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)",
              color: hasDraft ? "#fbbf24" : "#6b7280",
              border: hasDraft ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {publishing ? "Publishing…" : "Publish design"}
          </button>
        </div>
      </div>

      {/* ── Split layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Controls */}
        <div
          className="w-96 shrink-0 overflow-y-auto border-r border-white/10 p-4 space-y-3"
          style={{ maxHeight: "calc(100vh - 130px)" }}
        >

          {/* ── Templates ──────────────────────────────────────── */}
          <Section title="Design Templates" defaultOpen={false}>
            <p className="text-xs text-neutral-500">
              Apply a template to pre-fill all controls with a curated starting palette.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DESIGN_TEMPLATES) as [DesignTemplateKey, typeof DESIGN_TEMPLATES[DesignTemplateKey]][]).map(([key, tpl]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyTemplate(key)}
                  className="text-left rounded-lg border border-white/10 px-3 py-2 hover:border-amber-400/30 hover:bg-white/[0.03] transition"
                >
                  <p className="text-xs font-semibold text-neutral-200">{tpl.label}</p>
                  <p className="text-xs text-neutral-600 mt-0.5 leading-snug">{tpl.description}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* ── Colour System ──────────────────────────────────── */}
          <Section title="Colour System" defaultOpen={true} badge="Primary">
            <p className="text-xs text-neutral-500 mb-3">
              Full HSL colour pickers with harmony suggestions. The primary colour drives the accent and glow automatically.
            </p>

            <ColourWheelPicker
              label="Primary colour (accent)"
              value={theme.accent}
              onChange={(v) => update("accent", v)}
              outputFormat="hex"
            />

            <ColourWheelPicker
              label="Background primary"
              value={theme.bg}
              onChange={(v) => update("bg", v)}
              outputFormat="hex"
            />

            <ColourWheelPicker
              label="Background secondary"
              value={theme.bg2}
              onChange={(v) => update("bg2", v)}
              outputFormat="hex"
            />

            <ColourWheelPicker
              label="Card / surface"
              value={theme.card}
              onChange={(v) => update("card", v)}
              outputFormat="hex"
            />

            <ColourWheelPicker
              label="Panel / sidebar"
              value={theme.panel}
              onChange={(v) => update("panel", v)}
              outputFormat="hex"
            />

            <ColourWheelPicker
              label="Heading colour"
              value={theme.heading}
              onChange={(v) => update("heading", v)}
              outputFormat="hex"
            />

            <div className="pt-2 border-t border-white/8 space-y-3">
              <p className="text-xs text-neutral-400 font-medium">Derived rgba values</p>
              <p className="text-xs text-neutral-600">
                These are used for glows, borders and subtle tints. Paste rgba values directly.
              </p>
              <InlineColour
                label="Accent glow (rgba)"
                value={theme.accentGlow}
                onChange={(v) => update("accentGlow", v)}
              />
              <InlineColour
                label="Accent border (rgba)"
                value={theme.accentBorder}
                onChange={(v) => update("accentBorder", v)}
              />
            </div>
          </Section>

          {/* ── Colour Adjustments ─────────────────────────────── */}
          <Section title="Colour Adjustments" defaultOpen={false}>
            <p className="text-xs text-neutral-500 mb-2">
              Global palette modifiers applied on top of your colour choices.
            </p>
            <Slider
              label="Contrast"
              value={theme.contrast ?? 100}
              min={50}
              max={200}
              unit=""
              onChange={(v) => update("contrast", v)}
              gradient="linear-gradient(to right, #555, #fff)"
            />
            <Slider
              label="Luminosity"
              value={theme.luminosity ?? 100}
              min={50}
              max={200}
              unit=""
              onChange={(v) => update("luminosity", v)}
              gradient="linear-gradient(to right, #111, #fff)"
            />
            <Slider
              label="Brilliance (saturation)"
              value={theme.brilliance ?? 100}
              min={0}
              max={200}
              unit=""
              onChange={(v) => update("brilliance", v)}
              gradient="linear-gradient(to right, #888, #f44)"
            />
            <Slider
              label="Warmth"
              value={theme.warmth ?? 0}
              min={-100}
              max={100}
              unit=""
              onChange={(v) => update("warmth", v)}
              gradient="linear-gradient(to right, #4af, #fa4)"
            />
            <Slider
              label="Presence (theme dominance)"
              value={theme.presence ?? 50}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => update("presence", v)}
            />
          </Section>

          {/* ── Atmospheric Glow ───────────────────────────────── */}
          <Section title="Atmospheric Glow" defaultOpen={false}>
            <Toggle
              label="Enable glow"
              checked={theme.glowEnabled !== false}
              onChange={(v) => update("glowEnabled", v)}
            />
            {theme.glowEnabled !== false && (
              <>
                <InlineColour
                  label="Glow colour (rgba)"
                  value={theme.glowColor}
                  onChange={(v) => update("glowColor", v)}
                />
                <Slider
                  label="Intensity"
                  value={theme.glowIntensity ?? 40}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => update("glowIntensity", v)}
                />
                <Slider
                  label="Spread / radius"
                  value={theme.glowSpread ?? 60}
                  min={10}
                  max={100}
                  unit="%"
                  onChange={(v) => update("glowSpread", v)}
                />
                <SelectField
                  label="Position"
                  value={theme.glowPosition ?? "center"}
                  options={GLOW_POSITIONS}
                  onChange={(v) => update("glowPosition", v)}
                />
              </>
            )}
          </Section>

          {/* ── Marble Effect ──────────────────────────────────── */}
          <Section title="Marble Effect" defaultOpen={false}>
            <Toggle
              label="Enable marble"
              checked={theme.marbleEnabled !== false}
              onChange={(v) => update("marbleEnabled", v)}
            />
            {theme.marbleEnabled !== false && (
              <>
                <InlineColour
                  label="Marble base colour 1"
                  value={theme.marbleC1}
                  onChange={(v) => update("marbleC1", v)}
                />
                <InlineColour
                  label="Marble base colour 2"
                  value={theme.marbleC2}
                  onChange={(v) => update("marbleC2", v)}
                />
                <InlineColour
                  label="Vein colour (rgba)"
                  value={theme.marbleVein}
                  onChange={(v) => update("marbleVein", v)}
                />
                <Slider
                  label="Vein thickness"
                  value={theme.marbleVeinThickness ?? 3}
                  min={1}
                  max={10}
                  onChange={(v) => update("marbleVeinThickness", v)}
                />
                <Slider
                  label="Complexity"
                  value={theme.marbleComplexity ?? 3}
                  min={1}
                  max={5}
                  onChange={(v) => update("marbleComplexity", v)}
                />
                <SelectField
                  label="Direction"
                  value={theme.marbleDirection ?? "diagonal"}
                  options={MARBLE_DIRECTIONS}
                  onChange={(v) => update("marbleDirection", v)}
                />
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-400">Animation speed</label>
                  <input
                    type="text"
                    value={theme.marbleSpeed}
                    onChange={(e) => update("marbleSpeed", e.target.value)}
                    placeholder="e.g. 14s"
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-white/30"
                  />
                  <p className="text-xs text-neutral-600">
                    Faster = more dramatic. Try: 6s (fast) · 14s (normal) · 25s (glacial).
                    Use &quot;0s&quot; or &quot;static&quot; for no animation.
                  </p>
                </div>
              </>
            )}
          </Section>

          {/* ── Particle Effects ───────────────────────────────── */}
          <Section title="Particle Effects" defaultOpen={false}>
            <SelectField
              label="Particle type"
              value={theme.particleEffect}
              options={PARTICLE_OPTIONS}
              onChange={(v) => update("particleEffect", v as ParticleEffectType)}
            />
            {theme.particleEffect !== "none" && (
              <>
                <Slider
                  label="Density"
                  value={theme.particleDensity ?? 20}
                  min={1}
                  max={100}
                  unit=""
                  onChange={(v) => update("particleDensity", v)}
                />
                <Slider
                  label="Size"
                  value={theme.particleSize ?? 50}
                  min={1}
                  max={100}
                  unit=""
                  onChange={(v) => update("particleSize", v)}
                />
                <Slider
                  label="Speed"
                  value={theme.particleSpeed ?? 50}
                  min={1}
                  max={100}
                  unit=""
                  onChange={(v) => update("particleSpeed", v)}
                />
                <InlineColour
                  label="Particle colour"
                  value={theme.particleColor ?? theme.accent}
                  onChange={(v) => update("particleColor", v)}
                />
                <SelectField
                  label="Direction"
                  value={theme.particleDirection ?? "up"}
                  options={[
                    { value: "up",     label: "Up"     },
                    { value: "down",   label: "Down"   },
                    { value: "left",   label: "Left"   },
                    { value: "right",  label: "Right"  },
                    { value: "radial", label: "Radial" },
                    { value: "random", label: "Random" },
                  ]}
                  onChange={(v) => update("particleDirection", v as "up")}
                />
              </>
            )}
          </Section>

          {/* ── Knotwork Border ────────────────────────────────── */}
          <Section title="Knotwork Border" defaultOpen={false}>
            <Toggle
              label="Enable knotwork border"
              checked={theme.knotworkEnabled ?? false}
              onChange={(v) => update("knotworkEnabled", v)}
            />
            {theme.knotworkEnabled && (
              <>
                <InlineColour
                  label="Border colour"
                  value={theme.knotworkColor ?? theme.accent}
                  onChange={(v) => update("knotworkColor", v)}
                />
                <Slider
                  label="Border thickness"
                  value={theme.knotworkThickness ?? 2}
                  min={1}
                  max={10}
                  onChange={(v) => update("knotworkThickness", v)}
                />
                <SelectField
                  label="Knotwork style"
                  value={theme.knotworkStyle ?? "simple_corners"}
                  options={KNOTWORK_STYLES}
                  onChange={(v) => update("knotworkStyle", v)}
                />
                <Toggle
                  label="Border glow"
                  checked={theme.knotworkGlow ?? false}
                  onChange={(v) => update("knotworkGlow", v)}
                />
                {theme.knotworkGlow && (
                  <Slider
                    label="Glow intensity"
                    value={theme.knotworkGlowIntensity ?? 50}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => update("knotworkGlowIntensity", v)}
                  />
                )}
                <Toggle
                  label="Animated trace effect"
                  hint="Traces a glowing light around the border"
                  checked={theme.knotworkAnimated ?? false}
                  onChange={(v) => update("knotworkAnimated", v)}
                />
              </>
            )}
          </Section>

          {/* ── Card Styling ───────────────────────────────────── */}
          <Section title="Card Styling" defaultOpen={false}>
            <p className="text-xs text-neutral-500">
              Controls how the product card looks in the shop, homepage and related products.
              Cards automatically use a reduced-intensity version of the full theme.
            </p>
            <Slider
              label="Background tint opacity"
              value={theme.cardBgTintOpacity ?? 8}
              min={0}
              max={20}
              unit="%"
              onChange={(v) => update("cardBgTintOpacity", v)}
            />
            <InlineColour
              label="Card border colour"
              value={theme.cardBorderColor ?? theme.accentBorder}
              onChange={(v) => update("cardBorderColor", v)}
            />
            <Slider
              label="Border width"
              value={theme.cardBorderWidth ?? 1}
              min={0}
              max={4}
              unit="px"
              onChange={(v) => update("cardBorderWidth", v)}
            />
            <InlineColour
              label="Hover glow colour"
              value={theme.cardHoverGlowColor ?? theme.accentGlow}
              onChange={(v) => update("cardHoverGlowColor", v)}
            />
            <Slider
              label="Hover glow intensity"
              value={theme.cardHoverGlowIntensity ?? 40}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => update("cardHoverGlowIntensity", v)}
            />
            <InlineColour
              label="Shadow colour"
              value={theme.cardShadowColor ?? "rgba(0,0,0,0.4)"}
              onChange={(v) => update("cardShadowColor", v)}
            />
            <Slider
              label="Shadow intensity"
              value={theme.cardShadowIntensity ?? 40}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => update("cardShadowIntensity", v)}
            />
          </Section>

          {/* ── Typography ─────────────────────────────────────── */}
          <Section title="Typography" defaultOpen={false}>
            <InlineColour
              label="Heading colour"
              value={theme.heading}
              onChange={(v) => update("heading", v)}
            />
            <InlineColour
              label="Body text colour"
              value={theme.bodyColor ?? "rgba(240,236,228,0.6)"}
              onChange={(v) => update("bodyColor", v)}
            />
            <InlineColour
              label="Price display colour"
              value={theme.priceColor ?? theme.accent}
              onChange={(v) => update("priceColor", v)}
            />
            <SelectField
              label="Heading font weight"
              value={theme.headingWeight ?? "700"}
              options={HEADING_WEIGHTS}
              onChange={(v) => update("headingWeight", v as HeadingWeightType)}
            />
          </Section>

          {/* ── Button Styling ─────────────────────────────────── */}
          <Section title="Button Styling" defaultOpen={false}>
            <InlineColour
              label="Primary button background"
              value={theme.btnBg ?? theme.accent}
              onChange={(v) => update("btnBg", v)}
            />
            <InlineColour
              label="Primary button text"
              value={theme.btnText ?? "#000000"}
              onChange={(v) => update("btnText", v)}
            />
            <InlineColour
              label="Hover background"
              value={theme.btnHoverBg ?? theme.accent}
              onChange={(v) => update("btnHoverBg", v)}
            />
            <InlineColour
              label="Hover text"
              value={theme.btnHoverText ?? "#000000"}
              onChange={(v) => update("btnHoverText", v)}
            />
            <Slider
              label="Border radius"
              value={theme.btnBorderRadius ?? 8}
              min={0}
              max={24}
              unit="px"
              onChange={(v) => update("btnBorderRadius", v)}
            />
            <Toggle
              label="Button glow effect"
              checked={theme.btnGlow ?? false}
              onChange={(v) => update("btnGlow", v)}
            />
            {theme.btnGlow && (
              <InlineColour
                label="Glow colour"
                value={theme.btnGlowColor ?? theme.accentGlow}
                onChange={(v) => update("btnGlowColor", v)}
              />
            )}
          </Section>

          {/* ── Background ─────────────────────────────────────── */}
          <Section title="Background" defaultOpen={false}>
            <SelectField
              label="Gradient direction"
              value={theme.bgGradientDirection ?? "to bottom"}
              options={GRADIENT_DIRECTIONS}
              onChange={(v) => update("bgGradientDirection", v as GradientDirectionType)}
            />
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-400">Custom background image URL</label>
              <input
                type="text"
                value={theme.bgImageUrl ?? ""}
                onChange={(e) => update("bgImageUrl", e.target.value || undefined)}
                placeholder="https://… or /path/to/image.jpg"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-white/30"
              />
              <p className="text-xs text-neutral-600">
                Upload to Supabase Storage and paste the public URL here.
              </p>
            </div>
            {theme.bgImageUrl && (
              <>
                <Slider
                  label="Image opacity"
                  value={theme.bgImageOpacity ?? 30}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => update("bgImageOpacity", v)}
                />
                <SelectField
                  label="Blend mode"
                  value={theme.bgImageBlendMode ?? "normal"}
                  options={BG_BLEND_MODES}
                  onChange={(v) => update("bgImageBlendMode", v as BgBlendModeType)}
                />
              </>
            )}
          </Section>

          {/* ── Future-Proofing ────────────────────────────────── */}
          <Section title="Future-Proofing Controls" defaultOpen={false} badge="Advanced">
            <p className="text-xs text-neutral-500 mb-2">
              Controls reserved for future UI elements. Set them now so new features automatically inherit the right colours.
            </p>
            <InlineColour
              label="Badge / tag colour (In Stock, Featured)"
              value={theme.badgeColor ?? theme.accent}
              onChange={(v) => update("badgeColor", v)}
            />
            <InlineColour
              label="Divider line colour"
              value={theme.dividerColor ?? theme.accentBorder}
              onChange={(v) => update("dividerColor", v)}
            />
            <InlineColour
              label="Icon tint"
              value={theme.iconTint ?? theme.accent}
              onChange={(v) => update("iconTint", v)}
            />
            <InlineColour
              label="Scrollbar colour"
              value={theme.scrollbarColor ?? theme.accent}
              onChange={(v) => update("scrollbarColor", v)}
            />
            <InlineColour
              label="Text selection highlight"
              value={theme.selectionColor ?? "rgba(201,168,76,0.35)"}
              onChange={(v) => update("selectionColor", v)}
            />
            <InlineColour
              label="Focus ring colour"
              value={theme.focusRingColor ?? theme.accent}
              onChange={(v) => update("focusRingColor", v)}
            />
            <InlineColour
              label="Tooltip background"
              value={theme.tooltipBg ?? theme.panel}
              onChange={(v) => update("tooltipBg", v)}
            />
            <InlineColour
              label="Tooltip text"
              value={theme.tooltipText ?? theme.heading}
              onChange={(v) => update("tooltipText", v)}
            />
          </Section>

          {/* ── Design Presets ─────────────────────────────────── */}
          <Section title="Design Presets" defaultOpen={false}>
            <p className="text-xs text-neutral-500">
              Save the current design as a named preset. Load presets to instantly apply a full design configuration.
            </p>

            {/* Save current as preset */}
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name…"
                className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-white/30"
                onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); }}
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={savingPreset || !presetName.trim()}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition disabled:opacity-40"
              >
                {savingPreset ? "Saving…" : "Save preset"}
              </button>
            </div>

            {/* Preset list */}
            {presets.length === 0 && (
              <p className="text-xs text-neutral-600 py-2">No saved presets yet.</p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-200 truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-neutral-600 truncate">{p.description}</p>
                    )}
                    {p.is_default && (
                      <span className="text-xs text-amber-400/70">Default preset</span>
                    )}
                  </div>
                  {/* Preview swatch */}
                  <div className="flex gap-0.5 shrink-0">
                    {[p.theme_data.bg, p.theme_data.accent, p.theme_data.heading].map((c, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-sm border border-white/10"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-white/10 text-neutral-400 hover:text-white transition"
                  >
                    Apply
                  </button>
                  {!p.is_default && (
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(p.id)}
                      className="shrink-0 text-xs text-red-400/50 hover:text-red-400 transition"
                      title="Delete preset"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* ── Version History ────────────────────────────────── */}
          <Section title="Design Version History" defaultOpen={false}>
            <p className="text-xs text-neutral-500 mb-2">
              Last 10 published design versions. Click Revert to apply any previous version as a new draft.
            </p>
            {history.length === 0 && (
              <p className="text-xs text-neutral-600">No published versions yet.</p>
            )}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {history.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
                >
                  <div className="flex gap-0.5 shrink-0">
                    {[entry.theme_data.bg, entry.theme_data.accent, entry.theme_data.heading].map((c, ci) => (
                      <div key={ci} className="w-3.5 h-3.5 rounded-sm" style={{ background: c, border: "1px solid rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-300">
                      {i === 0 ? "Latest published" : `v${history.length - i}`}
                    </p>
                    <p className="text-xs text-neutral-600 truncate">
                      {new Date(entry.published_at).toLocaleString()}
                      {entry.publisher_name && ` · ${entry.publisher_name}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevert(entry)}
                    disabled={revertingId === entry.id}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-white/10 text-neutral-400 hover:text-white transition disabled:opacity-40"
                  >
                    {revertingId === entry.id ? "…" : "Revert"}
                  </button>
                </div>
              ))}
            </div>
          </Section>

        </div>

        {/* RIGHT: Live Preview */}
        <div className="flex-1 overflow-hidden">
          <DesignPreview
            theme={theme}
            liveTheme={liveTheme}
            productName={productName}
            productSlug={productSlug}
            primaryImageUrl={primaryImageUrl}
            pricePence={pricePence}
          />
        </div>
      </div>

      {/* ── Confirm modals ──────────────────────────────────────── */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/15 bg-neutral-900 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h2 className="text-base font-semibold">Publish design?</h2>
            <p className="text-sm text-neutral-400">
              This will apply your design changes to{" "}
              <strong className="text-neutral-200">{productName}</strong> immediately.
              The previous design will be saved to version history.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPublishConfirm(false)}
                className="text-sm px-4 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="text-sm px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition"
              >
                Publish now
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/15 bg-neutral-900 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h2 className="text-base font-semibold">Discard design draft?</h2>
            <p className="text-sm text-neutral-400">
              This will revert to the last published design. All unsaved changes will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="text-sm px-4 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="text-sm px-4 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition"
              >
                Discard draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border text-sm shadow-2xl"
          style={{
            background: "rgba(24,24,32,0.95)",
            borderColor: toast.type === "err" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)",
            color: toast.type === "err" ? "#f87171" : "#e5e7eb",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
