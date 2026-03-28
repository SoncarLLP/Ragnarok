-- ============================================================
-- SONCAR – Community schema
-- Run this in the Supabase SQL editor AFTER schema.sql
-- ============================================================

-- ── Profile extensions ───────────────────────────────────────
alter table public.profiles
  add column if not exists username   text unique,
  add column if not exists bio        text,
  add column if not exists avatar_url text;

-- ── Storage buckets ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;

-- avatars: public read, auth upload/delete own
create policy "Public read avatars"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Auth users upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Users delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- post-images: public read, auth upload/delete own
create policy "Public read post-images"
  on storage.objects for select using (bucket_id = 'post-images');

create policy "Auth users upload post images"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

create policy "Users delete own post images"
  on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── Posts ────────────────────────────────────────────────────
-- user_id references profiles so PostgREST can auto-join
create table public.posts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  type        text not null check (type in ('text', 'photo', 'recipe')),
  content     text,
  image_url   text,
  ingredients text,
  method      text,
  categories  text[] not null default '{}',
  created_at  timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Anyone can read posts"
  on public.posts for select using (true);

create policy "Auth users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ── Comments ─────────────────────────────────────────────────
create table public.comments (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references public.posts(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Anyone can read comments"
  on public.comments for select using (true);

create policy "Auth users can comment"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- ── Likes ────────────────────────────────────────────────────
create table public.likes (
  post_id    uuid references public.posts(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

create policy "Anyone can read likes"
  on public.likes for select using (true);

create policy "Auth users can like"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete
  using (auth.uid() = user_id);

-- ── Follows ──────────────────────────────────────────────────
create table public.follows (
  follower_id  uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

alter table public.follows enable row level security;

create policy "Anyone can read follows"
  on public.follows for select using (true);

create policy "Auth users can follow"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ── Loyalty points for community activity ────────────────────
create or replace function public.award_post_points()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.loyalty_events (user_id, delta, reason)
  values (new.user_id, 5, 'post_created');
  return new;
end;
$$;

create trigger on_post_created
  after insert on public.posts
  for each row execute procedure public.award_post_points();

create or replace function public.award_comment_points()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.loyalty_events (user_id, delta, reason)
  values (new.user_id, 1, 'comment_posted');
  return new;
end;
$$;

create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.award_comment_points();
