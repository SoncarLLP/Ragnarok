-- ============================================================
-- SONCAR – Site Management Schema
-- Run in the Supabase SQL editor AFTER all existing migrations
-- (schema.sql, roles-schema.sql, community-schema.sql, etc.)
-- ============================================================
-- Requires: public.is_super_admin() from roles-schema.sql

-- ── Products table ──────────────────────────────────────────────
-- Stores all product data. Live site reads visibility='published' rows.
CREATE TABLE IF NOT EXISTS public.products (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  description_html   TEXT DEFAULT '',
  price_pence        INTEGER NOT NULL DEFAULT 3000,
  stock_status       TEXT NOT NULL DEFAULT 'in_stock'
                     CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'coming_soon')),
  visibility         TEXT NOT NULL DEFAULT 'published'
                     CHECK (visibility IN ('published', 'hidden', 'archived')),
  is_featured        BOOLEAN DEFAULT FALSE,
  primary_image_url  TEXT,
  custom_segments    JSONB DEFAULT '[]'::jsonb,
  meta_title         TEXT,
  meta_description   TEXT,
  related_product_ids UUID[] DEFAULT '{}',
  loyalty_multiplier NUMERIC(4,2) DEFAULT 1.0,
  sort_order         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  created_by         UUID REFERENCES auth.users(id)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public can read published products
CREATE POLICY "published products are publicly readable"
  ON public.products FOR SELECT
  USING (visibility = 'published');

-- Super admins can read ALL products regardless of visibility
CREATE POLICY "super admins can read all products"
  ON public.products FOR SELECT
  USING (public.is_super_admin());

-- Super admins can insert, update, delete
CREATE POLICY "super admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super admins can update products"
  ON public.products FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "super admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_super_admin());


-- ── Product images ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_images (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  url          TEXT NOT NULL,
  alt_text     TEXT DEFAULT '',
  position     INTEGER DEFAULT 0,
  is_primary   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product images publicly readable"
  ON public.product_images FOR SELECT
  USING (TRUE);

CREATE POLICY "super admins can manage product images"
  ON public.product_images FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "super admins can insert product images"
  ON public.product_images FOR INSERT
  WITH CHECK (public.is_super_admin());


-- ── Site content ─────────────────────────────────────────────────
-- Key-value store for content areas: 'homepage', 'global', 'shop', 'faq'
CREATE TABLE IF NOT EXISTS public.site_content (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key          TEXT UNIQUE NOT NULL,
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- All site content is publicly readable (live site uses it)
CREATE POLICY "site content publicly readable"
  ON public.site_content FOR SELECT
  USING (TRUE);

CREATE POLICY "super admins can manage site content"
  ON public.site_content FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "super admins can insert site content"
  ON public.site_content FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super admins can update site content"
  ON public.site_content FOR UPDATE
  USING (public.is_super_admin());


-- ── Content drafts ───────────────────────────────────────────────
-- Stores unsaved draft versions of products and site content.
-- entity_type: 'product' | 'site_content'
-- entity_id: product UUID (as text) or site_content key
CREATE TABLE IF NOT EXISTS public.content_drafts (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type             TEXT NOT NULL CHECK (entity_type IN ('product', 'site_content')),
  entity_id               TEXT NOT NULL,
  draft_data              JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_unpublished_changes BOOLEAN DEFAULT TRUE,
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_by              UUID REFERENCES auth.users(id),
  UNIQUE(entity_type, entity_id)
);

ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

-- Only super admins can access drafts
CREATE POLICY "super admins can manage content drafts"
  ON public.content_drafts FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "super admins can insert content drafts"
  ON public.content_drafts FOR INSERT
  WITH CHECK (public.is_super_admin());


-- ── Publish history ──────────────────────────────────────────────
-- Immutable snapshots of every published version.
CREATE TABLE IF NOT EXISTS public.publish_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  snapshot     JSONB NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID REFERENCES auth.users(id),
  publisher_name TEXT,
  notes        TEXT
);

ALTER TABLE public.publish_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admins can read publish history"
  ON public.publish_history FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super admins can insert publish history"
  ON public.publish_history FOR INSERT
  WITH CHECK (public.is_super_admin());


-- ── Auto-update updated_at triggers ──────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'products_set_updated_at'
  ) THEN
    CREATE TRIGGER products_set_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'site_content_set_updated_at'
  ) THEN
    CREATE TRIGGER site_content_set_updated_at
      BEFORE UPDATE ON public.site_content
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'content_drafts_set_updated_at'
  ) THEN
    CREATE TRIGGER content_drafts_set_updated_at
      BEFORE UPDATE ON public.content_drafts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- ── Seed initial products ────────────────────────────────────────
INSERT INTO public.products (slug, name, description_html, price_pence, stock_status, visibility, is_featured, primary_image_url, sort_order)
VALUES
  ('freyjas-bloom',    'Freyja''s Bloom',    '<p>Radiant blend for recovery &amp; glow.</p>',                    3000, 'in_stock', 'published', FALSE, '/images/products/freyjas-bloom.jpg',    1),
  ('duemmens-nectar',  'Dümmens Nectar',     '<p>Golden hydration with performance minerals.</p>',              3000, 'in_stock', 'published', FALSE, '/images/products/duemmens-nectar.jpg',  2),
  ('loki-hell-fire',   'Loki hell fire',     '<p>Bold energy with a mythic edge.</p>',                          3000, 'in_stock', 'published', FALSE, '/images/products/loki-hell-fire.jpg',   3)
ON CONFLICT (slug) DO NOTHING;


-- ── Seed initial site content ────────────────────────────────────
INSERT INTO public.site_content (key, content)
VALUES
  ('homepage', '{
    "hero": {
      "heading": "RAGNAROK by SONCAR",
      "subtitle": "Functional protein blends with mythic flair—crafted for hydration, recovery, and daily glow.",
      "background_image_url": null,
      "primary_cta_text": "Shop Bestsellers",
      "primary_cta_link": "#shop",
      "secondary_cta_text": "Policies",
      "secondary_cta_link": "/policies"
    },
    "featured_product_slugs": [],
    "announcement_banner": {
      "enabled": false,
      "text": "",
      "background_color": "#f59e0b",
      "link": "",
      "link_text": ""
    },
    "brand_story": {
      "enabled": false,
      "heading": "",
      "body_html": "",
      "image_url": null
    },
    "custom_sections": []
  }'::jsonb),
  ('global', '{
    "announcement_bar": {
      "enabled": false,
      "text": "",
      "link": "",
      "background_color": "#1a1a1a"
    },
    "footer": {
      "company_info": "SONCAR Limited · soncar.co.uk · All rights reserved.",
      "links": [],
      "social_media": {
        "instagram": "",
        "twitter": "",
        "facebook": "",
        "tiktok": "",
        "youtube": ""
      }
    },
    "contact": {
      "email": "",
      "phone": "",
      "address": ""
    }
  }'::jsonb),
  ('shop', '{
    "heading": "Bestsellers",
    "description": "£30 each · Free UK delivery over £60"
  }'::jsonb),
  ('faq', '{
    "items": []
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ── Storage buckets (run separately in Supabase dashboard if needed) ──
-- These INSERT statements create storage buckets.
-- Alternatively, create them in Storage → New bucket in the dashboard.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('products',     'products',     TRUE, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('site-content', 'site-content', TRUE, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "products bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "super admins upload to products bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products' AND public.is_super_admin());

CREATE POLICY "super admins update products bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'products' AND public.is_super_admin());

CREATE POLICY "super admins delete from products bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'products' AND public.is_super_admin());

CREATE POLICY "site-content bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-content');

CREATE POLICY "super admins upload to site-content bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-content' AND public.is_super_admin());

CREATE POLICY "super admins update site-content bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-content' AND public.is_super_admin());

CREATE POLICY "super admins delete from site-content bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-content' AND public.is_super_admin());
