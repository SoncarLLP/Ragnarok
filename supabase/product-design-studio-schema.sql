-- ============================================================
-- Product Design Studio Schema
-- Run this in the Supabase SQL editor AFTER site-management-schema.sql
-- ============================================================

-- ── product_design_presets ─────────────────────────────────
-- Saved named design presets that can be applied to any product

CREATE TABLE IF NOT EXISTS public.product_design_presets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  theme_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_design_presets ENABLE ROW LEVEL SECURITY;

-- Only super_admins can manage presets
CREATE POLICY "super_admin_all_design_presets"
  ON public.product_design_presets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ── product_design_drafts ──────────────────────────────────
-- Per-product design drafts (separate from full product drafts)

CREATE TABLE IF NOT EXISTS public.product_design_drafts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  theme_data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_unpublished_changes BOOLEAN NOT NULL DEFAULT TRUE,
  last_modified_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id)
);

ALTER TABLE public.product_design_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_design_drafts"
  ON public.product_design_drafts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ── product_design_history ─────────────────────────────────
-- Published design snapshots (last 10 kept per product via trigger)

CREATE TABLE IF NOT EXISTS public.product_design_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  theme_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  publisher_name TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_design_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_design_history"
  ON public.product_design_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ── Trigger: keep only the last 10 design history entries per product ──

CREATE OR REPLACE FUNCTION public.trim_design_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.product_design_history
  WHERE product_id = NEW.product_id
    AND id NOT IN (
      SELECT id FROM public.product_design_history
      WHERE product_id = NEW.product_id
      ORDER BY published_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trim_design_history ON public.product_design_history;
CREATE TRIGGER trg_trim_design_history
  AFTER INSERT ON public.product_design_history
  FOR EACH ROW EXECUTE FUNCTION public.trim_design_history();

-- ── auto-update updated_at on presets ──────────────────────

CREATE OR REPLACE FUNCTION public.set_design_preset_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_design_preset_updated_at ON public.product_design_presets;
CREATE TRIGGER trg_design_preset_updated_at
  BEFORE UPDATE ON public.product_design_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_design_preset_updated_at();

-- ── Seed: three default presets from the original product themes ──

INSERT INTO public.product_design_presets (name, description, is_default, theme_data) VALUES
(
  'Freyja Rose Gold',
  'Rose-pink and gold with petal particles. Default theme for Freyja''s Bloom.',
  TRUE,
  '{
    "bg": "#160814", "bg2": "#1e0e1e", "card": "#1a0c1a", "panel": "#261420",
    "accent": "#c9849c", "accentGlow": "rgba(201,132,156,0.45)", "accentBorder": "rgba(201,132,156,0.32)",
    "heading": "#e8b4c8", "marbleC1": "#3d0828", "marbleC2": "#5c2040",
    "marbleVein": "rgba(212,168,180,0.32)", "marbleSpeed": "18s",
    "particleEffect": "petals", "glowColor": "rgba(180,80,120,0.4)",
    "primaryHue": 340, "primarySat": 40, "primaryLit": 55, "primaryAlpha": 100,
    "secondaryHue": 35, "secondarySat": 60, "secondaryLit": 50, "secondaryAlpha": 100,
    "accentHue": 340, "accentSat": 42, "accentLit": 57, "accentAlpha": 100,
    "glowEnabled": true, "glowIntensity": 45, "glowSpread": 60, "glowPosition": "center",
    "marbleEnabled": true, "marbleVeinThickness": 3, "marbleComplexity": 3, "marbleDirection": "diagonal",
    "particleDensity": 20, "particleSize": 50, "particleSpeed": 40, "particleDirection": "up",
    "knotworkEnabled": false, "knotworkStyle": "simple_corners", "knotworkGlow": false, "knotworkAnimated": false,
    "contrast": 100, "luminosity": 100, "brilliance": 100, "warmth": 20, "presence": 65,
    "btnBorderRadius": 8, "btnGlow": true,
    "headingWeight": "700"
  }'::jsonb
),
(
  'Dümmens Amber',
  'Deep amber and honey gold with droplet particles. Default theme for Dümmens Nectar.',
  TRUE,
  '{
    "bg": "#0f0800", "bg2": "#180d00", "card": "#140a00", "panel": "#201200",
    "accent": "#d4980a", "accentGlow": "rgba(212,152,10,0.45)", "accentBorder": "rgba(212,152,10,0.35)",
    "heading": "#f0b830", "marbleC1": "#1e0c00", "marbleC2": "#3d1e00",
    "marbleVein": "rgba(212,152,10,0.42)", "marbleSpeed": "16s",
    "particleEffect": "droplets", "glowColor": "rgba(210,130,20,0.45)",
    "primaryHue": 38, "primarySat": 95, "primaryLit": 44, "primaryAlpha": 100,
    "secondaryHue": 45, "secondarySat": 80, "secondaryLit": 55, "secondaryAlpha": 100,
    "accentHue": 38, "accentSat": 96, "accentLit": 44, "accentAlpha": 100,
    "glowEnabled": true, "glowIntensity": 50, "glowSpread": 55, "glowPosition": "bottom",
    "marbleEnabled": true, "marbleVeinThickness": 4, "marbleComplexity": 3, "marbleDirection": "diagonal",
    "particleDensity": 18, "particleSize": 45, "particleSpeed": 35, "particleDirection": "down",
    "knotworkEnabled": false, "knotworkStyle": "simple_corners", "knotworkGlow": false, "knotworkAnimated": false,
    "contrast": 100, "luminosity": 100, "brilliance": 110, "warmth": 60, "presence": 70,
    "btnBorderRadius": 6, "btnGlow": true,
    "headingWeight": "700"
  }'::jsonb
),
(
  'Loki Hellfire',
  'Deep crimson and orange with ember particles. Default theme for Loki Hell Fire.',
  TRUE,
  '{
    "bg": "#080400", "bg2": "#110500", "card": "#0e0400", "panel": "#180800",
    "accent": "#e85010", "accentGlow": "rgba(232,80,16,0.55)", "accentBorder": "rgba(232,80,16,0.45)",
    "heading": "#ff7030", "marbleC1": "#180400", "marbleC2": "#3d0a00",
    "marbleVein": "rgba(232,80,16,0.5)", "marbleSpeed": "10s",
    "particleEffect": "embers", "glowColor": "rgba(220,50,10,0.6)",
    "primaryHue": 15, "primarySat": 90, "primaryLit": 49, "primaryAlpha": 100,
    "secondaryHue": 30, "secondarySat": 100, "secondaryLit": 40, "secondaryAlpha": 100,
    "accentHue": 15, "accentSat": 90, "accentLit": 49, "accentAlpha": 100,
    "glowEnabled": true, "glowIntensity": 65, "glowSpread": 70, "glowPosition": "bottom",
    "marbleEnabled": true, "marbleVeinThickness": 5, "marbleComplexity": 4, "marbleDirection": "vertical",
    "particleDensity": 28, "particleSize": 40, "particleSpeed": 70, "particleDirection": "up",
    "knotworkEnabled": false, "knotworkStyle": "simple_corners", "knotworkGlow": false, "knotworkAnimated": false,
    "contrast": 105, "luminosity": 95, "brilliance": 120, "warmth": 80, "presence": 80,
    "btnBorderRadius": 4, "btnGlow": true,
    "headingWeight": "800"
  }'::jsonb
)
ON CONFLICT DO NOTHING;
