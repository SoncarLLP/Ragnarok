-- ============================================================
-- SONCAR – Display name preference & case-insensitive username uniqueness
-- Run this in the Supabase SQL editor
-- ============================================================

-- ── 1. Drop the old plain unique constraint on username (if it exists as a constraint) ──
-- The community-schema.sql added `username text unique` which creates an index named
-- profiles_username_key. We replace it with a case-insensitive unique index.
alter table public.profiles
  drop constraint if exists profiles_username_key;

-- ── 2. Case-insensitive unique index on username ─────────────
-- Treats 'RickArtyFit' and 'rickartyfit' as the same username.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- ── 3. Add display_name_preference column ────────────────────
-- 'username' = show @username to others (default)
-- 'real_name' = show full_name to others
alter table public.profiles
  add column if not exists display_name_preference text not null default 'username'
  check (display_name_preference in ('username', 'real_name'));

-- ── 4. RLS: members can update their own display_name_preference ──
-- The existing update policy on profiles should already allow this since it covers
-- the whole row. Verify the update policy exists:
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profiles'
      and cmd        = 'UPDATE'
  ) then
    create policy "Users can update own profile"
      on public.profiles for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- ── 5. Update the mention notification trigger to respect display_name_preference ──
-- Re-create the function that builds notification messages so it uses the
-- member's preferred display name.
create or replace function public.notify_mention()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name       text;
  v_target     uuid;
  v_post_id    uuid;
  v_comment_id uuid;
  v_link       text;
  v_context    text;
begin
  -- Resolve the display name of the person who made the mention
  select case
           when display_name_preference = 'real_name' and full_name is not null
             then full_name
           else coalesce(username, full_name, 'Someone')
         end
  into v_name
  from public.profiles
  where id = NEW.mentioned_by_user_id;

  v_target     := NEW.mentioned_user_id;
  v_post_id    := NEW.post_id;
  v_comment_id := NEW.comment_id;

  if v_comment_id is not null then
    v_context := 'comment';
    v_link    := '/community/' || v_post_id::text || '#comments';
  else
    v_context := 'post';
    v_link    := '/community/' || v_post_id::text;
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    v_target,
    'mention',
    v_name || ' mentioned you in a ' || v_context,
    v_link
  );

  return NEW;
end;
$$;

-- Drop and re-create trigger to ensure it uses the updated function
drop trigger if exists on_mention_created on public.mentions;
create trigger on_mention_created
  after insert on public.mentions
  for each row execute procedure public.notify_mention();
