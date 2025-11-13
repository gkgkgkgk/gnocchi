import { supabase } from '@/lib/supabase';

export interface Unit {
  id: string;
  abbreviation: string;
  name?: string;
}

/**
 * Fetches all units from the database
 */
export async function fetchUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('abbreviation');

  if (error) {
    console.error('Error fetching units:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches a single unit by ID
 */
export async function fetchUnitById(id: string): Promise<Unit | null> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching unit:', error);
    return null;
  }

  return data;
}

/**
 * Fetches multiple units by their IDs
 */
export async function fetchUnitsByIds(ids: string[]): Promise<Unit[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('units')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error fetching units:', error);
    return [];
  }

  return data || [];
}
