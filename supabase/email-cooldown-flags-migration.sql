-- ============================================================
-- Migration: email cooldown tracking + content flags table
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Add email cooldown columns to profiles
-- ---------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_moderation_email_sent_at TIMESTAMPTZ;

-- 2. Content flags table
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_flags (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid        REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id   uuid        REFERENCES public.comments(id) ON DELETE CASCADE,
  reported_by  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason       text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),

  -- Exactly one of post_id or comment_id must be set
  CONSTRAINT content_flags_target_check CHECK (
    (post_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1
  )
);

-- Prevent a user from flagging the same post twice
CREATE UNIQUE INDEX IF NOT EXISTS content_flags_post_user_uniq
  ON public.content_flags (post_id, reported_by)
  WHERE post_id IS NOT NULL;

-- Prevent a user from flagging the same comment twice
CREATE UNIQUE INDEX IF NOT EXISTS content_flags_comment_user_uniq
  ON public.content_flags (comment_id, reported_by)
  WHERE comment_id IS NOT NULL;

-- Index for burst detection query (created_at range scans)
CREATE INDEX IF NOT EXISTS content_flags_created_at_idx
  ON public.content_flags (created_at);

-- 3. RLS
-- ---------------------------------------------------------------
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own flags
CREATE POLICY "Users can report content"
  ON public.content_flags FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

-- Super admins can read all flags
CREATE POLICY "Super admins can read flags"
  ON public.content_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
