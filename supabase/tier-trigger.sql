-- ============================================================
-- SONCAR – Cumulative points, tier columns, and triggers
--
-- Run in the Supabase SQL editor AFTER schema.sql,
-- community-schema.sql, and roles-schema.sql.
--
-- What this does:
--   1. Adds cumulative_points and tier columns to profiles
--   2. Backfills both from existing loyalty_events data
--   3. Adds a trigger on loyalty_events to keep cumulative_points
--      up to date on every earn/redeem event
--   4. Adds a trigger on profiles that handles role changes:
--        - Promoted to super_admin → cumulative_points raised to
--          at least 4,000 and tier set to 'Diamond'
--        - Demoted from super_admin → cumulative_points unchanged,
--          tier recalculated from cumulative_points
-- ============================================================


-- ── 1. Add columns ───────────────────────────────────────────
alter table public.profiles
  add column if not exists cumulative_points integer not null default 0,
  add column if not exists tier             text    not null default 'Bronze 1';


-- ── 2. Tier calculation helper ───────────────────────────────
-- Maps a cumulative point total to the correct tier name using
-- the 13-tier structure defined in the Loyalty Scheme Terms.
create or replace function public.tier_from_points(p integer)
returns text language sql immutable set search_path = public as $$
  select case
    when p >= 4000 then 'Diamond'
    when p >= 3500 then 'Platinum 3'
    when p >= 3100 then 'Platinum 2'
    when p >= 2700 then 'Platinum 1'
    when p >= 2350 then 'Gold 3'
    when p >= 2000 then 'Gold 2'
    when p >= 1650 then 'Gold 1'
    when p >= 1350 then 'Silver 3'
    when p >= 1050 then 'Silver 2'
    when p >= 750  then 'Silver 1'
    when p >= 500  then 'Bronze 3'
    when p >= 250  then 'Bronze 2'
    else                'Bronze 1'
  end
$$;


-- ── 3. Backfill existing profiles ────────────────────────────
-- Recalculate cumulative_points and tier for every existing user
-- from their loyalty_events ledger. super_admin accounts are set
-- to at least 4,000 points and tier 'Diamond'.
update public.profiles p
set
  cumulative_points = case
    when p.role = 'super_admin'
    then greatest(coalesce(sums.total, 0), 4000)
    else coalesce(sums.total, 0)
  end,
  tier = case
    when p.role = 'super_admin' then 'Diamond'
    else public.tier_from_points(coalesce(sums.total, 0))
  end
from (
  select user_id, sum(delta) as total
  from public.loyalty_events
  group by user_id
) sums
where p.id = sums.user_id;

-- Profiles with no loyalty_events at all stay at 0 pts / Bronze 1
-- (already the column defaults — no action needed for those rows)


-- ── 4. Keep cumulative_points in sync with loyalty_events ────
-- Fires after every insert into loyalty_events and applies the
-- delta directly to cumulative_points on the relevant profile.
-- Also recalculates tier, unless the user is super_admin (whose
-- tier is always Diamond regardless of point total).
create or replace function public.sync_cumulative_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_new_total integer;
begin
  -- Apply the delta atomically and capture the new total
  update public.profiles
  set cumulative_points = cumulative_points + new.delta
  where id = new.user_id
  returning cumulative_points, role
  into v_new_total, v_role;

  -- Recalculate tier (super_admins always stay Diamond)
  if v_role = 'super_admin' then
    update public.profiles
    set tier = 'Diamond'
    where id = new.user_id;
  else
    update public.profiles
    set tier = public.tier_from_points(v_new_total)
    where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_loyalty_event_inserted on public.loyalty_events;
create trigger on_loyalty_event_inserted
  after insert on public.loyalty_events
  for each row execute procedure public.sync_cumulative_points();


-- ── 5. Role-change trigger ────────────────────────────────────
-- Fires before every update on profiles so that new.* can be
-- modified directly before the row is written.
--
-- Promotion to super_admin:
--   - cumulative_points raised to at least 4,000
--   - tier set to 'Diamond'
--
-- Demotion from super_admin:
--   - cumulative_points left unchanged
--   - tier recalculated from cumulative_points
create or replace function public.handle_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only act when the role column actually changes
  if new.role = old.role then
    return new;
  end if;

  if new.role = 'super_admin' then
    -- Raise points to at least 4,000; preserve any higher existing total
    new.cumulative_points := greatest(new.cumulative_points, 4000);
    new.tier := 'Diamond';

  elsif old.role = 'super_admin' then
    -- Demoted: points stay as-is, tier recalculates
    new.tier := public.tier_from_points(new.cumulative_points);
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_role_changed on public.profiles;
create trigger on_profile_role_changed
  before update on public.profiles
  for each row execute procedure public.handle_role_change();
