-- ============================================================
-- RAGNARÖK FITNESS TRACKER — RPG Classes Seed Data
-- Run AFTER: fitness-schema.sql
-- ============================================================

insert into public.fitness_classes
  (name, slug, description, icon, primary_exercises, xp_bonus_multiplier, off_class_reduction, special_abilities, display_order)
values

-- Warrior
(
  'Warrior', 'warrior',
  'Masters of strength and power. Warriors forge their body through iron and discipline, specialising in powerlifting, strength training and resistance work. If you live for the squat rack and measure progress in plates, this is your path.',
  '🗡️',
  '["Squats","Deadlifts","Bench Press","Overhead Press","Barbell Rows","Weighted Carries","Romanian Deadlifts","Leg Press","Pull-ups","Dumbbell Press"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"strength","reduced_category":"cardio_only"}'::jsonb,
  1
),

-- Ranger
(
  'Ranger', 'ranger',
  'Relentless endurance athletes who conquer distance and time. Rangers thrive in the open, pushing cardiovascular limits through running, cycling, swimming and endurance challenges.',
  '🏹',
  '["Running","Cycling","Swimming","Rowing Machine","Hiking","Trail Running","Triathlon","Open Water Swimming","Stair Climbing","Nordic Walking"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"cardio","reduced_category":"strength_only"}'::jsonb,
  2
),

-- Mage
(
  'Mage', 'mage',
  'Masters of the mind-body connection. Mages pursue flexibility, mobility and mindful movement, unlocking the body''s full range of motion through yoga, stretching and recovery work.',
  '🔮',
  '["Yoga","Pilates","Stretching","Mobility Work","Foam Rolling","Breathwork","Yin Yoga","Active Recovery","Balance Training","Tai Chi"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"flexibility","reduced_category":"high_intensity"}'::jsonb,
  3
),

-- Rogue
(
  'Rogue', 'rogue',
  'Fast, explosive and unpredictable. Rogues thrive in high intensity environments, burning maximum calories in minimum time through HIIT, circuit training and interval work.',
  '🗝️',
  '["HIIT","Circuit Training","Tabata","Interval Running","Jump Training","Battle Ropes","Plyometrics","Burpees","Jump Rope","Box Jumps"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"hiit","reduced_category":"steady_state"}'::jsonb,
  4
),

-- Paladin
(
  'Paladin', 'paladin',
  'The all-round champion. Paladins pursue complete physical fitness across all disciplines — strength, cardio, flexibility and endurance. No weakness, no gaps.',
  '⚔️',
  '["All Exercises","Strength Training","Cardio","Yoga","HIIT","Cycling","Swimming","Weightlifting","Running","Flexibility Work"]'::jsonb,
  1.2,
  1.0,
  '{"bonus_category":"all","no_reduction_penalty":true,"balanced_bonus":true}'::jsonb,
  5
),

-- Druid
(
  'Druid', 'druid',
  'Connected to the natural world, Druids pursue fitness through outdoor activities, functional movement and nature-based challenges. Hiking, outdoor sports and bodyweight training in the open air.',
  '🌿',
  '["Hiking","Trail Running","Outdoor Swimming","Rock Climbing","Kayaking","Bodyweight Outdoor Training","Forest Running","Stand-Up Paddleboarding","Outdoor Yoga","Mountain Biking"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"outdoor","reduced_category":"gym_machine"}'::jsonb,
  6
),

-- Berserker
(
  'Berserker', 'berserker',
  'Fearless and ferocious. Berserkers embrace extreme training — CrossFit, functional fitness, Olympic lifting and pushing beyond every limit. Not for the faint hearted.',
  '🔥',
  '["CrossFit WODs","Olympic Lifting","Functional Fitness","Kettlebells","Strongman Training","Power Cleans","Snatches","Thrusters","Wall Balls","Muscle-ups"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"crossfit","reduced_category":"steady_state_cardio"}'::jsonb,
  7
),

-- Monk
(
  'Monk', 'monk',
  'Disciplined masters of body and mind. Monks combine martial arts, calisthenics and meditation to achieve perfect control, strength and focus through movement.',
  '🥋',
  '["Martial Arts","Calisthenics","Bodyweight Training","Gymnastics","Meditation","Breathwork","Boxing","Jiu-Jitsu","Capoeira","Handstand Training"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"martial_arts","reduced_category":"weighted_machine"}'::jsonb,
  8
),

-- Shaman
(
  'Shaman', 'shaman',
  'Channelling the power of the elements, Shamans combine explosive power with recovery and mindfulness. A hybrid class for those who train hard and recover harder.',
  '⚡',
  '["Plyometrics","Power Training","Recovery Sessions","Cold Exposure","Sauna","Active Recovery","Explosive Jumps","Power Snatches","Ice Baths","Heat Training"]'::jsonb,
  1.5,
  0.6,
  '{"bonus_category":"power_recovery","reduced_category":"pure_endurance"}'::jsonb,
  9
),

-- Viking
(
  'Viking', 'viking',
  'The ultimate Ragnarök class. Vikings combine raw strength with endurance and warrior spirit. Rowing, strongman, combat sports and brutal conditioning — this is the class of legends.',
  '🪓',
  '["Rowing","Strongman Events","Combat Sports","Obstacle Courses","Rucking","Axe Throwing","Log Carry","Tyre Flips","Sled Pulls","Farmer''s Walk"]'::jsonb,
  1.6,
  0.7,
  '{"bonus_category":"viking_activities","reduced_category":"off_class","xp_bonus_rate":0.6,"off_class_penalty":0.3,"viking_level_up_loyalty_bonus":10}'::jsonb,
  10
)

on conflict (slug) do update set
  description         = excluded.description,
  primary_exercises   = excluded.primary_exercises,
  xp_bonus_multiplier = excluded.xp_bonus_multiplier,
  off_class_reduction = excluded.off_class_reduction,
  special_abilities   = excluded.special_abilities;


-- ── Exercise Library Seed ────────────────────────────────────
insert into public.exercises
  (name, category, class_tags, description, muscle_groups, equipment, approved)
values
-- Strength
('Barbell Back Squat', 'strength', ARRAY['warrior','berserker','viking'], 'Classic compound lower body movement', ARRAY['quads','glutes','hamstrings','core'], 'barbell', true),
('Deadlift', 'strength', ARRAY['warrior','berserker','viking'], 'The king of compound lifts', ARRAY['hamstrings','glutes','back','traps'], 'barbell', true),
('Bench Press', 'strength', ARRAY['warrior','berserker'], 'Horizontal pushing movement', ARRAY['chest','triceps','shoulders'], 'barbell', true),
('Overhead Press', 'strength', ARRAY['warrior','berserker','viking'], 'Vertical pressing movement', ARRAY['shoulders','triceps','core'], 'barbell', true),
('Barbell Row', 'strength', ARRAY['warrior'], 'Horizontal pulling movement', ARRAY['back','biceps','rear_delts'], 'barbell', true),
('Pull-up', 'strength', ARRAY['warrior','monk','berserker'], 'Bodyweight vertical pulling', ARRAY['back','biceps'], 'bodyweight', true),
('Dip', 'strength', ARRAY['warrior','monk'], 'Bodyweight pushing movement', ARRAY['chest','triceps','shoulders'], 'bodyweight', true),
('Romanian Deadlift', 'strength', ARRAY['warrior'], 'Hip hinge movement', ARRAY['hamstrings','glutes','lower_back'], 'barbell', true),
('Leg Press', 'strength', ARRAY['warrior'], 'Machine quad dominant push', ARRAY['quads','glutes'], 'machine', true),
('Weighted Carry (Farmers Walk)', 'strength', ARRAY['warrior','viking'], 'Loaded carry for grip and core', ARRAY['forearms','traps','core'], 'dumbbells', true),

-- Cardio
('Running', 'cardio', ARRAY['ranger','rogue','druid'], 'Outdoor or treadmill running', ARRAY['legs','cardiovascular'], 'none', true),
('Cycling (Outdoor)', 'cardio', ARRAY['ranger','druid'], 'Outdoor road or mountain biking', ARRAY['legs','cardiovascular'], 'bicycle', true),
('Cycling (Indoor)', 'cardio', ARRAY['ranger'], 'Stationary or spin bike', ARRAY['legs','cardiovascular'], 'bike', true),
('Swimming', 'cardio', ARRAY['ranger','druid'], 'Pool or open water swimming', ARRAY['full_body','cardiovascular'], 'none', true),
('Rowing Machine', 'cardio', ARRAY['ranger','viking'], 'Ergometer rowing session', ARRAY['back','legs','arms','cardiovascular'], 'machine', true),
('Hiking', 'cardio', ARRAY['ranger','druid'], 'Trail or hill hiking', ARRAY['legs','cardiovascular'], 'none', true),
('Trail Running', 'cardio', ARRAY['ranger','druid'], 'Off-road running on trails', ARRAY['legs','cardiovascular','core'], 'none', true),
('Jump Rope', 'cardio', ARRAY['rogue','monk'], 'Skipping rope cardio', ARRAY['legs','cardiovascular'], 'jump_rope', true),
('Stair Climbing', 'cardio', ARRAY['ranger'], 'Stairmaster or actual stairs', ARRAY['legs','glutes','cardiovascular'], 'machine', true),

-- Flexibility/Mobility
('Yoga Flow', 'flexibility', ARRAY['mage','druid'], 'Dynamic yoga sequence', ARRAY['full_body','flexibility'], 'mat', true),
('Yin Yoga', 'flexibility', ARRAY['mage'], 'Passive long-hold stretching', ARRAY['hips','spine','flexibility'], 'mat', true),
('Pilates', 'flexibility', ARRAY['mage'], 'Core-focused movement practice', ARRAY['core','flexibility'], 'mat', true),
('Foam Rolling', 'flexibility', ARRAY['mage','shaman'], 'Self-myofascial release', ARRAY['full_body'], 'foam_roller', true),
('Stretching Session', 'flexibility', ARRAY['mage','shaman'], 'Static or dynamic stretching', ARRAY['full_body','flexibility'], 'none', true),
('Breathwork', 'flexibility', ARRAY['mage','monk','shaman'], 'Controlled breathing practice', ARRAY['respiratory','nervous_system'], 'none', true),
('Mobility Work', 'flexibility', ARRAY['mage','shaman'], 'Joint mobility and movement prep', ARRAY['joints','flexibility'], 'none', true),

-- HIIT/Circuit
('HIIT Session', 'hiit', ARRAY['rogue','berserker'], 'High intensity interval training', ARRAY['full_body','cardiovascular'], 'varies', true),
('Circuit Training', 'hiit', ARRAY['rogue','berserker'], 'Multi-exercise circuit', ARRAY['full_body'], 'varies', true),
('Tabata', 'hiit', ARRAY['rogue'], '20 sec on / 10 sec off protocol', ARRAY['full_body','cardiovascular'], 'varies', true),
('Battle Ropes', 'hiit', ARRAY['rogue','viking','berserker'], 'Rope slam and wave exercises', ARRAY['shoulders','arms','core','cardiovascular'], 'battle_ropes', true),
('Box Jumps', 'hiit', ARRAY['rogue','shaman','berserker'], 'Plyometric jumping onto box', ARRAY['legs','glutes'], 'plyo_box', true),
('Burpees', 'hiit', ARRAY['rogue','berserker'], 'Full body conditioning movement', ARRAY['full_body','cardiovascular'], 'none', true),

-- Outdoor/Functional
('Rock Climbing', 'outdoor', ARRAY['druid','monk'], 'Indoor or outdoor climbing', ARRAY['back','arms','core','legs'], 'none', true),
('Kayaking', 'outdoor', ARRAY['druid','viking'], 'Paddle sport on water', ARRAY['arms','core','back'], 'kayak', true),
('Open Water Swimming', 'outdoor', ARRAY['druid','ranger'], 'Swimming in natural water', ARRAY['full_body','cardiovascular'], 'none', true),
('Rucking', 'outdoor', ARRAY['viking','ranger'], 'Hiking with weighted pack', ARRAY['legs','core','cardiovascular'], 'rucksack', true),
('Obstacle Course', 'outdoor', ARRAY['viking','berserker'], 'OCR or obstacle training', ARRAY['full_body'], 'varies', true),

-- CrossFit/Olympic
('CrossFit WOD', 'functional', ARRAY['berserker'], 'CrossFit workout of the day', ARRAY['full_body'], 'varies', true),
('Power Clean', 'functional', ARRAY['berserker','viking','shaman'], 'Olympic weightlifting pull', ARRAY['full_body','power'], 'barbell', true),
('Snatch', 'functional', ARRAY['berserker','shaman'], 'Full Olympic lift', ARRAY['full_body','power'], 'barbell', true),
('Kettlebell Swings', 'functional', ARRAY['berserker','viking'], 'Hip hinge power movement', ARRAY['glutes','hamstrings','core'], 'kettlebell', true),
('Tire Flip', 'functional', ARRAY['viking','berserker'], 'Strongman tire flipping', ARRAY['full_body','power'], 'tire', true),
('Sled Push/Pull', 'functional', ARRAY['viking','berserker','warrior'], 'Loaded sled conditioning', ARRAY['legs','core','cardiovascular'], 'sled', true),

-- Martial Arts/Calisthenics
('Boxing', 'martial_arts', ARRAY['monk','rogue'], 'Striking and bag work', ARRAY['arms','core','cardiovascular'], 'gloves', true),
('Brazilian Jiu-Jitsu', 'martial_arts', ARRAY['monk'], 'Ground-based grappling', ARRAY['full_body','flexibility'], 'gi', true),
('Muay Thai', 'martial_arts', ARRAY['monk','rogue'], 'Thai kickboxing', ARRAY['full_body','cardiovascular'], 'gloves', true),
('Handstand Training', 'martial_arts', ARRAY['monk'], 'Gymnastic balance skill', ARRAY['shoulders','core'], 'none', true),
('Muscle-up', 'martial_arts', ARRAY['monk','berserker'], 'Advanced pull/push combination', ARRAY['back','chest','triceps'], 'bar', true),
('Pistol Squats', 'martial_arts', ARRAY['monk','warrior'], 'Single leg bodyweight squat', ARRAY['quads','glutes','balance'], 'none', true),

-- Recovery/Power
('Cold Exposure/Ice Bath', 'recovery', ARRAY['shaman','viking'], 'Cold therapy recovery', ARRAY['nervous_system','recovery'], 'none', true),
('Sauna Session', 'recovery', ARRAY['shaman'], 'Heat therapy recovery', ARRAY['cardiovascular','recovery'], 'sauna', true),
('Active Recovery Walk', 'recovery', ARRAY['shaman','mage'], 'Low intensity movement', ARRAY['legs','cardiovascular'], 'none', true),
('Power Plyometrics', 'recovery', ARRAY['shaman','rogue'], 'Explosive power training', ARRAY['legs','power'], 'none', true),
('Strongman Medley', 'functional', ARRAY['viking'], 'Multi-event strongman training', ARRAY['full_body','power'], 'varies', true),
('Axe Throwing', 'outdoor', ARRAY['viking'], 'Viking skill training', ARRAY['arms','core'], 'axe', true)

on conflict do nothing;


-- ── Fitness Achievements Seed ────────────────────────────────
insert into public.fitness_achievements
  (name, description, icon, category, requirement_type, requirement_value, xp_reward, points_reward)
values
('First Warrior Step',    'Log your very first workout',                  '🏋️', 'milestone', 'total_workouts',    1,    50,  10),
('Iron Will',             'Log 10 workouts',                              '💪', 'milestone', 'total_workouts',   10,   100,  20),
('Hundred Club',          'Log 100 total workouts',                       '💯', 'milestone', 'total_workouts',  100,   500, 100),
('Week Warrior',          'Maintain a 7-day workout streak',              '🔥', 'streak',    'streak_days',       7,   150,  25),
('Month of Strength',     'Maintain a 30-day workout streak',             '📅', 'streak',    'streak_days',      30,   500, 100),
('100-Day Legend',        'Maintain a 100-day workout streak',            '⚡', 'streak',    'streak_days',     100,  2000, 500),
('First PR',              'Beat a personal record',                       '🏆', 'pr',        'total_prs',         1,    75,  15),
('Record Breaker',        'Beat 10 personal records',                     '🥇', 'pr',        'total_prs',        10,   200,  50),
('Level 10',              'Reach Level 10 in any class',                  '⭐', 'class',     'level',            10,   200,  50),
('Level 25',              'Reach Level 25 in any class',                  '🌟', 'class',     'level',            25,   500, 100),
('Level 50',              'Reach the maximum Level 50 in any class',      '👑', 'class',     'level',            50,  2000, 500),
('First Prestige',        'Prestige a class for the first time',          '⭐', 'prestige',  'prestige_count',    1,  1000, 500),
('Prestige Master',       'Achieve 5 total prestiges',                    '🌠', 'prestige',  'prestige_count',    5,  5000,1000),
('Challenge Champion',    'Complete your first challenge',                '🎯', 'challenge', 'challenges_done',   1,   100,  25),
('Guild Brother',         'Join a guild',                                 '🛡️', 'guild',     'guild_joined',      1,    50,  10),
('1000 XP Club',          'Earn 1000 total fitness XP',                   '🎮', 'milestone', 'total_xp',       1000,   100,  20),
('10000 XP Elite',        'Earn 10000 total fitness XP',                  '💎', 'milestone', 'total_xp',      10000,  1000, 200),
('Viking Born',           'Choose the Viking class',                      '🪓', 'class',     'class_chosen',      1,    75,  15),
('All-Class Explorer',    'Try 3 different classes',                      '🗺️', 'milestone', 'classes_tried',     3,   250,  50),
('Body Tracker',          'Log 10 body measurements',                     '📊', 'milestone', 'body_logs',        10,   100,  25)

on conflict (name) do nothing;
