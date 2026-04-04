-- ============================================================
-- RAGNARÖK — Loyalty Tier Redesign: 19-Tier Norse System
-- Run AFTER: fitness-schema.sql
--
-- Replaces the 13-tier Bronze→Diamond system with a 19-tier
-- Norse/RPG system: Thrall → Karl → Huscarl → Jarl →
-- Einherjar → Valkyrie → Legendary
--
-- DUAL REQUIREMENTS: Points + Fitness Level must both be met.
-- A member stays at their current tier until BOTH conditions
-- are satisfied simultaneously.
-- ============================================================

-- ── 1. New tier_from_points_and_fitness function ─────────────
-- This replaces public.tier_from_points() for future tier sync.
-- The fitness_level parameter is the member's highest class level.
-- The fitness_prestige parameter is total prestiges across all classes.
create or replace function public.tier_from_points_and_fitness(
  p_points integer,
  p_fitness_level integer default 1,
  p_prestige_total integer default 0
)
returns text language sql immutable set search_path = public as $$
  select case
    -- Legendary: 150k pts + Level 50 + 5 prestiges across any classes
    when p_points >= 150000 and p_fitness_level >= 50 and p_prestige_total >= 5 then 'Legendary'

    -- Valkyrie III: 115k + Level 50 + 3 prestiges
    when p_points >= 115000 and p_fitness_level >= 50 and p_prestige_total >= 3 then 'Valkyrie III'

    -- Valkyrie II: 95k + Level 49 + 2 prestiges
    when p_points >= 95000 and p_fitness_level >= 49 and p_prestige_total >= 2 then 'Valkyrie II'

    -- Valkyrie I: 78k + Level 49 + 1 prestige
    when p_points >= 78000 and p_fitness_level >= 49 and p_prestige_total >= 1 then 'Valkyrie I'

    -- Einherjar III: 64k + Level 48
    when p_points >= 64000 and p_fitness_level >= 48 then 'Einherjar III'

    -- Einherjar II: 52k + Level 46
    when p_points >= 52000 and p_fitness_level >= 46 then 'Einherjar II'

    -- Einherjar I: 42k + Level 44
    when p_points >= 42000 and p_fitness_level >= 44 then 'Einherjar I'

    -- Jarl III: 33k + Level 41
    when p_points >= 33000 and p_fitness_level >= 41 then 'Jarl III'

    -- Jarl II: 26k + Level 38
    when p_points >= 26000 and p_fitness_level >= 38 then 'Jarl II'

    -- Jarl I: 20k + Level 35
    when p_points >= 20000 and p_fitness_level >= 35 then 'Jarl I'

    -- Huscarl III: 15k + Level 30
    when p_points >= 15000 and p_fitness_level >= 30 then 'Huscarl III'

    -- Huscarl II: 11k + Level 25
    when p_points >= 11000 and p_fitness_level >= 25 then 'Huscarl II'

    -- Huscarl I: 8k + Level 20
    when p_points >= 8000 and p_fitness_level >= 20 then 'Huscarl I'

    -- Karl III: 5.5k + Level 15
    when p_points >= 5500 and p_fitness_level >= 15 then 'Karl III'

    -- Karl II: 3.5k + Level 10
    when p_points >= 3500 and p_fitness_level >= 10 then 'Karl II'

    -- Karl I: 2k + Level 5
    when p_points >= 2000 and p_fitness_level >= 5 then 'Karl I'

    -- Thrall III: 1k pts (no fitness requirement)
    when p_points >= 1000 then 'Thrall III'

    -- Thrall II: 500 pts
    when p_points >= 500 then 'Thrall II'

    -- Thrall I: starting tier
    else 'Thrall I'
  end
$$;

-- ── 2. Simplified points-only tier for backward compat ───────
-- Used by super_admin promotions and legacy code paths
create or replace function public.tier_from_points(p integer)
returns text language sql immutable set search_path = public as $$
  select case
    when p >= 150000 then 'Legendary'
    when p >= 115000 then 'Valkyrie III'
    when p >= 95000  then 'Valkyrie II'
    when p >= 78000  then 'Valkyrie I'
    when p >= 64000  then 'Einherjar III'
    when p >= 52000  then 'Einherjar II'
    when p >= 42000  then 'Einherjar I'
    when p >= 33000  then 'Jarl III'
    when p >= 26000  then 'Jarl II'
    when p >= 20000  then 'Jarl I'
    when p >= 15000  then 'Huscarl III'
    when p >= 11000  then 'Huscarl II'
    when p >= 8000   then 'Huscarl I'
    when p >= 5500   then 'Karl III'
    when p >= 3500   then 'Karl II'
    when p >= 2000   then 'Karl I'
    when p >= 1000   then 'Thrall III'
    when p >= 500    then 'Thrall II'
    else                  'Thrall I'
  end
$$;


-- ── 3. Update sync_cumulative_points trigger to use fitness ──
-- Now uses tier_from_points_and_fitness when fitness columns exist
create or replace function public.sync_cumulative_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role         text;
  v_new_total    integer;
  v_fit_level    integer;
  v_fit_prestige integer;
begin
  -- Apply the delta atomically and capture the new total
  update public.profiles
  set cumulative_points = cumulative_points + new.delta
  where id = new.user_id
  returning cumulative_points, role, fitness_level_highest, fitness_prestige_total
  into v_new_total, v_role, v_fit_level, v_fit_prestige;

  -- Recalculate tier (super_admins always stay Legendary)
  if v_role = 'super_admin' then
    update public.profiles
    set tier = 'Legendary'
    where id = new.user_id;
  else
    update public.profiles
    set tier = public.tier_from_points_and_fitness(
      v_new_total,
      coalesce(v_fit_level, 1),
      coalesce(v_fit_prestige, 0)
    )
    where id = new.user_id;
  end if;

  return new;
end;
$$;


-- ── 4. Update role-change trigger for new tiers ──────────────
create or replace function public.handle_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = old.role then
    return new;
  end if;

  if new.role = 'super_admin' then
    -- Super admins are always Legendary with minimum points
    new.cumulative_points := greatest(new.cumulative_points, 150000);
    new.tier := 'Legendary';

  elsif old.role = 'super_admin' then
    -- Demoted: points stay, tier recalculates with fitness
    new.tier := public.tier_from_points_and_fitness(
      new.cumulative_points,
      coalesce(new.fitness_level_highest, 1),
      coalesce(new.fitness_prestige_total, 0)
    );
  end if;

  return new;
end;
$$;


-- ── 5. Migrate existing members to new tier system ───────────
-- Most existing members will drop to Thrall I-III as expected
-- (new thresholds are much higher)
-- Super admins retain Legendary tier
update public.profiles
set tier = case
  when role = 'super_admin' then 'Legendary'
  else public.tier_from_points(coalesce(cumulative_points, 0))
end,
cumulative_points = case
  when role = 'super_admin' then greatest(coalesce(cumulative_points, 0), 150000)
  else coalesce(cumulative_points, 0)
end;

-- Update signup bonus: was 50, now 200
-- NOTE: existing bonuses are not retroactively increased — only future signups get 200
-- The trigger below handles new signups; old members keep their original bonus.


-- ── 6. Update handle_new_user for new signup bonus ───────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  -- New signup bonus: 200 points (up from 50)
  insert into public.loyalty_events (user_id, delta, reason)
  values (new.id, 200, 'signup_bonus');

  -- Create default fitness streak row
  insert into public.fitness_streaks (user_id, current_streak, longest_streak)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;


-- ── 7. Function to recalculate tier when fitness level changes ─
-- Called by the API when a member levels up in a fitness class
create or replace function public.recalculate_member_tier(p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_points       integer;
  v_role         text;
  v_fit_level    integer;
  v_fit_prestige integer;
  v_new_tier     text;
begin
  select cumulative_points, role, fitness_level_highest, fitness_prestige_total
  into v_points, v_role, v_fit_level, v_fit_prestige
  from public.profiles
  where id = p_user_id;

  if v_role = 'super_admin' then
    return 'Legendary';
  end if;

  v_new_tier := public.tier_from_points_and_fitness(
    coalesce(v_points, 0),
    coalesce(v_fit_level, 1),
    coalesce(v_fit_prestige, 0)
  );

  update public.profiles
  set tier = v_new_tier
  where id = p_user_id;

  return v_new_tier;
end;
$$;


-- ── 8. Viking level-up bonus loyalty points function ─────────
-- Called by the API when a Viking class member levels up
create or replace function public.award_viking_level_bonus(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- 10 extra loyalty points per level up for Viking class members
  insert into public.loyalty_events (user_id, delta, reason)
  values (p_user_id, 10, 'fitness_viking_level_bonus')
  where not exists (
    select 1 from public.profiles where id = p_user_id and fitness_points_frozen = true
  );
end;
$$;


-- ── 9. Create index for tier queries ────────────────────────
create index if not exists idx_profiles_tier on public.profiles(tier);
create index if not exists idx_profiles_fitness_level on public.profiles(fitness_level_highest desc);
create index if not exists idx_profiles_prestige on public.profiles(fitness_prestige_total desc);

-- ── Done ─────────────────────────────────────────────────────
-- Tier system has been migrated to the 19-tier Norse structure.
-- All existing members recalculated. Super admins set to Legendary.
-- New signup bonus is 200 points.
