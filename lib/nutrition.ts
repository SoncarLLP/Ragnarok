// ── Types ──────────────────────────────────────────────────────

export interface NutrientData {
  // Macros (always shown)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  // Extended macros (shown by default)
  fibre?: number;
  sugar?: number;
  saturated_fat?: number;
  trans_fat?: number;
  polyunsaturated_fat?: number;
  monounsaturated_fat?: number;
  // Micros (hidden by default)
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  zinc?: number;
  phosphorus?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  vitamin_d?: number;
  vitamin_e?: number;
  vitamin_k?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b3?: number;
  vitamin_b6?: number;
  vitamin_b9?: number;
  vitamin_b12?: number;
  omega3?: number;
  omega6?: number;
  cholesterol?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  source: 'open_food_facts' | 'usda' | 'ragnarok' | 'custom';
  serving_size: number;
  serving_unit: string;
  nutrient_data: NutrientData;
  nutri_score?: string | null;
  allergens?: string[];
  image_url?: string | null;
  non_null_fields?: number;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  food_cache_id?: string;
  custom_food_id?: string;
  ragnarok_product_id?: string;
  meal_category: MealCategory;
  serving_quantity: number;
  serving_unit: string;
  serving_grams?: number;
  nutrient_data: NutrientData;
  food_name: string;
  food_brand?: string;
  logged_date: string;
  logged_at: string;
  data_source: string;
}

export interface NutritionGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  water_ml: number;
  custom_targets: Record<string, number>;
  goal_type: GoalType;
  class_split?: string;
}

export type MealCategory =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening_snack'
  | 'supplements';

export type GoalType =
  | 'lose_weight'
  | 'maintain'
  | 'gain_muscle'
  | 'improve_performance'
  | 'custom';

// ── Constants ─────────────────────────────────────────────────

export const MEAL_CATEGORIES: { key: MealCategory; label: string; emoji: string }[] = [
  { key: 'breakfast',      label: 'Breakfast',        emoji: '🌅' },
  { key: 'morning_snack',  label: 'Morning Snack',    emoji: '🍎' },
  { key: 'lunch',          label: 'Lunch',            emoji: '☀️' },
  { key: 'afternoon_snack',label: 'Afternoon Snack',  emoji: '🫐' },
  { key: 'dinner',         label: 'Dinner',           emoji: '🌙' },
  { key: 'evening_snack',  label: 'Evening Snack',    emoji: '🌛' },
  { key: 'supplements',    label: 'Supplements',      emoji: '💊' },
];

export const ALLERGENS = [
  'gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy',
  'fish', 'shellfish', 'sesame', 'celery', 'mustard',
  'sulphites', 'lupin', 'molluscs',
] as const;

export const DIETARY_PREFERENCES = [
  'vegan', 'vegetarian', 'pescatarian', 'halal', 'kosher',
  'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-FODMAP',
] as const;

export type Allergen = typeof ALLERGENS[number];
export type DietaryPreference = typeof DIETARY_PREFERENCES[number];

// ── Nutrient Definitions ──────────────────────────────────────

export type NutrientKey = keyof NutrientData;

export interface NutrientDef {
  key: NutrientKey;
  label: string;
  unit: string;
  category: 'macro' | 'extended_macro' | 'micro';
  defaultVisible: boolean;
}

export const NUTRIENTS: NutrientDef[] = [
  // Macros
  { key: 'calories',            label: 'Calories',           unit: 'kcal', category: 'macro',          defaultVisible: true },
  { key: 'protein',             label: 'Protein',            unit: 'g',    category: 'macro',          defaultVisible: true },
  { key: 'carbs',               label: 'Carbohydrates',      unit: 'g',    category: 'macro',          defaultVisible: true },
  { key: 'fat',                 label: 'Fat',                unit: 'g',    category: 'macro',          defaultVisible: true },
  // Extended macros
  { key: 'fibre',               label: 'Fibre',              unit: 'g',    category: 'extended_macro', defaultVisible: true },
  { key: 'sugar',               label: 'Sugar',              unit: 'g',    category: 'extended_macro', defaultVisible: true },
  { key: 'saturated_fat',       label: 'Saturated Fat',      unit: 'g',    category: 'extended_macro', defaultVisible: true },
  { key: 'trans_fat',           label: 'Trans Fat',          unit: 'g',    category: 'extended_macro', defaultVisible: true },
  { key: 'polyunsaturated_fat', label: 'Polyunsaturated Fat',unit: 'g',    category: 'extended_macro', defaultVisible: true },
  { key: 'monounsaturated_fat', label: 'Monounsaturated Fat',unit: 'g',    category: 'extended_macro', defaultVisible: true },
  // Micros
  { key: 'sodium',              label: 'Sodium',             unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'potassium',           label: 'Potassium',          unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'calcium',             label: 'Calcium',            unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'iron',                label: 'Iron',               unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'magnesium',           label: 'Magnesium',          unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'zinc',                label: 'Zinc',               unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'phosphorus',          label: 'Phosphorus',         unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_a',           label: 'Vitamin A',          unit: 'μg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_c',           label: 'Vitamin C',          unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_d',           label: 'Vitamin D',          unit: 'μg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_e',           label: 'Vitamin E',          unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_k',           label: 'Vitamin K',          unit: 'μg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_b1',          label: 'Vitamin B1 (Thiamin)',unit: 'mg',  category: 'micro',          defaultVisible: false },
  { key: 'vitamin_b2',          label: 'Vitamin B2 (Riboflavin)',unit: 'mg',category: 'micro',         defaultVisible: false },
  { key: 'vitamin_b3',          label: 'Vitamin B3 (Niacin)',unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_b6',          label: 'Vitamin B6',         unit: 'mg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_b9',          label: 'Vitamin B9 (Folate)',unit: 'μg',   category: 'micro',          defaultVisible: false },
  { key: 'vitamin_b12',         label: 'Vitamin B12',        unit: 'μg',   category: 'micro',          defaultVisible: false },
  { key: 'omega3',              label: 'Omega-3',            unit: 'g',    category: 'micro',          defaultVisible: false },
  { key: 'omega6',              label: 'Omega-6',            unit: 'g',    category: 'micro',          defaultVisible: false },
  { key: 'cholesterol',         label: 'Cholesterol',        unit: 'mg',   category: 'micro',          defaultVisible: false },
];

// ── RPG Class Macro Splits ────────────────────────────────────

export const CLASS_MACRO_SPLITS: Record<string, { protein: number; carbs: number; fat: number; description: string }> = {
  warrior:   { protein: 35, carbs: 40, fat: 25, description: 'High protein for strength — optimised for lifting and power' },
  ranger:    { protein: 25, carbs: 50, fat: 25, description: 'High carbs for endurance — optimised for cardio and distance' },
  mage:      { protein: 25, carbs: 40, fat: 35, description: 'Higher fat for recovery — optimised for flexibility and mental focus' },
  rogue:     { protein: 30, carbs: 45, fat: 25, description: 'High protein + carbs — optimised for HIIT performance' },
  paladin:   { protein: 30, carbs: 40, fat: 30, description: 'Balanced all-round nutrition — suits all training styles' },
  druid:     { protein: 25, carbs: 45, fat: 30, description: 'Plant-forward with good carbs — optimised for holistic wellness' },
  berserker: { protein: 35, carbs: 45, fat: 20, description: 'Max protein + carbs — for maximum training intensity' },
  monk:      { protein: 28, carbs: 42, fat: 30, description: 'Mindful balance — clean eating for body and mind' },
  shaman:    { protein: 32, carbs: 38, fat: 30, description: 'High protein with recovery fat — power and regeneration' },
  viking:    { protein: 35, carbs: 40, fat: 25, description: 'Warrior nutrition — fuelling the most powerful class' },
};

// ── Nutri-Score ───────────────────────────────────────────────

export const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: '#038141', text: '#ffffff', label: 'Excellent' },
  B: { bg: '#85BB2F', text: '#ffffff', label: 'Good' },
  C: { bg: '#FECB02', text: '#1a1a1a', label: 'Average' },
  D: { bg: '#EE8100', text: '#ffffff', label: 'Poor' },
  E: { bg: '#E63312', text: '#ffffff', label: 'Bad' },
};

// ── BMR / TDEE Calculations (Mifflin-St Jeor) ────────────────

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female' | 'other';
export type WeightGoal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'improve_performance';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: Gender
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // average for 'other'
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

export function calculateRecommendedGoals(
  tdee: number,
  weightKg: number,
  goal: WeightGoal,
  classSlug?: string
): NutritionGoals {
  let calories = tdee;
  if (goal === 'lose_weight')         calories = Math.round(tdee * 0.8);
  else if (goal === 'gain_muscle')    calories = Math.round(tdee * 1.1);

  const split = classSlug && CLASS_MACRO_SPLITS[classSlug]
    ? CLASS_MACRO_SPLITS[classSlug]
    : { protein: 30, carbs: 40, fat: 30 };

  const protein_g  = Math.round((calories * split.protein / 100) / 4);
  const carbs_g    = Math.round((calories * split.carbs / 100) / 4);
  const fat_g      = Math.round((calories * split.fat / 100) / 9);

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fibre_g: Math.round(calories / 1000 * 14), // ~14g per 1000kcal
    water_ml: Math.round(weightKg * 35),        // 35ml per kg body weight
    custom_targets: {},
    goal_type: goal as GoalType,
    class_split: classSlug,
  };
}

// ── Nutrient Scaling ─────────────────────────────────────────

/** Scale a nutrient_data object from `fromGrams` to `toGrams` */
export function scaleNutrients(nutrients: NutrientData, fromGrams: number, toGrams: number): NutrientData {
  if (fromGrams <= 0) return nutrients;
  const ratio = toGrams / fromGrams;
  const result: NutrientData = {};
  for (const key of Object.keys(nutrients) as NutrientKey[]) {
    const val = nutrients[key];
    if (val != null) (result as Record<string, number>)[key] = Math.round(val * ratio * 100) / 100;
  }
  return result;
}

/** Sum multiple NutrientData objects */
export function sumNutrients(items: NutrientData[]): NutrientData {
  const result: Record<string, number> = {};
  for (const item of items) {
    for (const [k, v] of Object.entries(item)) {
      if (v != null) result[k] = (result[k] ?? 0) + v;
    }
  }
  // Round to 1dp
  for (const k of Object.keys(result)) {
    result[k] = Math.round(result[k] * 10) / 10;
  }
  return result as NutrientData;
}

/** Count non-null nutrient fields (for source comparison) */
export function countNonNullFields(n: NutrientData): number {
  return Object.values(n).filter(v => v != null && v !== undefined).length;
}

// ── Progress Scoring ──────────────────────────────────────────

/** Returns 'green' | 'amber' | 'red' based on consumed vs target */
export function macroStatus(consumed: number, target: number): 'green' | 'amber' | 'red' {
  if (target <= 0) return 'green';
  const ratio = consumed / target;
  if (ratio >= 0.9 && ratio <= 1.15) return 'green';
  if (ratio >= 0.7 && ratio <= 1.3)  return 'amber';
  return 'red';
}

export function macroPercent(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((consumed / target) * 100));
}

// ── Open Food Facts Mapper ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOffProduct(product: Record<string, any>): Omit<FoodItem, 'id'> {
  const n = product.nutriments ?? {};
  const nutrients: NutrientData = {
    calories:             n['energy-kcal_100g'] ?? n['energy-kcal'] ?? undefined,
    protein:              n['proteins_100g'] ?? undefined,
    carbs:                n['carbohydrates_100g'] ?? undefined,
    fat:                  n['fat_100g'] ?? undefined,
    fibre:                n['fiber_100g'] ?? undefined,
    sugar:                n['sugars_100g'] ?? undefined,
    saturated_fat:        n['saturated-fat_100g'] ?? undefined,
    trans_fat:            n['trans-fat_100g'] ?? undefined,
    polyunsaturated_fat:  n['polyunsaturated-fat_100g'] ?? undefined,
    monounsaturated_fat:  n['monounsaturated-fat_100g'] ?? undefined,
    sodium:               n['sodium_100g'] != null ? Math.round(n['sodium_100g'] * 1000) : undefined,
    potassium:            n['potassium_100g'] != null ? Math.round(n['potassium_100g'] * 1000) : undefined,
    calcium:              n['calcium_100g'] != null ? Math.round(n['calcium_100g'] * 1000) : undefined,
    iron:                 n['iron_100g'] != null ? Math.round(n['iron_100g'] * 1000) : undefined,
    magnesium:            n['magnesium_100g'] != null ? Math.round(n['magnesium_100g'] * 1000) : undefined,
    zinc:                 n['zinc_100g'] != null ? Math.round(n['zinc_100g'] * 1000) : undefined,
    phosphorus:           n['phosphorus_100g'] != null ? Math.round(n['phosphorus_100g'] * 1000) : undefined,
    vitamin_a:            n['vitamin-a_100g'] != null ? Math.round(n['vitamin-a_100g'] * 1000000) : undefined,
    vitamin_c:            n['vitamin-c_100g'] != null ? Math.round(n['vitamin-c_100g'] * 1000) : undefined,
    vitamin_d:            n['vitamin-d_100g'] != null ? Math.round(n['vitamin-d_100g'] * 1000000) : undefined,
    vitamin_e:            n['vitamin-e_100g'] != null ? Math.round(n['vitamin-e_100g'] * 1000) : undefined,
    vitamin_k:            n['vitamin-k_100g'] != null ? Math.round(n['vitamin-k_100g'] * 1000000) : undefined,
    vitamin_b1:           n['vitamin-b1_100g'] != null ? Math.round(n['vitamin-b1_100g'] * 1000) : undefined,
    vitamin_b2:           n['vitamin-b2_100g'] != null ? Math.round(n['vitamin-b2_100g'] * 1000) : undefined,
    vitamin_b3:           n['vitamin-b3_100g'] != null ? Math.round(n['vitamin-b3_100g'] * 1000) : undefined,
    vitamin_b6:           n['vitamin-b6_100g'] != null ? Math.round(n['vitamin-b6_100g'] * 1000) : undefined,
    vitamin_b9:           n['folates_100g'] != null ? Math.round(n['folates_100g'] * 1000000) : undefined,
    vitamin_b12:          n['vitamin-b12_100g'] != null ? Math.round(n['vitamin-b12_100g'] * 1000000) : undefined,
    omega3:               n['omega-3-fat_100g'] ?? undefined,
    omega6:               n['omega-6-fat_100g'] ?? undefined,
    cholesterol:          n['cholesterol_100g'] != null ? Math.round(n['cholesterol_100g'] * 1000) : undefined,
  };
  // Remove undefined
  Object.keys(nutrients).forEach(k => {
    if ((nutrients as Record<string, unknown>)[k] === undefined) delete (nutrients as Record<string, unknown>)[k];
  });

  const allergenText = (product.allergens_tags ?? [])
    .map((a: string) => a.replace('en:', '').replace(/-/g, ' ')) as string[];

  return {
    name:          product.product_name ?? product.product_name_en ?? 'Unknown',
    brand:         product.brands ?? undefined,
    source:        'open_food_facts',
    serving_size:  product.serving_quantity ?? 100,
    serving_unit:  product.serving_quantity_unit ?? 'g',
    nutrient_data: nutrients,
    nutri_score:   product.nutriscore_grade?.toUpperCase() ?? null,
    allergens:     allergenText,
    image_url:     product.image_url ?? product.image_front_url ?? null,
    non_null_fields: countNonNullFields(nutrients),
  };
}

// ── USDA Mapper ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapUsdaFood(food: Record<string, any>): Omit<FoodItem, 'id'> {
  const nutsMap: Record<number, keyof NutrientData> = {
    1008: 'calories', 1003: 'protein', 1005: 'carbs', 1004: 'fat',
    1079: 'fibre', 2000: 'sugar', 1258: 'saturated_fat', 1257: 'trans_fat',
    1292: 'polyunsaturated_fat', 1293: 'monounsaturated_fat',
    1093: 'sodium', 1092: 'potassium', 1087: 'calcium', 1089: 'iron',
    1090: 'magnesium', 1095: 'zinc', 1091: 'phosphorus',
    1106: 'vitamin_a', 1162: 'vitamin_c', 1114: 'vitamin_d',
    1109: 'vitamin_e', 1185: 'vitamin_k', 1165: 'vitamin_b1',
    1166: 'vitamin_b2', 1167: 'vitamin_b3', 1175: 'vitamin_b6',
    1177: 'vitamin_b9', 1178: 'vitamin_b12',
    1316: 'omega3', 1269: 'omega6', 1253: 'cholesterol',
  };

  const nutrients: NutrientData = {};
  for (const fn of (food.foodNutrients ?? [])) {
    const key = nutsMap[fn.nutrientId ?? fn.nutrientNumber];
    if (key && fn.value != null) (nutrients as Record<string, number>)[key] = fn.value;
  }

  return {
    name:          food.description ?? 'Unknown',
    brand:         food.brandOwner ?? food.brandName ?? undefined,
    source:        'usda',
    serving_size:  food.servingSize ?? 100,
    serving_unit:  food.servingSizeUnit ?? 'g',
    nutrient_data: nutrients,
    nutri_score:   null,
    allergens:     [],
    image_url:     null,
    non_null_fields: countNonNullFields(nutrients),
  };
}

// ── Nutrition Points Constants ────────────────────────────────

export const NUTRITION_POINTS = {
  hit_calorie_target:  10,
  hit_protein_target:  15,
  hit_all_macros:      25,
  full_day_logged:     10,
  streak_7_day:        50,
  streak_30_day:       200,
  hit_water_target:    5,
  ragnarok_product:    25,
  recipe_per_10_likes: 10,
  custom_food_approved:50,
} as const;

// ── Loyalty Reason Labels (nutrition) ────────────────────────

export const NUTRITION_REASON_LABELS: Record<string, string> = {
  'nutrition_hit_calorie_target': 'Hit calorie target',
  'nutrition_hit_protein_target': 'Hit protein target',
  'nutrition_hit_all_macros':     'Perfect macro day',
  'nutrition_full_day_logged':    'Full day logged',
  'nutrition_streak_7_day':       '7-day nutrition streak',
  'nutrition_streak_30_day':      '30-day nutrition streak',
  'nutrition_hit_water_target':   'Hit water target',
  'nutrition_ragnarok_product':   'Ragnarök product logged',
  'nutrition_recipe_likes':       'Recipe liked milestone',
  'nutrition_custom_food_approved': 'Custom food approved',
  'nutrition_achievement':        'Nutrition achievement',
};
