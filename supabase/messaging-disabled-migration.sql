-- ================================================================
-- SONCAR – Messaging Disabled Feature Migration
-- Adds messaging_disabled column to profiles.
--
-- Run this in the Supabase SQL editor.
-- ================================================================

-- Add messaging_disabled flag to profiles (defaults to false = messaging enabled)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS messaging_disabled boolean NOT NULL DEFAULT false;
