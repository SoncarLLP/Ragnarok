-- ─────────────────────────────────────────────────────────────────
-- Content Moderation System Migration
-- Run AFTER tier-promotion-migration.sql
-- ─────────────────────────────────────────────────────────────────

-- 1. Moderation settings table — stores blocked words, whitelist, and settings
CREATE TABLE IF NOT EXISTS moderation_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Seed initial empty lists (if not already present)
INSERT INTO moderation_settings (key, value) VALUES
  ('blocked_words',   '[]'::jsonb),
  ('whitelist_words', '[]'::jsonb),
  ('settings',        '{"enabled": true, "image_moderation_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Moderation log — records every blocked content attempt
CREATE TABLE IF NOT EXISTS moderation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content_type  text NOT NULL,  -- 'post', 'comment', 'bio', 'username', 'dm', 'image'
  excerpt       text,           -- first 200 chars of blocked content
  reason        text NOT NULL,  -- 'word_filter', 'image_safety'
  blocked_words text[],         -- which words triggered the block
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_log_user_idx    ON moderation_log(user_id);
CREATE INDEX IF NOT EXISTS moderation_log_created_idx ON moderation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_log_type_idx    ON moderation_log(content_type);

-- 3. moderation_strikes is already on profiles from tier-promotion-migration.sql
--    but add it here as fallback in case migrations are run independently
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS moderation_strikes integer NOT NULL DEFAULT 0;

-- 4. RLS for moderation tables
ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log      ENABLE ROW LEVEL SECURITY;

-- moderation_settings: super_admin read/write; admins read-only
DROP POLICY IF EXISTS "Super admins manage moderation settings" ON moderation_settings;
CREATE POLICY "Super admins manage moderation settings"
  ON moderation_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can read moderation settings" ON moderation_settings;
CREATE POLICY "Admins can read moderation settings"
  ON moderation_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- moderation_log: super_admin read all
DROP POLICY IF EXISTS "Super admins read moderation log" ON moderation_log;
CREATE POLICY "Super admins read moderation log"
  ON moderation_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Service role (used in API routes) can insert log entries
DROP POLICY IF EXISTS "Service role insert moderation log" ON moderation_log;
CREATE POLICY "Service role insert moderation log"
  ON moderation_log FOR INSERT
  WITH CHECK (true);

-- 5. Full-text search indexes for Feature 4 — add here to keep schema clean
-- Products
CREATE INDEX IF NOT EXISTS products_fts_idx
  ON products USING gin(
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(description_html, '')
    )
  );

-- Community posts
CREATE INDEX IF NOT EXISTS posts_fts_idx
  ON posts USING gin(
    to_tsvector('english',
      coalesce(content, '')
    )
  );

-- Profiles (for member search)
CREATE INDEX IF NOT EXISTS profiles_fts_idx
  ON profiles USING gin(
    to_tsvector('english',
      coalesce(full_name, '') || ' ' ||
      coalesce(username, '')
    )
  );
