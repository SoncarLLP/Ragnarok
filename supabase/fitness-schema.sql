-- ============================================================
-- RAGNARÖK FITNESS TRACKER — Database Schema
-- Run AFTER: schema.sql, tier-trigger.sql, roles-schema.sql
--
-- Creates all fitness tables, RLS policies, indexes, and triggers
-- for the RPG fitness tracking system.
-- ============================================================

-- ── 1. FITNESS CLASSES ──────────────────────────────────────
create table if not exists public.fitness_classes (
  id                    uuid default gen_random_uuid() primary key,
  name                  text not null unique,
  slug                  text not null unique,
  description           text not null,
  icon                  text not null,
  primary_exercises     jsonb not null default '[]',
  xp_bonus_multiplier   numeric(4,2) not null default 1.0,
  off_class_reduction   numeric(4,2) not null default 0.6,
  special_abilities     jsonb not null default '{}',
  display_order         integer not null default 0,
  created_at            timestamptz default now()
);

alter table public.fitness_classes enable row level security;
create policy "fitness_classes_read_all" on public.fitness_classes
  for select using (true);
create policy "fitness_classes_admin_write" on public.fitness_classes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );


-- ── 2. MEMBER FITNESS PROFILES ─────────────────────────────
create table if not exists public.member_fitness_profiles (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  active_class_id uuid references public.fitness_classes(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.member_fitness_profiles enable row level security;
create policy "mfp_own_read" on public.member_fitness_profiles
  for select using (auth.uid() = user_id);
create policy "mfp_own_write" on public.member_fitness_profiles
  for all using (auth.uid() = user_id);
create policy "mfp_admin_read" on public.member_fitness_profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );


-- ── 3. MEMBER CLASS PROGRESS ────────────────────────────────
create table if not exists public.member_class_progress (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  class_id         uuid references public.fitness_classes(id) not null,
  current_level    integer not null default 1,
  current_xp       integer not null default 0,
  total_xp_earned  integer not null default 0,
  prestige_count   integer not null default 0,
  prestige_history jsonb not null default '[]',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id, class_id)
);

alter table public.member_class_progress enable row level security;
create policy "mcp_own_read" on public.member_class_progress
  for select using (auth.uid() = user_id);
create policy "mcp_own_write" on public.member_class_progress
  for all using (auth.uid() = user_id);
create policy "mcp_admin_read" on public.member_class_progress
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_mcp_user on public.member_class_progress(user_id);
create index if not exists idx_mcp_class on public.member_class_progress(class_id);


-- ── 4. EXERCISES ────────────────────────────────────────────
create table if not exists public.exercises (
  id             uuid default gen_random_uuid() primary key,
  name           text not null,
  category       text not null,          -- strength|cardio|flexibility|hiit|outdoor|functional|martial_arts|recovery
  class_tags     text[] not null default '{}',
  description    text,
  muscle_groups  text[] not null default '{}',
  equipment      text,
  is_custom      boolean not null default false,
  created_by     uuid references auth.users(id),
  approved       boolean not null default true,
  data_source    text not null default 'library', -- library|custom|strava|apple_health|google_fit|garmin|fitbit
  created_at     timestamptz default now()
);

alter table public.exercises enable row level security;
create policy "exercises_read_approved" on public.exercises
  for select using (approved = true or auth.uid() = created_by);
create policy "exercises_insert_auth" on public.exercises
  for insert with check (auth.uid() is not null);
create policy "exercises_admin_all" on public.exercises
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_exercises_category on public.exercises(category);
create index if not exists idx_exercises_approved on public.exercises(approved);


-- ── 5. WORKOUT LOGS ─────────────────────────────────────────
create table if not exists public.workout_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  exercise_id      uuid references public.exercises(id),
  class_id         uuid references public.fitness_classes(id),
  exercise_name    text not null,          -- denormalised for resilience
  exercise_category text not null,
  sets             integer,
  reps             integer,
  weight_kg        numeric(6,2),
  duration_minutes integer,
  distance_km      numeric(8,3),
  intensity        text not null default 'moderate', -- light|moderate|intense|maximum
  notes            text,
  xp_earned        integer not null default 0,
  points_earned    integer not null default 0,
  workout_date     timestamptz not null default now(),
  data_source      text not null default 'web',      -- web|mobile|strava|apple_health|google_fit|garmin|fitbit
  photo_urls       text[] not null default '{}',
  created_at       timestamptz default now(),

  -- Anti-backdating: workout_date cannot be older than 24 hours at insert time
  constraint workout_not_backdated check (workout_date >= (now() - interval '25 hours'))
);

alter table public.workout_logs enable row level security;
create policy "workout_logs_own_read" on public.workout_logs
  for select using (auth.uid() = user_id);
create policy "workout_logs_own_insert" on public.workout_logs
  for insert with check (auth.uid() = user_id);
-- Anti-modification: workouts older than 24h cannot be updated
create policy "workout_logs_own_update" on public.workout_logs
  for update using (
    auth.uid() = user_id and
    created_at >= (now() - interval '24 hours')
  );
create policy "workout_logs_admin_read" on public.workout_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_workout_logs_user on public.workout_logs(user_id);
create index if not exists idx_workout_logs_date on public.workout_logs(workout_date desc);
create index if not exists idx_workout_logs_user_date on public.workout_logs(user_id, workout_date desc);


-- ── 6. PERSONAL RECORDS ─────────────────────────────────────
create table if not exists public.personal_records (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  exercise_id     uuid references public.exercises(id),
  exercise_name   text not null,
  value           numeric(10,3) not null,
  unit            text not null,           -- kg|reps|km|minutes|seconds
  achieved_at     timestamptz not null default now(),
  previous_record numeric(10,3),
  xp_awarded      integer not null default 0,
  workout_log_id  uuid references public.workout_logs(id)
);

alter table public.personal_records enable row level security;
create policy "pr_own_all" on public.personal_records
  for all using (auth.uid() = user_id);
create policy "pr_admin_read" on public.personal_records
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_pr_user on public.personal_records(user_id);
create index if not exists idx_pr_exercise on public.personal_records(exercise_name, user_id);


-- ── 7. FITNESS STREAKS ──────────────────────────────────────
create table if not exists public.fitness_streaks (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null unique,
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_active_date date,
  streak_start_date date,
  updated_at       timestamptz default now()
);

alter table public.fitness_streaks enable row level security;
create policy "streaks_own_all" on public.fitness_streaks
  for all using (auth.uid() = user_id);
create policy "streaks_admin_read" on public.fitness_streaks
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );


-- ── 8. BODY MEASUREMENTS ────────────────────────────────────
create table if not exists public.body_measurements (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  weight_kg           numeric(6,2),
  chest_cm            numeric(6,2),
  waist_cm            numeric(6,2),
  hips_cm             numeric(6,2),
  left_arm_cm         numeric(6,2),
  right_arm_cm        numeric(6,2),
  left_thigh_cm       numeric(6,2),
  right_thigh_cm      numeric(6,2),
  left_calf_cm        numeric(6,2),
  right_calf_cm       numeric(6,2),
  body_fat_percentage numeric(5,2),
  energy_rating       integer check (energy_rating between 1 and 5),
  mood_rating         integer check (mood_rating between 1 and 5),
  sleep_hours         numeric(4,2),
  water_litres        numeric(4,2),
  notes               text,
  measured_at         timestamptz not null default now(),
  created_at          timestamptz default now()
);

alter table public.body_measurements enable row level security;
create policy "body_own_all" on public.body_measurements
  for all using (auth.uid() = user_id);
create index if not exists idx_body_user_date on public.body_measurements(user_id, measured_at desc);


-- ── 9. PROGRESS PHOTOS ─────────────────────────────────────
create table if not exists public.progress_photos (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  photo_url   text not null,
  visibility  text not null default 'private', -- private|followers|public
  notes       text,
  taken_at    timestamptz not null default now(),
  created_at  timestamptz default now()
);

alter table public.progress_photos enable row level security;
create policy "photos_own_all" on public.progress_photos
  for all using (auth.uid() = user_id);
create policy "photos_public_read" on public.progress_photos
  for select using (visibility = 'public' or auth.uid() = user_id);


-- ── 10. FITNESS ACHIEVEMENTS ────────────────────────────────
create table if not exists public.fitness_achievements (
  id                 uuid default gen_random_uuid() primary key,
  name               text not null unique,
  description        text not null,
  icon               text not null,
  category           text not null, -- streak|milestone|pr|class|prestige|challenge|guild|social
  requirement_type   text not null, -- streak_days|total_workouts|total_xp|level|prestige|etc
  requirement_value  integer not null,
  xp_reward          integer not null default 0,
  points_reward      integer not null default 0,
  created_at         timestamptz default now()
);

alter table public.fitness_achievements enable row level security;
create policy "achievements_read_all" on public.fitness_achievements
  for select using (true);
create policy "achievements_admin_write" on public.fitness_achievements
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );


-- ── 11. MEMBER ACHIEVEMENTS ─────────────────────────────────
create table if not exists public.member_achievements (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  achievement_id uuid references public.fitness_achievements(id) not null,
  class_id       uuid references public.fitness_classes(id),
  earned_at      timestamptz default now(),
  unique(user_id, achievement_id)
);

alter table public.member_achievements enable row level security;
create policy "ma_own_all" on public.member_achievements
  for all using (auth.uid() = user_id);
create policy "ma_public_read" on public.member_achievements
  for select using (true);
create index if not exists idx_ma_user on public.member_achievements(user_id);


-- ── 12. FITNESS CHALLENGES ──────────────────────────────────
create table if not exists public.fitness_challenges (
  id               uuid default gen_random_uuid() primary key,
  title            text not null,
  description      text not null,
  challenge_type   text not null,  -- weekly|monthly|class|community
  class_id         uuid references public.fitness_classes(id),
  target_metric    text not null,  -- workouts|duration_minutes|distance_km|xp
  target_value     integer not null,
  start_date       timestamptz not null,
  end_date         timestamptz not null,
  xp_reward        integer not null default 0,
  points_reward    integer not null default 0,
  created_by       uuid references auth.users(id),
  is_active        boolean not null default true,
  created_at       timestamptz default now()
);

alter table public.fitness_challenges enable row level security;
create policy "challenges_read_all" on public.fitness_challenges
  for select using (true);
create policy "challenges_admin_write" on public.fitness_challenges
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_challenges_active on public.fitness_challenges(is_active, end_date);


-- ── 13. MEMBER CHALLENGE PROGRESS ──────────────────────────
create table if not exists public.member_challenge_progress (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  challenge_id  uuid references public.fitness_challenges(id) not null,
  current_value integer not null default 0,
  completed     boolean not null default false,
  completed_at  timestamptz,
  unique(user_id, challenge_id)
);

alter table public.member_challenge_progress enable row level security;
create policy "mcp_challenge_own_all" on public.member_challenge_progress
  for all using (auth.uid() = user_id);
create policy "mcp_challenge_admin_read" on public.member_challenge_progress
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_mcp_challenge_user on public.member_challenge_progress(user_id);


-- ── 14. GUILDS ──────────────────────────────────────────────
create table if not exists public.guilds (
  id             uuid default gen_random_uuid() primary key,
  name           text not null unique,
  description    text,
  class_focus    uuid references public.fitness_classes(id),
  guild_master_id uuid references auth.users(id) not null,
  max_members    integer not null default 20,
  is_active      boolean not null default true,
  created_at     timestamptz default now()
);

alter table public.guilds enable row level security;
create policy "guilds_read_all" on public.guilds
  for select using (true);
create policy "guilds_insert_auth" on public.guilds
  for insert with check (auth.uid() = guild_master_id);
create policy "guilds_update_master" on public.guilds
  for update using (auth.uid() = guild_master_id);
create policy "guilds_admin_all" on public.guilds
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );


-- ── 15. GUILD MEMBERS ───────────────────────────────────────
create table if not exists public.guild_members (
  id        uuid default gen_random_uuid() primary key,
  guild_id  uuid references public.guilds(id) on delete cascade not null,
  user_id   uuid references auth.users(id) on delete cascade not null,
  role      text not null default 'member', -- master|officer|member
  joined_at timestamptz default now(),
  unique(guild_id, user_id)
);

alter table public.guild_members enable row level security;
create policy "gm_read_all" on public.guild_members
  for select using (true);
create policy "gm_own_write" on public.guild_members
  for all using (auth.uid() = user_id);
create policy "gm_master_write" on public.guild_members
  for all using (
    exists (
      select 1 from public.guilds
      where id = guild_id and guild_master_id = auth.uid()
    )
  );
create policy "gm_admin_all" on public.guild_members
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_gm_guild on public.guild_members(guild_id);
create index if not exists idx_gm_user on public.guild_members(user_id);


-- ── 16. GUILD CHALLENGES ────────────────────────────────────
create table if not exists public.guild_challenges (
  id            uuid default gen_random_uuid() primary key,
  guild_id      uuid references public.guilds(id) on delete cascade not null,
  title         text not null,
  description   text,
  target_value  integer not null,
  current_value integer not null default 0,
  end_date      timestamptz not null,
  completed     boolean not null default false,
  xp_reward     integer not null default 0,
  points_reward integer not null default 0,
  created_at    timestamptz default now()
);

alter table public.guild_challenges enable row level security;
create policy "gc_read_members" on public.guild_challenges
  for select using (
    exists (
      select 1 from public.guild_members
      where guild_id = public.guild_challenges.guild_id and user_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create policy "gc_master_write" on public.guild_challenges
  for all using (
    exists (
      select 1 from public.guilds
      where id = guild_id and guild_master_id = auth.uid()
    )
  );


-- ── 17. XP EVENTS (Admin Buffs) ─────────────────────────────
create table if not exists public.xp_events (
  id                uuid default gen_random_uuid() primary key,
  name              text not null,
  description       text,
  event_type        text not null, -- global|class|exercise_category|double_xp
  class_id          uuid references public.fitness_classes(id),
  exercise_category text,
  multiplier        numeric(4,2) not null default 2.0,
  start_date        timestamptz not null,
  end_date          timestamptz not null,
  is_active         boolean not null default true,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now()
);

alter table public.xp_events enable row level security;
create policy "xp_events_read_all" on public.xp_events
  for select using (true);
create policy "xp_events_admin_write" on public.xp_events
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );
create index if not exists idx_xp_events_active on public.xp_events(is_active, end_date);


-- ── 18. FITNESS ABUSE FLAGS ─────────────────────────────────
create table if not exists public.fitness_abuse_flags (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  flag_type    text not null,  -- excessive_workouts|long_session|excessive_prs|xp_spike|bot_pattern|daily_spike
  details      jsonb not null default '{}',
  flagged_at   timestamptz default now(),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  action_taken text,           -- cleared|points_removed|warning|strike|ban
  resolved     boolean not null default false
);

alter table public.fitness_abuse_flags enable row level security;
-- Members cannot read abuse flags (to prevent gaming)
create policy "abuse_flags_admin_all" on public.fitness_abuse_flags
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );
create index if not exists idx_abuse_flags_user on public.fitness_abuse_flags(user_id);
create index if not exists idx_abuse_flags_resolved on public.fitness_abuse_flags(resolved, flagged_at desc);


-- ── 19. LEADERBOARD SNAPSHOTS ───────────────────────────────
create table if not exists public.leaderboard_snapshots (
  id               uuid default gen_random_uuid() primary key,
  period_type      text not null,  -- weekly|monthly
  period_start     timestamptz not null,
  period_end       timestamptz not null,
  leaderboard_data jsonb not null default '{}',
  created_at       timestamptz default now()
);

alter table public.leaderboard_snapshots enable row level security;
create policy "leaderboard_read_all" on public.leaderboard_snapshots
  for select using (true);
create policy "leaderboard_admin_write" on public.leaderboard_snapshots
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
  );


-- ── 20. ADD COLUMNS TO PROFILES ─────────────────────────────
alter table public.profiles
  add column if not exists active_class_id       uuid references public.fitness_classes(id),
  add column if not exists total_fitness_xp       integer not null default 0,
  add column if not exists fitness_points_frozen  boolean not null default false,
  add column if not exists fitness_level_highest  integer not null default 1,
  add column if not exists fitness_prestige_total integer not null default 0;

-- Extend loyalty_events reason to include fitness events
-- (No schema change needed — reason is a free text field)

-- ── 21. XP HELPER FUNCTION ──────────────────────────────────
-- Returns XP required to reach a given level from 0
create or replace function public.xp_for_level(level_num integer)
returns integer language sql immutable as $$
  select case
    when level_num <= 1  then 0
    when level_num <= 10 then (level_num - 1) * 500
    when level_num <= 20 then 4500 + (level_num - 10) * 1000
    when level_num <= 30 then 14500 + (level_num - 20) * 2000
    when level_num <= 40 then 34500 + (level_num - 30) * 3500
    when level_num <= 49 then 69500 + (level_num - 40) * 5000
    else 114500 + 10000  -- level 50 total
  end
$$;

-- XP required for next level from current level
create or replace function public.xp_to_next_level(current_level integer, current_xp integer)
returns integer language sql immutable as $$
  select case
    when current_level >= 50 then 0
    when current_level between 1 and 9  then 500 - current_xp
    when current_level between 10 and 19 then 1000 - current_xp
    when current_level between 20 and 29 then 2000 - current_xp
    when current_level between 30 and 39 then 3500 - current_xp
    when current_level between 40 and 48 then 5000 - current_xp
    when current_level = 49             then 10000 - current_xp
    else 0
  end
$$;


-- ── 22. ANTI-ABUSE TRIGGER ──────────────────────────────────
-- Fires after insert on workout_logs; checks for suspicious patterns
-- and creates abuse flags + freezes fitness points if needed
create or replace function public.check_fitness_abuse()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_daily_count    integer;
  v_daily_xp       integer;
  v_daily_pr_count integer;
  v_week_avg_xp    numeric;
  v_today_xp       integer;
  v_freeze         boolean := false;
  v_flag_type      text;
  v_details        jsonb;
begin
  -- Count workouts logged today for this user
  select count(*), coalesce(sum(xp_earned), 0)
  into v_daily_count, v_today_xp
  from public.workout_logs
  where user_id = new.user_id
    and workout_date::date = current_date;

  -- Check 1: More than 3 workouts in a day
  if v_daily_count > 3 then
    v_freeze := true;
    v_flag_type := 'excessive_workouts';
    v_details := jsonb_build_object('daily_count', v_daily_count, 'date', current_date);
  end if;

  -- Check 2: Session > 4 hours
  if new.duration_minutes > 240 then
    v_freeze := true;
    v_flag_type := 'long_session';
    v_details := jsonb_build_object('duration_minutes', new.duration_minutes, 'workout_id', new.id);
  end if;

  -- Check 3: More than 500 XP in a single day
  if v_today_xp > 500 then
    v_freeze := true;
    v_flag_type := 'xp_spike';
    v_details := jsonb_build_object('daily_xp', v_today_xp, 'date', current_date);
  end if;

  -- Check 4: 7-day average spike (today > 3x average)
  select coalesce(avg(daily_xp), 0)
  into v_week_avg_xp
  from (
    select workout_date::date as day, sum(xp_earned) as daily_xp
    from public.workout_logs
    where user_id = new.user_id
      and workout_date >= now() - interval '7 days'
      and workout_date::date < current_date
    group by workout_date::date
  ) daily;

  if v_week_avg_xp > 0 and v_today_xp > (v_week_avg_xp * 3) then
    v_freeze := true;
    v_flag_type := coalesce(v_flag_type, 'daily_spike');
    v_details := coalesce(v_details, jsonb_build_object(
      'today_xp', v_today_xp,
      'week_avg_xp', round(v_week_avg_xp::numeric, 2),
      'date', current_date
    ));
  end if;

  if v_freeze then
    -- Create abuse flag
    insert into public.fitness_abuse_flags (user_id, flag_type, details)
    values (new.user_id, v_flag_type, v_details)
    on conflict do nothing;

    -- Freeze fitness points
    update public.profiles
    set fitness_points_frozen = true
    where id = new.user_id;

    -- Notify admins via notifications system (best effort)
    insert into public.notifications (user_id, type, data)
    select p.id,
           'fitness_abuse_flag',
           jsonb_build_object(
             'flagged_user_id', new.user_id,
             'flag_type', v_flag_type,
             'details', v_details
           )
    from public.profiles p
    where p.role = 'super_admin'
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_workout_logged_abuse_check on public.workout_logs;
create trigger on_workout_logged_abuse_check
  after insert on public.workout_logs
  for each row execute procedure public.check_fitness_abuse();


-- ── 23. STREAK UPDATE FUNCTION ──────────────────────────────
create or replace function public.update_fitness_streak(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_last_date   date;
  v_today       date := current_date;
  v_streak_row  public.fitness_streaks%rowtype;
begin
  select * into v_streak_row
  from public.fitness_streaks
  where user_id = p_user_id;

  if not found then
    -- First workout ever
    insert into public.fitness_streaks
      (user_id, current_streak, longest_streak, last_active_date, streak_start_date)
    values (p_user_id, 1, 1, v_today, v_today);
    return;
  end if;

  v_last_date := v_streak_row.last_active_date;

  if v_last_date = v_today then
    -- Already logged today — no streak change
    return;
  elsif v_last_date = v_today - 1 then
    -- Consecutive day — extend streak
    update public.fitness_streaks
    set current_streak   = current_streak + 1,
        longest_streak   = greatest(longest_streak, current_streak + 1),
        last_active_date = v_today,
        updated_at       = now()
    where user_id = p_user_id;
  else
    -- Streak broken — restart
    update public.fitness_streaks
    set current_streak   = 1,
        last_active_date = v_today,
        streak_start_date = v_today,
        updated_at       = now()
    where user_id = p_user_id;
  end if;
end;
$$;


-- ── 24. WORKOUT XP/POINTS TRIGGER ───────────────────────────
-- After a workout log is inserted, update streak + total_fitness_xp
create or replace function public.on_workout_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Update streak
  perform public.update_fitness_streak(new.user_id);

  -- Accumulate total fitness XP on profile
  update public.profiles
  set total_fitness_xp = total_fitness_xp + new.xp_earned
  where id = new.user_id;

  -- Award loyalty points if not frozen
  if new.points_earned > 0 then
    insert into public.loyalty_events (user_id, delta, reason)
    select new.user_id, new.points_earned, 'fitness_workout'
    where not exists (
      select 1 from public.profiles
      where id = new.user_id and fitness_points_frozen = true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_workout_log_inserted on public.workout_logs;
create trigger on_workout_log_inserted
  after insert on public.workout_logs
  for each row execute procedure public.on_workout_inserted();


-- ── 25. PRESTIGE UPDATE FUNCTION ───────────────────────────
create or replace function public.record_prestige(p_user_id uuid, p_class_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prestige_count integer;
  v_class_name     text;
begin
  select name into v_class_name from public.fitness_classes where id = p_class_id;

  -- Increment prestige count
  update public.member_class_progress
  set prestige_count   = prestige_count + 1,
      current_level    = 1,
      current_xp       = 0,
      prestige_history = prestige_history || jsonb_build_object(
        'prestige_number', prestige_count + 1,
        'achieved_at', now(),
        'class', v_class_name
      ),
      updated_at       = now()
  where user_id = p_user_id and class_id = p_class_id
  returning prestige_count into v_prestige_count;

  -- Update profile total prestige
  update public.profiles
  set fitness_prestige_total = fitness_prestige_total + 1
  where id = p_user_id;

  -- Award prestige loyalty points
  if not exists (select 1 from public.profiles where id = p_user_id and fitness_points_frozen) then
    insert into public.loyalty_events (user_id, delta, reason)
    values (p_user_id, 500, 'fitness_prestige');
  end if;

  -- Award Viking bonus if applicable
  if exists (
    select 1
    from public.fitness_classes fc
    join public.member_fitness_profiles mfp on mfp.active_class_id = fc.id and mfp.user_id = p_user_id
    where fc.slug = 'viking' and fc.id = p_class_id
  ) then
    insert into public.loyalty_events (user_id, delta, reason)
    values (p_user_id, 10, 'fitness_viking_prestige_bonus');
  end if;
end;
$$;


-- ── 26. INDEXES FOR PERFORMANCE ──────────────────────────────
create index if not exists idx_member_class_progress_total_xp
  on public.member_class_progress(total_xp_earned desc);

create index if not exists idx_profiles_fitness_xp
  on public.profiles(total_fitness_xp desc);

create index if not exists idx_workout_logs_source
  on public.workout_logs(data_source);

create index if not exists idx_xp_events_dates
  on public.xp_events(start_date, end_date) where is_active = true;

-- ── Done ──────────────────────────────────────────────────────
-- Next: Run fitness-classes-seed.sql to populate the 10 RPG classes
-- Then: Run loyalty-tier-redesign.sql to update the tier system
