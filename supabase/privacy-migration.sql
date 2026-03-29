-- ============================================================
-- Migration: Privacy modes, blocks, follow requests, admin block authorisations
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Extend profiles table
-- ---------------------------------------------------------------
ALTER TABLE public.profiles
  -- Account mode
  ADD COLUMN IF NOT EXISTS account_mode text NOT NULL DEFAULT 'public'
    CHECK (account_mode IN ('public', 'followers_only', 'private')),
  -- Interaction / visibility settings (JSONB with defaults)
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS extended_profile_visibility jsonb NOT NULL DEFAULT '{}',
  -- Extended profile fields
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS pronouns text,
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS website text;

-- Index to quickly exclude private accounts from searches/feeds
CREATE INDEX IF NOT EXISTS profiles_account_mode_idx ON public.profiles (account_mode);

-- 2. Blocks table
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own outgoing blocks (to render their block list)
CREATE POLICY "Users can read own blocks"
  ON public.blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- Users can create blocks (target must not be admin unless authorised — enforced in application layer)
CREATE POLICY "Users can create blocks"
  ON public.blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete own blocks"
  ON public.blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- 3. Follow requests table (for followers_only mode)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follow_requests_no_self CHECK (requester_id <> target_id),
  UNIQUE (requester_id, target_id)
);

CREATE INDEX IF NOT EXISTS follow_requests_target_idx ON public.follow_requests (target_id, status);
CREATE INDEX IF NOT EXISTS follow_requests_requester_idx ON public.follow_requests (requester_id);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their own outgoing requests
CREATE POLICY "Requesters can read own requests"
  ON public.follow_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- Target can see incoming requests to them
CREATE POLICY "Targets can read incoming requests"
  ON public.follow_requests FOR SELECT
  TO authenticated
  USING (target_id = auth.uid());

-- Authenticated users can create requests
CREATE POLICY "Users can create follow requests"
  ON public.follow_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Target can update (approve/decline) their incoming requests
CREATE POLICY "Targets can update incoming requests"
  ON public.follow_requests FOR UPDATE
  TO authenticated
  USING (target_id = auth.uid())
  WITH CHECK (target_id = auth.uid());

-- Requester can delete their own request (cancel)
CREATE POLICY "Requesters can delete own requests"
  ON public.follow_requests FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid());

-- 4. Admin block authorisations table
-- ---------------------------------------------------------------
-- Super admins can grant specific members permission to block a specific admin.
CREATE TABLE IF NOT EXISTS public.admin_block_authorisations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id   uuid        NOT NULL REFERENCES public.profiles(id),
  member_id        uuid        NOT NULL REFERENCES public.profiles(id),
  blocked_admin_id uuid        NOT NULL REFERENCES public.profiles(id),
  reason           text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  revoked_at       timestamptz,
  UNIQUE (member_id, blocked_admin_id)  -- one authorisation per member/admin pair
);

ALTER TABLE public.admin_block_authorisations ENABLE ROW LEVEL SECURITY;

-- Super admins can read and manage all authorisations
CREATE POLICY "Super admins can manage block authorisations"
  ON public.admin_block_authorisations FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
