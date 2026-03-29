-- ============================================================
-- SONCAR – Change signup bonus from 100 pts to 50 pts
--
-- Run in the Supabase SQL editor.
-- This updates:
--   1. The handle_new_user trigger function (new signups get 50 pts)
--   2. Existing signup_bonus loyalty_events (adjusts the delta from
--      100 to 50 for all members who received the old bonus)
--   3. Existing profiles' cumulative_points are adjusted accordingly
--      (only affects users whose cumulative_points column exists —
--       run tier-trigger.sql first if you haven't already)
-- ============================================================

-- ── 1. Update the trigger function for new signups ──────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  insert into public.loyalty_events (user_id, delta, reason)
  values (new.id, 50, 'signup_bonus');

  return new;
end;
$$;

-- ── 2. Correct existing signup_bonus events ─────────────────
-- Sets the delta to 50 for any signup_bonus event that was 100.
-- This adjusts the ledger so point totals are correct.
update public.loyalty_events
set delta = 50
where reason = 'signup_bonus'
  and delta = 100;

-- ── 3. Adjust cumulative_points on profiles ──────────────────
-- Subtract 50 from cumulative_points for any profile that had
-- a signup_bonus event corrected above (i.e. had 100, now 50).
-- This is safe to run even if cumulative_points column doesn't
-- exist yet — the DO block catches the error gracefully.
do $$
begin
  update public.profiles p
  set cumulative_points = greatest(0, p.cumulative_points - 50)
  where exists (
    select 1
    from public.loyalty_events le
    where le.user_id = p.id
      and le.reason = 'signup_bonus'
      -- delta has already been updated to 50 in step 2,
      -- so we match on the corrected value
      and le.delta = 50
  );
exception
  when undefined_column then
    -- cumulative_points column doesn't exist yet (tier-trigger.sql
    -- not yet run) — skip this step; it will be correct when backfilled
    null;
end $$;

-- ── 4. Recalculate tier for affected profiles ────────────────
do $$
begin
  update public.profiles p
  set tier = public.tier_from_points(p.cumulative_points)
  where p.role != 'super_admin'
    and exists (
      select 1 from public.loyalty_events le
      where le.user_id = p.id
        and le.reason = 'signup_bonus'
    );
exception
  when undefined_column then null;
  when undefined_function then null;
end $$;
