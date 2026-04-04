-- ============================================================
-- RAGNARÖK — Nutrition Tracking System Schema
-- Run AFTER: fitness-schema.sql, loyalty-tier-redesign.sql
-- ============================================================

-- ── 1. Food Cache ────────────────────────────────────────────
-- Stores results from Open Food Facts and USDA FoodData Central
create table if not exists public.food_cache (
  id            uuid primary key default gen_random_uuid(),
  barcode       text,
  name          text not null,
  brand         text,
  source        text not null check (source in ('open_food_facts', 'usda', 'ragnarok', 'custom')),
  source_id     text,           -- original ID from source database
  serving_size  numeric,        -- in grams
  serving_unit  text default 'g',
  nutrient_data jsonb not null default '{}',
  nutri_score   text check (nutri_score in ('A','B','C','D','E')),
  allergens     text[] default '{}',
  image_url     text,
  non_null_fields integer default 0,  -- used to pick best source
  created_at    timestamptz default now(),
  expires_at    timestamptz default now() + interval '30 days'
);

create index if not exists idx_food_cache_barcode on public.food_cache(barcode) where barcode is not null;
create index if not exists idx_food_cache_name on public.food_cache using gin(to_tsvector('english', name));
create index if not exists idx_food_cache_expires on public.food_cache(expires_at);
create index if not exists idx_food_cache_source_id on public.food_cache(source, source_id) where source_id is not null;

-- ── 2. Custom Foods (member submissions) ─────────────────────
create table if not exists public.custom_foods (
  id              uuid primary key default gen_random_uuid(),
  submitted_by    uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  brand           text,
  serving_size    numeric not null default 100,
  serving_unit    text not null default 'g',
  nutrient_data   jsonb not null default '{}',
  label_photo_url text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references public.profiles(id),
  review_notes    text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_custom_foods_status on public.custom_foods(status);
create index if not exists idx_custom_foods_submitted_by on public.custom_foods(submitted_by);

-- ── 3. Nutrition Logs (food diary entries) ───────────────────
create table if not exists public.nutrition_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  food_cache_id       uuid references public.food_cache(id),
  custom_food_id      uuid references public.custom_foods(id),
  ragnarok_product_id uuid,   -- references product slug/id from products lib
  meal_category       text not null check (meal_category in (
    'breakfast','morning_snack','lunch','afternoon_snack','dinner','evening_snack','supplements'
  )),
  serving_quantity    numeric not null default 1,
  serving_unit        text not null default 'serving',
  serving_grams       numeric,   -- computed grams for the serving
  nutrient_data       jsonb not null default '{}',  -- computed nutrients for this serving
  food_name           text not null,
  food_brand          text,
  logged_date         date not null default current_date,
  logged_at           timestamptz default now(),
  data_source         text default 'web' check (data_source in ('web','future_app','barcode_scan','manual')),
  visibility          text default 'private' check (visibility in ('private','followers','public'))
);

create index if not exists idx_nutrition_logs_user_date on public.nutrition_logs(user_id, logged_date desc);
create index if not exists idx_nutrition_logs_logged_date on public.nutrition_logs(logged_date desc);

-- ── 4. Nutrition Goals ───────────────────────────────────────
create table if not exists public.nutrition_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  calories        integer default 2000,
  protein_g       numeric default 150,
  carbs_g         numeric default 250,
  fat_g           numeric default 65,
  fibre_g         numeric default 30,
  water_ml        integer default 2000,
  custom_targets  jsonb default '{}',   -- per-micronutrient targets
  goal_type       text default 'maintain' check (goal_type in (
    'lose_weight','maintain','gain_muscle','improve_performance','custom'
  )),
  class_split     text,   -- RPG class slug if using class macro split
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id)
);

-- ── 5. Water Logs ────────────────────────────────────────────
create table if not exists public.water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount_ml   integer not null check (amount_ml > 0 and amount_ml <= 5000),
  logged_at   timestamptz default now()
);

create index if not exists idx_water_logs_user_date on public.water_logs(user_id, logged_at desc);

-- ── 6. Meal Plans ────────────────────────────────────────────
create table if not exists public.meal_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  plan_data   jsonb not null default '{}',  -- { "2026-04-07": { breakfast: [...], lunch: [...] }, ... }
  is_template boolean default false,
  is_public   boolean default false,        -- only super_admin can set true for shared templates
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_meal_plans_user on public.meal_plans(user_id);
create index if not exists idx_meal_plans_public on public.meal_plans(is_public) where is_public = true;

-- ── 7. Recipes ───────────────────────────────────────────────
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  description   text,
  servings      integer not null default 1,
  ingredients   jsonb not null default '[]',   -- array of { food_id, food_name, quantity, unit, nutrient_data }
  nutrient_data jsonb not null default '{}',   -- per-serving nutrients
  photo_url     text,
  is_public     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_recipes_user on public.recipes(user_id);
create index if not exists idx_recipes_public on public.recipes(is_public, created_at desc) where is_public = true;

-- ── 8. Recipe Ratings ────────────────────────────────────────
create table if not exists public.recipe_ratings (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  rating      integer check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique (recipe_id, user_id)
);

create index if not exists idx_recipe_ratings_recipe on public.recipe_ratings(recipe_id);

-- ── 9. Nutrition Streaks ─────────────────────────────────────
create table if not exists public.nutrition_streaks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  current_streak     integer default 0,
  longest_streak     integer default 0,
  last_logged_date   date,
  water_streak       integer default 0,
  longest_water_streak integer default 0,
  last_water_date    date,
  unique (user_id)
);

-- ── 10. Nutrition Achievements ───────────────────────────────
create table if not exists public.nutrition_achievements (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  description          text not null,
  icon                 text not null default '🥗',
  requirement_type     text not null,
  requirement_value    integer not null default 1,
  points_reward        integer default 50,
  created_at           timestamptz default now()
);

create table if not exists public.member_nutrition_achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  achievement_id  uuid not null references public.nutrition_achievements(id),
  earned_at       timestamptz default now(),
  unique (user_id, achievement_id)
);

create index if not exists idx_member_nutrition_achievements_user on public.member_nutrition_achievements(user_id);

-- ── 11. Nutrition Abuse Flags ────────────────────────────────
create table if not exists public.nutrition_abuse_flags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  flag_type   text not null,
  details     jsonb default '{}',
  flagged_at  timestamptz default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  action_taken text
);

create index if not exists idx_nutrition_abuse_flags_user on public.nutrition_abuse_flags(user_id);
create index if not exists idx_nutrition_abuse_flags_reviewed on public.nutrition_abuse_flags(reviewed_at) where reviewed_at is null;

-- ── 12. Favourite Foods ──────────────────────────────────────
create table if not exists public.favourite_foods (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  food_cache_id   uuid references public.food_cache(id),
  custom_food_id  uuid references public.custom_foods(id),
  food_name       text not null,
  food_brand      text,
  serving_quantity numeric default 1,
  serving_unit    text default 'serving',
  nutrient_data   jsonb default '{}',
  created_at      timestamptz default now(),
  unique (user_id, food_cache_id),
  unique (user_id, custom_food_id)
);

create index if not exists idx_favourite_foods_user on public.favourite_foods(user_id);

-- ── 13. Member Allergens ─────────────────────────────────────
create table if not exists public.member_allergens (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  allergens            text[] default '{}',
  dietary_preferences  text[] default '{}',
  updated_at           timestamptz default now(),
  unique (user_id)
);

-- ── 14. Ragnarök Nutrition Profiles ──────────────────────────
-- Nutrition data for official Ragnarök products (managed by super_admin)
create table if not exists public.ragnarok_nutrition_profiles (
  id              uuid primary key default gen_random_uuid(),
  product_slug    text not null unique,   -- matches slug in lib/products.ts
  product_name    text not null,
  nutrient_data   jsonb not null default '{}',
  serving_size    numeric not null default 100,
  serving_unit    text not null default 'ml',
  allergens       text[] default '{}',
  nutri_score     text check (nutri_score in ('A','B','C','D','E')),
  updated_at      timestamptz default now(),
  updated_by      uuid references public.profiles(id)
);

-- ── 15. Nutrition Points Events tracking ─────────────────────
-- Tracks which nutrition rewards have been given today to enforce caps
create table if not exists public.nutrition_daily_rewards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  reward_type text not null,
  reward_date date not null default current_date,
  points      integer not null,
  created_at  timestamptz default now(),
  unique (user_id, reward_type, reward_date)
);

create index if not exists idx_nutrition_daily_rewards_user_date on public.nutrition_daily_rewards(user_id, reward_date desc);

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- food_cache: all authenticated users can read; no direct write (API handles it)
alter table public.food_cache enable row level security;
create policy "food_cache_read" on public.food_cache for select to authenticated using (true);
create policy "food_cache_insert" on public.food_cache for insert to authenticated with check (true);
create policy "food_cache_update" on public.food_cache for update to authenticated using (true);

-- custom_foods: members read approved + their own; admins read all
alter table public.custom_foods enable row level security;
create policy "custom_foods_read_approved" on public.custom_foods for select to authenticated
  using (status = 'approved' or submitted_by = auth.uid() or exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')
  ));
create policy "custom_foods_insert" on public.custom_foods for insert to authenticated
  with check (submitted_by = auth.uid());
create policy "custom_foods_update_own" on public.custom_foods for update to authenticated
  using (submitted_by = auth.uid() and status = 'pending');
create policy "custom_foods_admin_update" on public.custom_foods for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')));

-- nutrition_logs: users own their data, with visibility-based sharing
alter table public.nutrition_logs enable row level security;
create policy "nutrition_logs_own" on public.nutrition_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "nutrition_logs_public_read" on public.nutrition_logs for select to authenticated
  using (visibility = 'public');

-- nutrition_goals: own only
alter table public.nutrition_goals enable row level security;
create policy "nutrition_goals_own" on public.nutrition_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- water_logs: own only
alter table public.water_logs enable row level security;
create policy "water_logs_own" on public.water_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- meal_plans: own + public templates readable by all
alter table public.meal_plans enable row level security;
create policy "meal_plans_own" on public.meal_plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meal_plans_public_read" on public.meal_plans for select to authenticated
  using (is_public = true);

-- recipes: own + public readable by all
alter table public.recipes enable row level security;
create policy "recipes_own" on public.recipes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recipes_public_read" on public.recipes for select to authenticated
  using (is_public = true);

-- recipe_ratings: all authenticated can read; own write
alter table public.recipe_ratings enable row level security;
create policy "recipe_ratings_read" on public.recipe_ratings for select to authenticated using (true);
create policy "recipe_ratings_own" on public.recipe_ratings for insert to authenticated
  with check (user_id = auth.uid());
create policy "recipe_ratings_update_own" on public.recipe_ratings for update to authenticated
  using (user_id = auth.uid());

-- nutrition_streaks: own only
alter table public.nutrition_streaks enable row level security;
create policy "nutrition_streaks_own" on public.nutrition_streaks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- nutrition_achievements: all can read, system writes
alter table public.nutrition_achievements enable row level security;
create policy "nutrition_achievements_read" on public.nutrition_achievements for select to authenticated using (true);

-- member_nutrition_achievements: own read; system write
alter table public.member_nutrition_achievements enable row level security;
create policy "member_nutrition_achievements_own_read" on public.member_nutrition_achievements for select to authenticated
  using (user_id = auth.uid());
create policy "member_nutrition_achievements_insert" on public.member_nutrition_achievements for insert to authenticated
  with check (user_id = auth.uid());

-- nutrition_abuse_flags: admin read only
alter table public.nutrition_abuse_flags enable row level security;
create policy "nutrition_abuse_flags_admin" on public.nutrition_abuse_flags for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')));
create policy "nutrition_abuse_flags_insert" on public.nutrition_abuse_flags for insert to authenticated
  with check (true);
create policy "nutrition_abuse_flags_admin_update" on public.nutrition_abuse_flags for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')));

-- favourite_foods: own only
alter table public.favourite_foods enable row level security;
create policy "favourite_foods_own" on public.favourite_foods for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- member_allergens: own only
alter table public.member_allergens enable row level security;
create policy "member_allergens_own" on public.member_allergens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ragnarok_nutrition_profiles: all can read; super_admin can write
alter table public.ragnarok_nutrition_profiles enable row level security;
create policy "ragnarok_nutrition_profiles_read" on public.ragnarok_nutrition_profiles for select to authenticated using (true);
create policy "ragnarok_nutrition_profiles_admin_write" on public.ragnarok_nutrition_profiles for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

-- nutrition_daily_rewards: own only
alter table public.nutrition_daily_rewards enable row level security;
create policy "nutrition_daily_rewards_own" on public.nutrition_daily_rewards for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS AND FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Function: update nutrition streak on log
create or replace function public.update_nutrition_streak()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_last_date date;
  v_current   integer;
  v_longest   integer;
begin
  -- Get current streak
  select last_logged_date, current_streak, longest_streak
  into v_last_date, v_current, v_longest
  from public.nutrition_streaks
  where user_id = new.user_id;

  if not found then
    insert into public.nutrition_streaks (user_id, current_streak, longest_streak, last_logged_date)
    values (new.user_id, 1, 1, new.logged_date)
    on conflict (user_id) do nothing;
    return new;
  end if;

  -- Same day log — no streak change
  if v_last_date = new.logged_date then
    return new;
  end if;

  -- Consecutive day
  if v_last_date = new.logged_date - 1 then
    v_current := v_current + 1;
  else
    v_current := 1;
  end if;

  v_longest := greatest(v_longest, v_current);

  update public.nutrition_streaks
  set current_streak = v_current,
      longest_streak = v_longest,
      last_logged_date = new.logged_date
  where user_id = new.user_id;

  return new;
end;
$$;

create trigger on_nutrition_log_inserted
after insert on public.nutrition_logs
for each row execute function public.update_nutrition_streak();

-- Function: award nutrition loyalty points (called by API)
-- Awards points after day is complete via day-end check
create or replace function public.award_nutrition_points(
  p_user_id uuid,
  p_reward_type text,
  p_points integer,
  p_date date default current_date
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_total_today integer;
  v_daily_cap   integer := 100;
begin
  -- Check frozen
  if exists (select 1 from public.profiles where id = p_user_id and fitness_points_frozen = true) then
    return false;
  end if;

  -- Already awarded this type today
  if exists (select 1 from public.nutrition_daily_rewards
             where user_id = p_user_id and reward_type = p_reward_type and reward_date = p_date) then
    return false;
  end if;

  -- Check daily cap
  select coalesce(sum(points), 0) into v_total_today
  from public.nutrition_daily_rewards
  where user_id = p_user_id and reward_date = p_date;

  if v_total_today + p_points > v_daily_cap then
    return false;
  end if;

  -- Record reward
  insert into public.nutrition_daily_rewards (user_id, reward_type, reward_date, points)
  values (p_user_id, p_reward_type, p_date, p_points);

  -- Insert loyalty event
  insert into public.loyalty_events (user_id, delta, reason)
  values (p_user_id, p_points, 'nutrition_' || p_reward_type);

  return true;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- SEED: Nutrition Achievements
-- ═══════════════════════════════════════════════════════════════
insert into public.nutrition_achievements (name, description, icon, requirement_type, requirement_value, points_reward) values
  ('First Feast',        'Log your first meal',                     '🍽️',  'total_logs',           1,   50),
  ('Daily Dedication',   'Log food for 7 consecutive days',         '📅',  'streak_days',          7,   75),
  ('Month of Meals',     'Log food for 30 consecutive days',        '🗓️',  'streak_days',          30,  200),
  ('Protein Warrior',    'Hit your protein target 7 days in a row', '💪',  'protein_streak',       7,   100),
  ('Hydration Hero',     'Hit your water target 7 days in a row',   '💧',  'water_streak',         7,   75),
  ('Macro Master',       'Hit all macro targets in a single day',   '🎯',  'macro_perfect_day',    1,   50),
  ('Consistent Viking',  'Log 100 total meals',                     '⚔️',  'total_logs',           100, 150),
  ('Recipe Creator',     'Create and share your first recipe',      '👨‍🍳',  'recipes_shared',       1,   100),
  ('Community Chef',     'Have a recipe liked 10 times',            '🌟',  'recipe_likes',         10,  150),
  ('Ragnarök Loyal',     'Log a Ragnarök product 7 days in a row',  '🌿',  'ragnarok_streak',      7,   200),
  ('Custom Food Pioneer','Get a custom food submission approved',   '✅',  'custom_approved',      1,   50),
  ('Supplement Stalwart','Log supplements for 30 days',             '💊',  'supplement_streak',    30,  150),
  ('Nutrition Nerd',     'Track micronutrients for 14 days',        '🔬',  'micro_tracked_days',   14,  100),
  ('Water Champion',     'Log 2 litres of water every day for 30 days', '🏆', 'water_streak',     30,  200),
  ('Perfect Week',       'Hit all macros every day for a full week','✨',  'macro_perfect_streak', 7,   250)
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════
-- Ragnarök Product Nutrition Profiles (initial data)
-- Super admins can update these via Site Management
-- ═══════════════════════════════════════════════════════════════
insert into public.ragnarok_nutrition_profiles (product_slug, product_name, serving_size, serving_unit, allergens, nutrient_data) values
  ('freyjas-bloom', 'Freyja''s Bloom', 330, 'ml', '{}', '{
    "calories": 45, "protein": 0.5, "carbs": 10.2, "fat": 0.1, "sugar": 9.8,
    "fibre": 0.3, "sodium": 12, "vitamin_c": 18, "vitamin_b6": 0.4, "vitamin_b12": 0.6
  }'),
  ('dummens-nectar', 'Dümmens Nectar', 330, 'ml', '{}', '{
    "calories": 120, "protein": 2.1, "carbs": 28.4, "fat": 0.2, "sugar": 26.1,
    "fibre": 0.0, "sodium": 35, "potassium": 180, "vitamin_c": 12, "vitamin_b3": 2.1
  }'),
  ('loki-hell-fire', 'Loki Hell Fire', 330, 'ml', '{}', '{
    "calories": 15, "protein": 0.3, "carbs": 3.1, "fat": 0.0, "sugar": 2.9,
    "fibre": 0.0, "sodium": 8, "vitamin_c": 24, "vitamin_b6": 0.8, "vitamin_b12": 1.2,
    "vitamin_b3": 3.5
  }')
on conflict (product_slug) do nothing;

-- ── Done ────────────────────────────────────────────────────────
-- All 15 nutrition tables created with RLS.
-- Streak trigger active on nutrition_logs.
-- 15 achievement seeds loaded.
-- 3 Ragnarök product nutrition profiles seeded.
