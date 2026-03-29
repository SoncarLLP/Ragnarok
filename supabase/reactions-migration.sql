-- ============================================================
-- SONCAR – Reactions migration
-- Replaces the simple likes table with a multi-emoji reactions
-- system for both posts and comments.
-- Also removes post/comment creation loyalty triggers and adds
-- milestone-based reaction triggers instead.
--
-- Run in the Supabase SQL editor AFTER community-schema.sql
-- and tier-trigger.sql have already been applied.
-- ============================================================


-- ── 1. Add ref_id to loyalty_events ─────────────────────────
-- Used by milestone triggers to track which post/comment
-- earned each milestone award (prevents double-awarding).
alter table public.loyalty_events
  add column if not exists ref_id uuid;


-- ── 2. Create reactions table ────────────────────────────────
create table if not exists public.reactions (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  emoji      text not null check (emoji in ('👍', '❤️', '💪', '🔥', '😮', '😂', '😢')),
  created_at timestamptz default now(),
  -- Exactly one of post_id or comment_id must be set
  constraint reactions_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null     and comment_id is not null)
  )
);

-- One reaction per user per post
create unique index if not exists reactions_post_user_idx
  on public.reactions (post_id, user_id)
  where post_id is not null;

-- One reaction per user per comment
create unique index if not exists reactions_comment_user_idx
  on public.reactions (comment_id, user_id)
  where comment_id is not null;


-- ── 3. RLS for reactions ─────────────────────────────────────
alter table public.reactions enable row level security;

create policy "Anyone can read reactions"
  on public.reactions for select using (true);

create policy "Auth users can react"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reactions"
  on public.reactions for delete
  using (auth.uid() = user_id);


-- ── 4. Migrate existing likes → reactions (emoji '👍') ───────
insert into public.reactions (post_id, user_id, emoji, created_at)
select post_id, user_id, '👍', created_at
from   public.likes
on conflict do nothing;


-- ── 5. Remove old creation-based loyalty triggers ────────────
drop trigger  if exists on_post_created    on public.posts;
drop function if exists public.award_post_points();
drop trigger  if exists on_comment_created on public.comments;
drop function if exists public.award_comment_points();

-- Remove existing post/comment creation loyalty events so the ledger
-- reflects the new rules going forward.
-- NOTE: cumulative_points is recalculated in step 8 below.
delete from public.loyalty_events where reason = 'post_created';
delete from public.loyalty_events where reason = 'comment_posted';


-- ── 6. Reaction milestone trigger – POSTS ────────────────────
-- Awards 2 loyalty points to the post author for every 250
-- total reactions their post reaches.
-- e.g. 250 reactions = +2 pts, 500 = +4 pts, 750 = +6 pts
create or replace function public.award_post_reaction_milestone()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_post_id   uuid;
  v_author_id uuid;
  v_total     integer;
  v_due       integer;
  v_paid      integer;
  v_to_award  integer;
begin
  -- Works for both INSERT and DELETE
  v_post_id := coalesce(NEW.post_id, OLD.post_id);
  if v_post_id is null then return coalesce(NEW, OLD); end if;

  select user_id into v_author_id from public.posts where id = v_post_id;
  if v_author_id is null then return coalesce(NEW, OLD); end if;

  -- Total reactions on this post after this operation
  select count(*) into v_total from public.reactions where post_id = v_post_id;

  -- Points due: 2 per completed 250-reaction block
  v_due := (v_total / 250) * 2;

  -- Points already awarded for this post's milestones
  select coalesce(sum(delta), 0) into v_paid
  from   public.loyalty_events
  where  user_id = v_author_id
    and  reason  = 'reaction_milestone_post'
    and  ref_id  = v_post_id;

  v_to_award := v_due - v_paid;
  if v_to_award > 0 then
    insert into public.loyalty_events (user_id, delta, reason, ref_id)
    values (v_author_id, v_to_award, 'reaction_milestone_post', v_post_id);
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists on_post_reaction_change on public.reactions;
create trigger on_post_reaction_change
  after insert or delete on public.reactions
  for each row execute function public.award_post_reaction_milestone();


-- ── 7. Reaction milestone trigger – COMMENTS ─────────────────
-- Awards 1 loyalty point to the comment author for every 100
-- total reactions their comment reaches.
-- e.g. 100 reactions = +1 pt, 200 = +2 pts, 300 = +3 pts
create or replace function public.award_comment_reaction_milestone()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_comment_id uuid;
  v_author_id  uuid;
  v_total      integer;
  v_due        integer;
  v_paid       integer;
  v_to_award   integer;
begin
  v_comment_id := coalesce(NEW.comment_id, OLD.comment_id);
  if v_comment_id is null then return coalesce(NEW, OLD); end if;

  select user_id into v_author_id from public.comments where id = v_comment_id;
  if v_author_id is null then return coalesce(NEW, OLD); end if;

  select count(*) into v_total from public.reactions where comment_id = v_comment_id;

  -- 1 pt per completed 100-reaction block
  v_due := (v_total / 100) * 1;

  select coalesce(sum(delta), 0) into v_paid
  from   public.loyalty_events
  where  user_id = v_author_id
    and  reason  = 'reaction_milestone_comment'
    and  ref_id  = v_comment_id;

  v_to_award := v_due - v_paid;
  if v_to_award > 0 then
    insert into public.loyalty_events (user_id, delta, reason, ref_id)
    values (v_author_id, v_to_award, 'reaction_milestone_comment', v_comment_id);
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists on_comment_reaction_change on public.reactions;
create trigger on_comment_reaction_change
  after insert or delete on public.reactions
  for each row execute function public.award_comment_reaction_milestone();


-- ── 8. Recalculate cumulative_points after removing old events ─
-- The sync_cumulative_points trigger (from tier-trigger.sql) only
-- fires on INSERT to loyalty_events, not DELETE. After removing the
-- post_created / comment_posted events above, profiles' stored
-- cumulative_points may be too high. This recalculates them from
-- the ledger. Skips super_admin accounts (always Diamond).
do $$
begin
  update public.profiles p
  set
    cumulative_points = (
      select coalesce(sum(delta), 0)
      from   public.loyalty_events
      where  user_id = p.id
    ),
    tier = public.tier_from_points((
      select coalesce(sum(delta), 0)
      from   public.loyalty_events
      where  user_id = p.id
    ))
  where p.role != 'super_admin';
exception
  -- tier_from_points may not exist if tier-trigger.sql hasn't been run
  when undefined_function then null;
end $$;
