-- ─────────────────────────────────────────────────────────────────
-- Tier Promotion Migration
-- Run AFTER all existing migrations
-- ─────────────────────────────────────────────────────────────────

-- 1. Add moderation_strikes to profiles (for three-strike system)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS moderation_strikes integer NOT NULL DEFAULT 0;

-- 2. Tier promotion history log
CREATE TABLE IF NOT EXISTS tier_promotion_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  previous_tier  text NOT NULL,
  new_tier       text NOT NULL,
  promoted_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tier_promotion_log_member_idx  ON tier_promotion_log(member_id);
CREATE INDEX IF NOT EXISTS tier_promotion_log_created_idx ON tier_promotion_log(created_at DESC);

-- 3. RLS: super_admins can read/insert; members cannot access directly
ALTER TABLE tier_promotion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read promotion log" ON tier_promotion_log;
CREATE POLICY "Super admins can read promotion log"
  ON tier_promotion_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can insert promotion log" ON tier_promotion_log;
CREATE POLICY "Super admins can insert promotion log"
  ON tier_promotion_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
