-- ============================================================
-- SONCAR – Community RLS fix
-- Run this in the Supabase SQL editor if posts aren't appearing
-- ============================================================

-- 1. Allow any authenticated user to read basic profile info
--    (needed so community posts show author names)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Authenticated users can read profiles" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Authenticated users can read profiles"
  on public.profiles for select
  using (auth.uid() is not null);

-- 2. Simplify the posts INSERT policy — just require auth, no status check
--    (the status check may fail if the column wasn't backfilled properly)
drop policy if exists "Active users can create posts" on public.posts;
drop policy if exists "Auth users can create posts" on public.posts;

create policy "Auth users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

-- 3. Same for comments
drop policy if exists "Active users can comment" on public.comments;
drop policy if exists "Auth users can comment" on public.comments;

create policy "Auth users can comment"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- Verify: check current policies on posts
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'posts';
