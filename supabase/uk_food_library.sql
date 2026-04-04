-- ============================================================
-- RAGNARÖK — UK Food Library
-- Curated, verified nutritional data for common UK foods.
-- Run AFTER: nutrition-schema.sql
-- ============================================================

-- ── 1. Table ─────────────────────────────────────────────────
create table if not exists public.uk_food_library (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  name_aliases  text[] default '{}',   -- alternate names / synonyms for search
  brand         text,                   -- null = generic food
  category      text not null,          -- protein | carb | fat | vegetable | fruit | dairy | other
  subcategory   text,                   -- raw | cooked | boiled | grilled | baked | tinned | etc.
  serving_size  numeric not null default 100,
  serving_unit  text not null default 'g',
  nutrient_data jsonb not null default '{}',
  allergens     text[] default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_uk_food_library_name
  on public.uk_food_library using gin(to_tsvector('english', name));

create index if not exists idx_uk_food_library_name_trgm
  on public.uk_food_library using gin(name gin_trgm_ops);

create index if not exists idx_uk_food_library_active
  on public.uk_food_library(is_active) where is_active = true;

-- ── 2. RLS ───────────────────────────────────────────────────
alter table public.uk_food_library enable row level security;

-- All authenticated users can read active entries
create policy "uk_food_library_read"
  on public.uk_food_library for select to authenticated
  using (is_active = true);

-- Only super_admin can write
create policy "uk_food_library_admin_write"
  on public.uk_food_library for all to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  ))
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  ));

-- ── 3. Also add is_uk column to food_cache (if not exists) ───
-- Tracks whether a cached item came from a UK-targeted query
alter table public.food_cache
  add column if not exists is_uk boolean default false;

-- ── 4. Seed Data ─────────────────────────────────────────────
-- All nutrient_data values are per 100g unless noted.
-- Sources: McCance & Widdowson's Composition of Foods (UK),
--          NHS Eatwell data, USDA FoodData Central Foundation Foods.

insert into public.uk_food_library
  (name, name_aliases, category, subcategory, serving_size, serving_unit, nutrient_data, allergens)
values

-- ── PROTEINS — Chicken ───────────────────────────────────────
('Chicken Breast (Raw)',
  '{"chicken breast raw","raw chicken breast","breast of chicken"}',
  'protein', 'raw', 100, 'g',
  '{"calories":120,"protein":22.5,"carbs":0,"fat":2.6,"saturated_fat":0.7,"sodium":63,"potassium":370,"phosphorus":220,"vitamin_b3":11.4,"vitamin_b6":0.9,"vitamin_b12":0.3}',
  '{}'),

('Chicken Breast (Grilled)',
  '{"grilled chicken breast","cooked chicken breast","chicken breast cooked"}',
  'protein', 'grilled', 100, 'g',
  '{"calories":165,"protein":31,"carbs":0,"fat":3.6,"saturated_fat":1,"sodium":74,"potassium":440,"phosphorus":265,"vitamin_b3":13.7,"vitamin_b6":1,"vitamin_b12":0.4}',
  '{}'),

('Chicken Breast (Boiled)',
  '{"boiled chicken breast","poached chicken breast"}',
  'protein', 'boiled', 100, 'g',
  '{"calories":153,"protein":29.6,"carbs":0,"fat":3.0,"saturated_fat":0.8,"sodium":65,"potassium":410}',
  '{}'),

('Chicken Thigh (Raw)',
  '{"chicken thigh raw","raw chicken thigh"}',
  'protein', 'raw', 100, 'g',
  '{"calories":177,"protein":17.1,"carbs":0,"fat":12,"saturated_fat":3.4,"sodium":84,"potassium":280}',
  '{}'),

('Chicken Thigh (Cooked)',
  '{"cooked chicken thigh","grilled chicken thigh","baked chicken thigh"}',
  'protein', 'cooked', 100, 'g',
  '{"calories":209,"protein":26,"carbs":0,"fat":11.5,"saturated_fat":3.2,"sodium":93,"potassium":320}',
  '{}'),

-- ── PROTEINS — Beef ──────────────────────────────────────────
('Beef Mince 5% Fat (Raw)',
  '{"beef mince extra lean","extra lean mince","5% fat mince","lean minced beef"}',
  'protein', 'raw', 100, 'g',
  '{"calories":137,"protein":21.8,"carbs":0,"fat":5.5,"saturated_fat":2.2,"sodium":66,"potassium":345,"iron":2.2,"zinc":3.9,"vitamin_b12":2.0}',
  '{}'),

('Beef Mince 10% Fat (Raw)',
  '{"beef mince lean","lean mince","10% fat mince","minced beef lean"}',
  'protein', 'raw', 100, 'g',
  '{"calories":176,"protein":20.6,"carbs":0,"fat":10.5,"saturated_fat":4.4,"sodium":75,"potassium":310,"iron":2.0,"zinc":3.7,"vitamin_b12":1.8}',
  '{}'),

('Beef Mince 20% Fat (Raw)',
  '{"beef mince standard","mince","20% fat mince","minced beef","ground beef"}',
  'protein', 'raw', 100, 'g',
  '{"calories":249,"protein":18.7,"carbs":0,"fat":20,"saturated_fat":8.5,"sodium":70,"potassium":270,"iron":1.8,"zinc":3.4,"vitamin_b12":1.6}',
  '{}'),

-- ── PROTEINS — Fish ──────────────────────────────────────────
('Salmon Fillet (Raw)',
  '{"raw salmon","salmon fillet raw","fresh salmon"}',
  'protein', 'raw', 100, 'g',
  '{"calories":142,"protein":20,"carbs":0,"fat":6.3,"saturated_fat":1.1,"omega3":2.2,"sodium":59,"potassium":384,"vitamin_d":11,"vitamin_b12":3.2,"vitamin_b3":7.5}',
  '{"fish"}'),

('Salmon Fillet (Baked)',
  '{"baked salmon","cooked salmon","grilled salmon","salmon fillet cooked"}',
  'protein', 'baked', 100, 'g',
  '{"calories":206,"protein":28.8,"carbs":0,"fat":10,"saturated_fat":1.8,"omega3":3.5,"sodium":81,"potassium":490,"vitamin_d":14,"vitamin_b12":4.5}',
  '{"fish"}'),

('Tuna (Tinned in Water)',
  '{"tinned tuna water","canned tuna water","tuna in water","tuna water"}',
  'protein', 'tinned', 100, 'g',
  '{"calories":116,"protein":26,"carbs":0,"fat":0.6,"saturated_fat":0.2,"sodium":330,"potassium":240,"vitamin_b12":2.5,"vitamin_b3":13,"vitamin_d":4}',
  '{"fish"}'),

('Tuna (Tinned in Brine)',
  '{"tinned tuna brine","canned tuna brine","tuna in brine","tuna brine"}',
  'protein', 'tinned', 100, 'g',
  '{"calories":99,"protein":23.5,"carbs":0,"fat":0.5,"saturated_fat":0.2,"sodium":400,"potassium":210,"vitamin_b12":2.2}',
  '{"fish"}'),

('Cod Fillet (Raw)',
  '{"raw cod","fresh cod","cod raw"}',
  'protein', 'raw', 100, 'g',
  '{"calories":82,"protein":17.9,"carbs":0,"fat":0.7,"saturated_fat":0.1,"sodium":77,"potassium":392,"phosphorus":203,"vitamin_b12":1}',
  '{"fish"}'),

('Cod Fillet (Baked)',
  '{"baked cod","cooked cod","grilled cod"}',
  'protein', 'baked', 100, 'g',
  '{"calories":105,"protein":22.8,"carbs":0,"fat":1.2,"saturated_fat":0.2,"sodium":87,"potassium":420}',
  '{"fish"}'),

-- ── PROTEINS — Eggs & Dairy ──────────────────────────────────
('Egg (Whole, Raw)',
  '{"raw egg","whole egg","large egg raw","eggs raw"}',
  'protein', 'raw', 58, 'g',
  '{"calories":147,"protein":12.6,"carbs":0.7,"fat":10.6,"saturated_fat":3.3,"cholesterol":372,"sodium":142,"vitamin_a":149,"vitamin_d":2,"vitamin_b2":0.4,"vitamin_b12":1.3}',
  '{"eggs"}'),

('Egg (Hard Boiled)',
  '{"boiled egg","hard boiled egg","boiled eggs","hard-boiled egg"}',
  'protein', 'boiled', 50, 'g',
  '{"calories":155,"protein":13,"carbs":1.1,"fat":11,"saturated_fat":3.3,"cholesterol":373,"sodium":124,"vitamin_a":149,"vitamin_d":2,"vitamin_b12":1.1}',
  '{"eggs"}'),

('Greek Yoghurt (Full Fat)',
  '{"greek yogurt full fat","full fat greek yoghurt","strained yoghurt","full fat yoghurt"}',
  'dairy', 'raw', 100, 'g',
  '{"calories":97,"protein":9,"carbs":3.6,"fat":5,"saturated_fat":3.2,"sugar":3.2,"calcium":110,"sodium":50,"vitamin_b12":0.4}',
  '{"dairy"}'),

('Greek Yoghurt (0% Fat)',
  '{"greek yogurt 0%","fat free greek yoghurt","0% fat yoghurt","low fat greek yogurt"}',
  'dairy', 'raw', 100, 'g',
  '{"calories":59,"protein":10,"carbs":3.6,"fat":0.4,"saturated_fat":0.1,"sugar":3.2,"calcium":120,"sodium":50,"vitamin_b12":0.4}',
  '{"dairy"}'),

('Cottage Cheese',
  '{"cottage cheese plain","low fat cottage cheese"}',
  'dairy', 'raw', 100, 'g',
  '{"calories":98,"protein":11.1,"carbs":3.4,"fat":4.3,"saturated_fat":2.7,"sugar":2.7,"calcium":83,"sodium":364,"vitamin_b12":0.5}',
  '{"dairy"}'),

-- ── CARBOHYDRATES — Rice ──────────────────────────────────────
('White Rice (Raw)',
  '{"uncooked white rice","dry white rice","white rice uncooked"}',
  'carb', 'raw', 100, 'g',
  '{"calories":361,"protein":7.1,"carbs":79,"fat":0.6,"saturated_fat":0.1,"fibre":1.3,"sugar":0.1,"sodium":5}',
  '{}'),

('White Rice (Cooked)',
  '{"cooked white rice","boiled white rice","steamed white rice","rice cooked"}',
  'carb', 'cooked', 100, 'g',
  '{"calories":130,"protein":2.7,"carbs":28,"fat":0.3,"saturated_fat":0.1,"fibre":0.4,"sugar":0,"sodium":1}',
  '{}'),

('Brown Rice (Raw)',
  '{"uncooked brown rice","dry brown rice","wholegrain rice raw"}',
  'carb', 'raw', 100, 'g',
  '{"calories":362,"protein":7.5,"carbs":76,"fat":2.7,"saturated_fat":0.5,"fibre":3.5,"sugar":0.7,"sodium":2,"magnesium":143}',
  '{}'),

('Brown Rice (Cooked)',
  '{"cooked brown rice","boiled brown rice","steamed brown rice","wholegrain rice cooked"}',
  'carb', 'cooked', 100, 'g',
  '{"calories":112,"protein":2.3,"carbs":23.5,"fat":0.9,"saturated_fat":0.2,"fibre":1.8,"sugar":0.4,"sodium":1}',
  '{}'),

-- ── CARBOHYDRATES — Oats ─────────────────────────────────────
('Rolled Oats',
  '{"oats","oatmeal","porridge oats","rolled oats dry","jumbo oats","oat flakes"}',
  'carb', 'raw', 100, 'g',
  '{"calories":379,"protein":13.2,"carbs":67.7,"fat":7,"saturated_fat":1.3,"fibre":10.6,"sugar":1,"sodium":6,"magnesium":138,"iron":4.7,"zinc":4}',
  '{"gluten"}'),

-- ── CARBOHYDRATES — Bread ────────────────────────────────────
('White Bread',
  '{"white bread slice","white sliced bread","bread white"}',
  'carb', 'cooked', 30, 'g',
  '{"calories":260,"protein":9,"carbs":48,"fat":2.5,"saturated_fat":0.5,"fibre":2.5,"sugar":4,"sodium":450}',
  '{"gluten"}'),

('Wholemeal Bread',
  '{"wholemeal bread slice","wholegrain bread","whole wheat bread","brown bread"}',
  'carb', 'cooked', 30, 'g',
  '{"calories":240,"protein":10,"carbs":42.5,"fat":3,"saturated_fat":0.6,"fibre":6.5,"sugar":4,"sodium":420,"magnesium":76}',
  '{"gluten"}'),

-- ── CARBOHYDRATES — Pasta ────────────────────────────────────
('Pasta (Dry)',
  '{"dry pasta","uncooked pasta","pasta dried","spaghetti dry","penne dry"}',
  'carb', 'raw', 100, 'g',
  '{"calories":359,"protein":12.5,"carbs":73,"fat":1.5,"saturated_fat":0.3,"fibre":3.5,"sugar":2.2,"sodium":6}',
  '{"gluten"}'),

('Pasta (Cooked)',
  '{"cooked pasta","boiled pasta","spaghetti cooked","penne cooked"}',
  'carb', 'cooked', 100, 'g',
  '{"calories":160,"protein":5.8,"carbs":32,"fat":0.9,"saturated_fat":0.1,"fibre":1.8,"sugar":0.5,"sodium":1}',
  '{"gluten"}'),

-- ── CARBOHYDRATES — Potato & Sweet Potato ────────────────────
('Sweet Potato (Raw)',
  '{"sweet potato raw","yam","sweet potatoes raw"}',
  'carb', 'raw', 100, 'g',
  '{"calories":90,"protein":1.6,"carbs":20.7,"fat":0.1,"fibre":3,"sugar":4.2,"sodium":55,"potassium":475,"vitamin_a":961,"vitamin_c":2.4}',
  '{}'),

('Sweet Potato (Baked)',
  '{"baked sweet potato","roasted sweet potato","sweet potato cooked"}',
  'carb', 'baked', 100, 'g',
  '{"calories":103,"protein":2.3,"carbs":23.6,"fat":0.1,"fibre":3.8,"sugar":7.4,"sodium":36,"potassium":475,"vitamin_a":1096,"vitamin_c":2.5}',
  '{}'),

('White Potato (Raw)',
  '{"potato raw","raw potato","potatoes raw","new potato raw"}',
  'carb', 'raw', 100, 'g',
  '{"calories":80,"protein":1.7,"carbs":17,"fat":0.1,"fibre":2.1,"sugar":0.7,"sodium":6,"potassium":421,"vitamin_c":13}',
  '{}'),

('White Potato (Boiled)',
  '{"boiled potato","boiled potatoes","potato boiled","new potato boiled"}',
  'carb', 'boiled', 100, 'g',
  '{"calories":75,"protein":1.8,"carbs":17.2,"fat":0.1,"fibre":1.5,"sugar":0.7,"sodium":4,"potassium":330,"vitamin_c":6}',
  '{}'),

('White Potato (Baked)',
  '{"baked potato","jacket potato","baked jacket potato","potato baked"}',
  'carb', 'baked', 100, 'g',
  '{"calories":93,"protein":2.5,"carbs":21.7,"fat":0.1,"fibre":2.7,"sugar":1.3,"sodium":7,"potassium":535,"vitamin_c":7}',
  '{}'),

-- ── CARBOHYDRATES — Fruit ────────────────────────────────────
('Banana',
  '{"banana medium","bananas","ripe banana"}',
  'fruit', 'raw', 120, 'g',
  '{"calories":89,"protein":1.1,"carbs":23,"fat":0.3,"fibre":2.6,"sugar":12,"sodium":1,"potassium":358,"vitamin_c":8.7,"vitamin_b6":0.4}',
  '{}'),

('Apple',
  '{"apple medium","apples","eating apple","bramley apple"}',
  'fruit', 'raw', 182, 'g',
  '{"calories":52,"protein":0.3,"carbs":14,"fat":0.2,"fibre":2.4,"sugar":10,"sodium":1,"potassium":107,"vitamin_c":4.6}',
  '{}'),

('Orange',
  '{"orange medium","oranges","navel orange"}',
  'fruit', 'raw', 131, 'g',
  '{"calories":47,"protein":0.9,"carbs":12,"fat":0.1,"fibre":2.4,"sugar":9.4,"sodium":0,"potassium":181,"vitamin_c":53,"vitamin_b9":30}',
  '{}'),

-- ── FATS — Oils & Spreads ─────────────────────────────────────
('Olive Oil',
  '{"extra virgin olive oil","olive oil cooking"}',
  'fat', 'raw', 15, 'ml',
  '{"calories":884,"protein":0,"carbs":0,"fat":100,"saturated_fat":14,"monounsaturated_fat":73,"polyunsaturated_fat":10.5,"omega6":9.8,"vitamin_e":14,"vitamin_k":60}',
  '{}'),

('Butter (Unsalted)',
  '{"butter","unsalted butter","salted butter"}',
  'fat', 'raw', 10, 'g',
  '{"calories":717,"protein":0.6,"carbs":0.1,"fat":80,"saturated_fat":50.5,"monounsaturated_fat":21,"cholesterol":215,"sodium":11,"vitamin_a":684,"vitamin_d":1.5}',
  '{"dairy"}'),

('Avocado',
  '{"avocados","ripe avocado","hass avocado"}',
  'fat', 'raw', 100, 'g',
  '{"calories":160,"protein":2,"carbs":8.5,"fat":14.7,"saturated_fat":2.1,"monounsaturated_fat":9.8,"fibre":6.7,"sugar":0.7,"potassium":485,"vitamin_k":21,"vitamin_b9":81,"vitamin_c":10}',
  '{}'),

('Peanut Butter',
  '{"peanut butter smooth","peanut butter crunchy","natural peanut butter"}',
  'fat', 'raw', 30, 'g',
  '{"calories":588,"protein":24,"carbs":22,"fat":49,"saturated_fat":9,"monounsaturated_fat":24,"polyunsaturated_fat":14,"fibre":6,"sugar":6,"sodium":429}',
  '{"peanuts"}'),

-- ── FATS — Nuts ──────────────────────────────────────────────
('Almonds',
  '{"almond","almonds raw","whole almonds","flaked almonds"}',
  'fat', 'raw', 30, 'g',
  '{"calories":579,"protein":21,"carbs":21.7,"fat":49.9,"saturated_fat":3.8,"monounsaturated_fat":31.6,"fibre":12.5,"sugar":4.4,"calcium":264,"magnesium":270,"vitamin_e":25.6}',
  '{"nuts"}'),

('Cashews',
  '{"cashew nuts","cashews raw","whole cashews"}',
  'fat', 'raw', 30, 'g',
  '{"calories":553,"protein":18.2,"carbs":30.2,"fat":43.9,"saturated_fat":7.8,"monounsaturated_fat":23.8,"fibre":3.3,"sugar":5.9,"magnesium":292,"zinc":5.8}',
  '{"nuts"}'),

('Peanuts',
  '{"peanut","raw peanuts","roasted peanuts","groundnuts"}',
  'fat', 'raw', 30, 'g',
  '{"calories":567,"protein":25.8,"carbs":16.1,"fat":49.2,"saturated_fat":6.3,"monounsaturated_fat":24.4,"fibre":8.5,"sugar":4.7,"magnesium":168,"vitamin_e":8.3,"vitamin_b3":12}',
  '{"peanuts"}'),

-- ── VEGETABLES ───────────────────────────────────────────────
('Broccoli',
  '{"broccoli raw","broccoli florets","tenderstem broccoli","cooked broccoli"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":34,"protein":2.8,"carbs":6.6,"fat":0.4,"fibre":2.6,"sugar":1.7,"sodium":33,"potassium":316,"vitamin_c":89,"vitamin_k":102,"vitamin_b9":63,"calcium":47}',
  '{}'),

('Spinach',
  '{"spinach raw","baby spinach","spinach leaves","fresh spinach"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":23,"protein":2.9,"carbs":3.6,"fat":0.4,"fibre":2.2,"sugar":0.4,"sodium":79,"potassium":558,"vitamin_a":469,"vitamin_c":28,"vitamin_k":483,"iron":2.7,"calcium":99}',
  '{}'),

('Kale',
  '{"kale raw","curly kale","cavolo nero","black kale"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":35,"protein":2.9,"carbs":4.4,"fat":0.5,"fibre":3.6,"sugar":0.9,"sodium":38,"potassium":447,"vitamin_a":241,"vitamin_c":93,"vitamin_k":817,"calcium":150}',
  '{}'),

('Carrots',
  '{"carrot","carrots raw","baby carrots"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":41,"protein":0.9,"carbs":9.6,"fat":0.2,"fibre":2.8,"sugar":4.7,"sodium":69,"potassium":320,"vitamin_a":835,"vitamin_c":5.9,"vitamin_k":13}',
  '{}'),

('Red Pepper',
  '{"red bell pepper","pepper red","capsicum red","red capsicum"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":31,"protein":1,"carbs":6,"fat":0.3,"fibre":2.1,"sugar":4.2,"sodium":4,"potassium":211,"vitamin_c":128,"vitamin_a":157,"vitamin_b6":0.3}',
  '{}'),

('Onion',
  '{"onions","white onion","brown onion","red onion"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":40,"protein":1.1,"carbs":9.3,"fat":0.1,"fibre":1.7,"sugar":4.2,"sodium":4,"potassium":146,"vitamin_c":7.4}',
  '{}'),

('Cucumber',
  '{"cucumber raw","cucumbers"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":15,"protein":0.7,"carbs":3.6,"fat":0.1,"fibre":0.5,"sugar":1.7,"sodium":2,"potassium":147,"vitamin_c":2.8,"vitamin_k":16}',
  '{}'),

('Tomatoes',
  '{"tomato","cherry tomatoes","vine tomatoes","plum tomatoes"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":18,"protein":0.9,"carbs":3.9,"fat":0.2,"fibre":1.2,"sugar":2.6,"sodium":5,"potassium":237,"vitamin_c":14,"vitamin_a":42}',
  '{}'),

('Lettuce',
  '{"iceberg lettuce","romaine lettuce","little gem","mixed lettuce","salad leaves"}',
  'vegetable', 'raw', 100, 'g',
  '{"calories":15,"protein":1.4,"carbs":2.9,"fat":0.2,"fibre":1.3,"sugar":1.6,"sodium":10,"potassium":194,"vitamin_c":4,"vitamin_k":103,"vitamin_b9":38}',
  '{}')

on conflict do nothing;

-- ── Done ────────────────────────────────────────────────────────
-- uk_food_library table created with 50+ verified UK food entries.
-- food_cache.is_uk column added.
-- RLS: all authenticated users can read; super_admin can write.
