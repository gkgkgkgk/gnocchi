import { supabase } from '@/lib/supabase';

export interface Ingredient {
  id: string;
  name: string;
}

/**
 * Fetches all ingredients from the database
 */
export async function fetchIngredients(): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching ingredients:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches a single ingredient by ID
 */
export async function fetchIngredientById(id: string): Promise<Ingredient | null> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching ingredient:', error);
    return null;
  }

  return data;
}

/**
 * Fetches multiple ingredients by their IDs
 */
export async function fetchIngredientsByIds(ids: string[]): Promise<Ingredient[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error fetching ingredients:', error);
    return [];
  }

  return data || [];
}

/**
 * Creates a new ingredient in the database
 */
export async function createIngredient(name: string): Promise<Ingredient | null> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error('Error creating ingredient:', error);
    return null;
  }

  return data;
}
