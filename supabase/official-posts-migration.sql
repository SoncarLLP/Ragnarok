-- ============================================================
-- Official SONCAR Team Posts Migration
-- Run once in the Supabase SQL editor
-- ============================================================

-- 1. Add new columns to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_as_role   TEXT    CHECK (post_as_role IN ('admin', 'super_admin')),
  ADD COLUMN IF NOT EXISTS pinned_until   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_indefinite BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT   CHECK (created_by_role IN ('admin', 'super_admin')),
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id);

-- 2. Index to speed up pinned-post queries
CREATE INDEX IF NOT EXISTS idx_posts_pinned
  ON public.posts (pinned_until DESC NULLS LAST)
  WHERE post_as_role IS NOT NULL;

-- 3. ── RLS: delete policies ───────────────────────────────────────
-- Drop existing user-delete policy (replace with stricter version)
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Regular users may only delete their own personal (non-role) posts
CREATE POLICY "Users can delete their own non-role posts"
  ON public.posts FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND post_as_role IS NULL
  );

-- Super admins may delete any post, including SONCAR Team posts
CREATE POLICY "Super admins can delete any post"
  ON public.posts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. ── RLS: restrict created_by_user_id reads ────────────────────
-- Supabase does not support column-level RLS natively.
-- The application layer handles this: created_by_user_id is only
-- selected in server-side admin queries when the caller is a super_admin.
-- We create a helper function super admins can call to look up the real creator.

CREATE OR REPLACE FUNCTION public.get_post_creator(p_post_id UUID)
RETURNS TABLE (creator_user_id UUID, creator_email TEXT, creator_username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admins may call this
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.created_by_user_id,
    u.email::TEXT,
    pr.username
  FROM public.posts p
  LEFT JOIN auth.users u ON u.id = p.created_by_user_id
  LEFT JOIN public.profiles pr ON pr.id = p.created_by_user_id
  WHERE p.id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_creator(UUID) TO authenticated;

-- 5. ── Auto-unpin expired posts ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.unpin_expired_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.posts
  SET pinned_until = NULL
  WHERE pinned_until IS NOT NULL
    AND pin_indefinite = FALSE
    AND pinned_until < NOW();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unpin_expired_posts() TO service_role;
GRANT EXECUTE ON FUNCTION public.unpin_expired_posts() TO authenticated;

-- 6. ── Optional: schedule auto-unpin with pg_cron ────────────────
-- Requires pg_cron extension enabled in Supabase dashboard (Database → Extensions).
-- Run separately if pg_cron is available:
--
--   SELECT cron.schedule(
--     'unpin-expired-posts',
--     '0 * * * *',
--     'SELECT public.unpin_expired_posts()'
--   );
--
-- Alternatively, call public.unpin_expired_posts() from a Supabase Edge Function
-- scheduled via the Supabase dashboard (Functions → Schedule).
