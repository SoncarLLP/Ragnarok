-- ============================================================
-- SONCAR – Roles, Member IDs, and Moderation schema
-- Run in the Supabase SQL editor AFTER schema.sql and community-schema.sql
-- ============================================================

-- ── Sequence for member IDs ──────────────────────────────────
create sequence if not exists public.member_id_seq start 1;

-- ── Profile extensions ───────────────────────────────────────
alter table public.profiles
  add column if not exists member_id bigint,
  add column if not exists role      text not null default 'member'
    check (role in ('member', 'admin', 'super_admin')),
  add column if not exists status    text not null default 'active'
    check (status in ('active', 'banned', 'suspended'));

-- Backfill existing profiles with sequential member IDs (by signup order)
do $$
begin
  update public.profiles p
  set member_id = sub.rn
  from (
    select id, row_number() over (order by created_at asc) as rn
    from public.profiles
    where member_id is null
  ) sub
  where p.id = sub.id;

  -- Advance the sequence past the highest assigned value so new signups continue on
  perform setval('public.member_id_seq',
    coalesce((select max(member_id) from public.profiles), 0) + 1, false);
end $$;

-- Set default for future rows; add uniqueness constraint if not yet present
alter table public.profiles
  alter column member_id set default nextval('public.member_id_seq');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_member_id_key'
  ) then
    alter table public.profiles
      add constraint profiles_member_id_key unique (member_id);
  end if;
end $$;

-- ── Helper role functions (used in RLS policies) ─────────────
create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('admin', 'super_admin') from public.profiles where id = auth.uid()),
    false
  )
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'super_admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- ── Post flags ───────────────────────────────────────────────
create table if not exists public.post_flags (
  id          uuid default gen_random_uuid() primary key,
  post_id     uuid references public.posts(id) on delete cascade not null,
  flagged_by  uuid references public.profiles(id) on delete set null,
  reason      text,
  created_at  timestamptz default now(),
  cleared_at  timestamptz  -- null = flag is still active
);

alter table public.post_flags enable row level security;

create policy "Admins can read flags"
  on public.post_flags for select
  using (public.is_admin());

create policy "Admins can create flags"
  on public.post_flags for insert
  with check (public.is_admin());

create policy "Admins can clear flags"
  on public.post_flags for update
  using (public.is_admin())
  with check (public.is_admin());

-- ── Member warnings ──────────────────────────────────────────
create table if not exists public.member_warnings (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  sent_by    uuid references public.profiles(id) on delete set null,
  message    text not null,
  created_at timestamptz default now(),
  read_at    timestamptz  -- null = unread
);

alter table public.member_warnings enable row level security;

create policy "Users can read own warnings"
  on public.member_warnings for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Admins can send warnings"
  on public.member_warnings for insert
  with check (public.is_admin() and auth.uid() = sent_by);

create policy "Users can mark own warnings read"
  on public.member_warnings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Update posts/comments to block banned/suspended members ──
drop policy if exists "Auth users can create posts" on public.posts;
create policy "Active users can create posts"
  on public.posts for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "Auth users can comment" on public.comments;
create policy "Active users can comment"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );
