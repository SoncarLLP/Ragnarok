-- ================================================================
-- SONCAR – Mentions & Notifications migration
-- Adds member @mention support and in-app notification storage.
-- Also adds email notification capability (handled by API route).
--
-- Run in the Supabase SQL editor AFTER reactions-migration.sql
-- ================================================================


-- ── 1. mentions table ──────────────────────────────────────────
create table if not exists public.mentions (
  id                   uuid default gen_random_uuid() primary key,
  post_id              uuid references public.posts(id) on delete cascade,
  comment_id           uuid references public.comments(id) on delete cascade,
  mentioned_user_id    uuid references public.profiles(id) on delete cascade not null,
  mentioned_by_user_id uuid references public.profiles(id) on delete cascade not null,
  created_at           timestamptz default now(),
  -- Exactly one of post_id or comment_id must be set
  constraint mentions_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null     and comment_id is not null)
  )
);

-- One mention per user per post
create unique index if not exists mentions_post_user_idx
  on public.mentions (post_id, mentioned_user_id)
  where post_id is not null;

-- One mention per user per comment
create unique index if not exists mentions_comment_user_idx
  on public.mentions (comment_id, mentioned_user_id)
  where comment_id is not null;

alter table public.mentions enable row level security;

create policy "Anyone can read mentions"
  on public.mentions for select using (true);

-- Only authenticated users can insert, and only as themselves
create policy "Auth users can insert mentions"
  on public.mentions for insert
  with check (auth.uid() = mentioned_by_user_id);


-- ── 2. notifications table ─────────────────────────────────────
-- Stores in-app notifications.  Inserts come exclusively from the
-- security-definer trigger below (bypasses RLS), so no client insert
-- policy is needed.
create table if not exists public.notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  type       text not null,   -- 'mention_post' | 'mention_comment'
  message    text not null,
  link       text,
  read_at    timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);


-- ── 3. Trigger: mention inserted → create notification ─────────
create or replace function public.create_mention_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_link text;
  v_type text;
begin
  -- Skip self-mentions
  if NEW.mentioned_user_id = NEW.mentioned_by_user_id then
    return NEW;
  end if;

  select coalesce(full_name, username, 'Someone') into v_name
  from public.profiles where id = NEW.mentioned_by_user_id;

  if NEW.post_id is not null then
    v_link := '/community/' || NEW.post_id;
    v_type := 'mention_post';
  else
    v_link := '/community/' || (
      select post_id from public.comments where id = NEW.comment_id
    );
    v_type := 'mention_comment';
  end if;

  insert into public.notifications (user_id, type, message, link)
  values (
    NEW.mentioned_user_id,
    v_type,
    v_name || ' mentioned you in a ' ||
      case when NEW.post_id is not null then 'post' else 'comment' end,
    v_link
  );

  return NEW;
end;
$$;

drop trigger if exists on_mention_created on public.mentions;
create trigger on_mention_created
  after insert on public.mentions
  for each row execute function public.create_mention_notification();
