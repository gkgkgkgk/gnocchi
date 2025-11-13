import { supabase } from '@/lib/supabase';

export interface DayPlanData {
  date: string; // ISO date string (YYYY-MM-DD)
  recipes: string[]; // Array of recipe IDs
}

export interface ShoppingListIngredient {
  name: string;
  sources: string[]; // Recipe titles
  checked: boolean;
}

export interface MealPlanStructure {
  plan: DayPlanData[]; // Array of day objects with dates and recipe IDs
  shortList: string[]; // Recipe IDs not assigned to a day
  shoppingList: ShoppingListIngredient[];
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan: MealPlanStructure;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetches the current user's meal plan
 */
export async function fetchMealPlan(userId: string): Promise<MealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No meal plan exists yet
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Creates a new meal plan for the user
 */
export async function createMealPlan(
  userId: string,
  plan: MealPlanStructure
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: userId,
      plan: plan,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing meal plan
 */
export async function updateMealPlan(
  mealPlanId: string,
  plan: MealPlanStructure
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .update({
      plan: plan,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mealPlanId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Saves or updates a meal plan (convenience function)
 * Uses upsert to handle both create and update cases
 */
export async function saveMealPlan(
  userId: string,
  plan: MealPlanStructure,
  existingMealPlanId?: string
): Promise<MealPlan> {
  // Use upsert to either insert or update based on user_id
  const { data, error } = await supabase
    .from('meal_plans')
    .upsert({
      user_id: userId,
      plan: plan,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id' // Conflict on user_id (primary key)
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
