-- ============================================================
-- Light Mode Preference Migration
-- Run this in the Supabase SQL editor after deployment.
-- ============================================================

-- Add light_mode_preference column to profiles table
-- null  = follow system preference (default)
-- true  = always use light mode
-- false = always use dark mode

alter table public.profiles
  add column if not exists light_mode_preference boolean default null;

-- No new RLS policy needed — the existing "users can update own profile"
-- policy already allows members to update any column on their own row.
-- The /api/account/theme/mode route handles auth before updating.
