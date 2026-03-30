-- ═══════════════════════════════════════════════════════════════════════════
-- RAGNARÖK NORSE THEME SYSTEM — DATABASE MIGRATION
-- Run this in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add theme preference columns to profiles ───────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_theme        TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tier_reveals_seen   JSONB   DEFAULT NULL;

COMMENT ON COLUMN profiles.active_theme IS
  'User-selected theme override. NULL = automatic (derived from their current tier). '
  'Valid values: bronze | silver | gold | platinum | fire | diamond';

COMMENT ON COLUMN profiles.tier_reveals_seen IS
  'JSONB map of tier keys that have already shown their unlock reveal animation. '
  'Example: {"silver_1": true, "gold_1": true}. NULL = none seen yet.';

-- ── 2. RLS policies ───────────────────────────────────────────────────────
-- Members need to be able to UPDATE their own active_theme and tier_reveals_seen.
-- If you already have a permissive UPDATE policy on profiles for authenticated
-- users (e.g. "Users can update own profile"), these columns are automatically
-- included and no extra policy is needed.
--
-- If you have column-level restrictions, run the following to add a dedicated
-- policy (adjust the policy name to avoid conflicts):

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_update_theme_self'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "profiles_update_theme_self"
        ON profiles
        FOR UPDATE
        TO authenticated
        USING     (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    $policy$;
  END IF;
END $$;

-- ── 3. Verify ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'profiles'
  AND  column_name  IN ('active_theme', 'tier_reveals_seen')
ORDER BY column_name;
