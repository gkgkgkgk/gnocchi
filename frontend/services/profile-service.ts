import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  display_name?: string;
  profile_config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Checks if the current user has a profile
 */
export async function checkUserProfile(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking profile:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking profile:', error);
    return false;
  }
}

/**
 * Creates a profile for the current user
 * Separates display_name from other answers which go into profile_config
 */
export async function createUserProfile(answers: Record<string, any> = {}): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Extract display_name from answers
    const { display_name, ...otherAnswers } = answers;

    // Build profile_config from remaining answers (keep original IDs as keys)
    const profileConfig: Record<string, any> = otherAnswers;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: display_name || 'Chef',
        profile_config: profileConfig,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    return null;
  }
}

/**
 * Gets the current user's profile
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/**
 * Updates the user's profile config
 */
export async function updateProfileConfig(config: Record<string, any>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ profile_config: config })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile config:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating profile config:', error);
    return false;
  }
}

// UUID generation utility
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Tag interface
export interface RecipeTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// Default tags that every user gets
export const DEFAULT_TAGS: RecipeTag[] = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Quick', color: '#FF9800', icon: 'flash' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Healthy', color: '#4CAF50', icon: 'leaf' },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Comfort Food', color: '#F44336', icon: 'heart' },
  { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Vegetarian', color: '#8BC34A', icon: 'nutrition' },
  { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Dessert', color: '#E91E63', icon: 'ice-cream' },
  { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Spicy', color: '#FF5722', icon: 'flame' },
];

/**
 * Gets user's tags from profile config, initializing with defaults if needed
 */
export async function getUserTags(): Promise<RecipeTag[]> {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return DEFAULT_TAGS;
    }

    // Check if tags exist in profile_config
    if (profile.profile_config?.tags && Array.isArray(profile.profile_config.tags)) {
      return profile.profile_config.tags;
    }

    // If no tags, initialize with defaults
    const updatedConfig = {
      ...profile.profile_config,
      tags: DEFAULT_TAGS,
    };

    await updateProfileConfig(updatedConfig);
    return DEFAULT_TAGS;
  } catch (error) {
    console.error('Error getting user tags:', error);
    return DEFAULT_TAGS;
  }
}

/**
 * Saves user's tags to profile config
 */
export async function saveUserTags(tags: RecipeTag[]): Promise<boolean> {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return false;
    }

    const updatedConfig = {
      ...profile.profile_config,
      tags,
    };

    return await updateProfileConfig(updatedConfig);
  } catch (error) {
    console.error('Error saving user tags:', error);
    return false;
  }
}

/**
 * Gets user's dietary restrictions from profile config
 */
export async function getDietaryRestrictions(): Promise<string[]> {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return [];
    }

    // Check if dietary restrictions exist in profile_config
    if (profile.profile_config?.dietary_restrictions && Array.isArray(profile.profile_config.dietary_restrictions)) {
      return profile.profile_config.dietary_restrictions;
    }

    return [];
  } catch (error) {
    console.error('Error getting dietary restrictions:', error);
    return [];
  }
}

/**
 * Saves user's dietary restrictions to profile config
 */
export async function saveDietaryRestrictions(restrictions: string[]): Promise<boolean> {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return false;
    }

    const updatedConfig = {
      ...profile.profile_config,
      dietary_restrictions: restrictions,
    };

    return await updateProfileConfig(updatedConfig);
  } catch (error) {
    console.error('Error saving dietary restrictions:', error);
    return false;
  }
}

/**
 * Gets user's favorite food from profile config
 */
export async function getFavoriteFood(): Promise<string | null> {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return null;
    }

    return profile.profile_config?.favorite_food || null;
  } catch (error) {
    console.error('Error getting favorite food:', error);
    return null;
  }
}

/**
 * Saves user's favorite food to profile config
 */
export async function saveFavoriteFood(food: string): Promise<boolean> {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return false;
    }

    const updatedConfig = {
      ...profile.profile_config,
      favorite_food: food,
    };

    return await updateProfileConfig(updatedConfig);
  } catch (error) {
    console.error('Error saving favorite food:', error);
    return false;
  }
}
