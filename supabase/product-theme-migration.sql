-- ============================================================
-- Product Theme Migration
-- Adds a JSONB theme column to the products table and populates
-- initial themes for Freyja's Bloom, Dümmens Nectar and Loki Hell Fire.
-- Run in the Supabase SQL editor after site-management-schema.sql
-- ============================================================

-- Add theme column (no-op if it already exists)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT NULL;

-- ── Freyja's Bloom — soft, feminine, ethereal rose-gold ───────────────────
UPDATE public.products
SET theme = '{
  "bg":           "#160814",
  "bg2":          "#1e0e1e",
  "card":         "#1a0c1a",
  "panel":        "#261420",
  "accent":       "#c9849c",
  "accentGlow":   "rgba(201,132,156,0.45)",
  "accentBorder": "rgba(201,132,156,0.32)",
  "heading":      "#e8b4c8",
  "marbleC1":     "#3d0828",
  "marbleC2":     "#5c2040",
  "marbleVein":   "rgba(212,168,180,0.32)",
  "marbleSpeed":  "18s",
  "particleEffect": "petals",
  "glowColor":    "rgba(180,80,120,0.4)"
}'::jsonb
WHERE slug = 'freyjas-bloom';

-- ── Dümmens Nectar — rich, golden, warm amber ─────────────────────────────
UPDATE public.products
SET theme = '{
  "bg":           "#0f0800",
  "bg2":          "#180d00",
  "card":         "#140a00",
  "panel":        "#201200",
  "accent":       "#d4980a",
  "accentGlow":   "rgba(212,152,10,0.45)",
  "accentBorder": "rgba(212,152,10,0.35)",
  "heading":      "#f0b830",
  "marbleC1":     "#1e0c00",
  "marbleC2":     "#3d1e00",
  "marbleVein":   "rgba(212,152,10,0.42)",
  "marbleSpeed":  "16s",
  "particleEffect": "droplets",
  "glowColor":    "rgba(210,130,20,0.45)"
}'::jsonb
WHERE slug = 'duemmens-nectar';

-- ── Loki Hell Fire — fierce, dangerous, hellfire orange-crimson ───────────
UPDATE public.products
SET theme = '{
  "bg":           "#080400",
  "bg2":          "#110500",
  "card":         "#0e0400",
  "panel":        "#180800",
  "accent":       "#e85010",
  "accentGlow":   "rgba(232,80,16,0.55)",
  "accentBorder": "rgba(232,80,16,0.45)",
  "heading":      "#ff7030",
  "marbleC1":     "#180400",
  "marbleC2":     "#3d0a00",
  "marbleVein":   "rgba(232,80,16,0.5)",
  "marbleSpeed":  "10s",
  "particleEffect": "embers",
  "glowColor":    "rgba(220,50,10,0.6)"
}'::jsonb
WHERE slug = 'loki-hell-fire';
