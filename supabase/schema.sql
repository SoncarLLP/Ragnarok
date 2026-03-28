-- ============================================================
-- SONCAR – Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  full_name  text,
  phone      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ── Orders ──────────────────────────────────────────────────
-- items column shape: [{slug, name, qty, price_pence}]
create table public.orders (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  items       jsonb not null,
  total_pence integer not null,
  status      text not null default 'pending',
  created_at  timestamptz default now()
);

alter table public.orders enable row level security;

create policy "users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);


-- ── Loyalty events ──────────────────────────────────────────
-- Immutable ledger: positive delta = earned, negative = redeemed
-- reason: 'signup_bonus' | 'purchase' | 'redemption'
create table public.loyalty_events (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  delta      integer not null,
  reason     text not null,
  order_id   uuid references public.orders(id),
  created_at timestamptz default now()
);

alter table public.loyalty_events enable row level security;

create policy "users can view own loyalty events"
  on public.loyalty_events for select
  using (auth.uid() = user_id);


-- ── Auto-create profile + signup bonus on new user ──────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  insert into public.loyalty_events (user_id, delta, reason)
  values (new.id, 100, 'signup_bonus');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
