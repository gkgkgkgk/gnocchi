import { api } from '@/lib/api';

export interface DayPlanData {
  date: string; // YYYY-MM-DD
  recipes: string[]; // recipe UUIDs
}

export interface ShoppingListIngredient {
  name: string;
  sources: string[];
  checked: boolean;
}

export interface MealPlanStructure {
  plan: DayPlanData[];
  short_list: string[];
  shopping_list: ShoppingListIngredient[];
}

/**
 * The meal plan is a household singleton. GET returns the current plan
 * (or a blank one on first call); PUT replaces it. No IDs, no users.
 */
export async function fetchMealPlan(): Promise<MealPlanStructure> {
  return api.get<MealPlanStructure>('/meal-plan');
}

export async function saveMealPlan(plan: MealPlanStructure): Promise<MealPlanStructure> {
  return api.put<MealPlanStructure>('/meal-plan', plan);
}
