-- ============================================================
-- PWA: Push Notifications & Offline Sync Tables
-- Run this in the Supabase SQL editor
-- ============================================================

-- -------------------------------------------------------
-- 1. push_subscriptions
--    Stores Web Push API subscriptions per device/user.
-- -------------------------------------------------------
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

-- Index: look up subscriptions by user quickly
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

-- RLS
alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can read all push subscriptions"
  on public.push_subscriptions
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

-- -------------------------------------------------------
-- 2. push_notification_preferences
--    Per-user toggles for each notification type.
-- -------------------------------------------------------
create table if not exists public.push_notification_preferences (
  user_id                    uuid primary key references auth.users(id) on delete cascade,
  reaction_enabled           boolean not null default true,
  mention_enabled            boolean not null default true,
  message_enabled            boolean not null default true,
  workout_reminder_enabled   boolean not null default true,
  nutrition_reminder_enabled boolean not null default true,
  level_up_enabled           boolean not null default true,
  challenge_enabled          boolean not null default true,
  warning_enabled            boolean not null default true,
  updated_at                 timestamptz not null default now()
);

alter table public.push_notification_preferences enable row level security;

create policy "Users can manage their own push preferences"
  on public.push_notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- 3. offline_sync_log
--    Audit trail of offline→online data syncs.
-- -------------------------------------------------------
create table if not exists public.offline_sync_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  sync_type     text not null,  -- 'workout' | 'nutrition' | 'water'
  items_synced  int  not null default 0,
  synced_at     timestamptz not null default now()
);

create index if not exists offline_sync_log_user_id_idx
  on public.offline_sync_log(user_id);

alter table public.offline_sync_log enable row level security;

create policy "Users can read their own sync log"
  on public.offline_sync_log
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sync log entries"
  on public.offline_sync_log
  for insert
  with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- 4. Grant service role bypass for push sending
--    (allows server-side push sending without RLS)
-- -------------------------------------------------------
grant select on public.push_subscriptions
  to service_role;

grant select on public.push_notification_preferences
  to service_role;

grant insert on public.offline_sync_log
  to service_role;
