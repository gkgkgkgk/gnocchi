import { supabase } from '@/lib/supabase';

export interface Cookbook {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  recipe_count?: number;
  metadata?: {
    cover_color?: string;
  };
  cover_color?: string; // Helper field extracted from metadata
}

/**
 * Fetches all cookbooks for the current user
 */
export async function fetchCookbooks(): Promise<Cookbook[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('cookbooks')
    .select('*, recipe_count:cookbook_recipes(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cookbooks:', error);
    throw error;
  }

  // Transform the count data and extract cover_color from metadata
  return (data || []).map(cookbook => ({
    ...cookbook,
    recipe_count: cookbook.recipe_count?.[0]?.count || 0,
    cover_color: cookbook.metadata?.cover_color || '#4CAF50', // Extract for easy access
  }));
}

/**
 * Creates a new cookbook with selected recipes
 */
export async function createCookbook(
  name: string, 
  recipeIds: string[],
  description?: string,
  coverColor?: string
): Promise<Cookbook | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Create the cookbook
  const { data: cookbook, error: cookbookError } = await supabase
    .from('cookbooks')
    .insert({
      user_id: user.id,
      name: name,
      description: description,
      metadata: {
        cover_color: coverColor || getRandomCoverColor(),
      },
    })
    .select()
    .single();

  if (cookbookError) {
    console.error('Error creating cookbook:', cookbookError);
    throw cookbookError;
  }

  // Create cookbook_recipes relationships
  if (recipeIds.length > 0) {
    console.log('Creating cookbook_recipes relationships for cookbook:', cookbook.id);
    console.log('Recipe IDs:', recipeIds);
    
    const cookbookRecipes = recipeIds.map((recipeId, index) => ({
      cookbook_id: cookbook.id,
      recipe_id: recipeId,
      order: index,
    }));
    
    console.log('Cookbook recipes to insert:', cookbookRecipes);

    const { data: insertedRelations, error: relationsError } = await supabase
      .from('cookbook_recipes')
      .insert(cookbookRecipes)
      .select();

    if (relationsError) {
      console.error('Error creating cookbook recipes:', relationsError);
      throw relationsError; // Throw error so caller knows it failed
    }
    
    console.log('Successfully inserted cookbook_recipes:', insertedRelations);
  }

  return cookbook;
}

/**
 * Generates a random cover color for cookbooks
 */
function getRandomCoverColor(): string {
  const colors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#F44336', // Red
    '#00BCD4', // Cyan
    '#795548', // Brown
    '#607D8B', // Blue Grey
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Fetches a cookbook with its recipes
 */
export async function fetchCookbookRecipes(cookbookId: string): Promise<{ cookbook: Cookbook; recipes: any[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch the cookbook
  const { data: cookbook, error: cookbookError } = await supabase
    .from('cookbooks')
    .select('*')
    .eq('id', cookbookId)
    .eq('user_id', user.id)
    .single();

  if (cookbookError) {
    console.error('Error fetching cookbook:', cookbookError);
    throw cookbookError;
  }

  // Extract cover_color from metadata
  const enrichedCookbook = {
    ...cookbook,
    cover_color: cookbook.metadata?.cover_color || '#4CAF50',
  };

  // Fetch recipes in this cookbook with order
  const { data: cookbookRecipes, error: recipesError } = await supabase
    .from('cookbook_recipes')
    .select('recipe_id, order')
    .eq('cookbook_id', cookbookId)
    .order('order', { ascending: true });

  if (recipesError) {
    console.error('Error fetching cookbook recipes:', recipesError);
    throw recipesError;
  }

  // If no recipes, return empty array
  if (!cookbookRecipes || cookbookRecipes.length === 0) {
    return { cookbook: enrichedCookbook, recipes: [] };
  }

  // Fetch the actual recipe data
  const recipeIds = cookbookRecipes.map(cr => cr.recipe_id);
  const { data: recipes, error: recipeDataError } = await supabase
    .from('recipes')
    .select('*')
    .in('id', recipeIds);

  if (recipeDataError) {
    console.error('Error fetching recipe data:', recipeDataError);
    throw recipeDataError;
  }

  // Sort recipes by the order from cookbook_recipes
  const orderedRecipes = recipeIds
    .map(id => recipes?.find(r => r.id === id))
    .filter((r): r is any => r !== undefined);

  return { cookbook: enrichedCookbook, recipes: orderedRecipes };
}

/**
 * Updates a cookbook's name and recipes
 */
export async function updateCookbook(
  cookbookId: string,
  name: string,
  recipeIds: string[]
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Update cookbook name
  const { error: updateError } = await supabase
    .from('cookbooks')
    .update({ name: name })
    .eq('id', cookbookId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating cookbook:', updateError);
    throw updateError;
  }

  // Delete all existing cookbook_recipes relationships
  const { error: deleteError } = await supabase
    .from('cookbook_recipes')
    .delete()
    .eq('cookbook_id', cookbookId);

  if (deleteError) {
    console.error('Error deleting cookbook recipes:', deleteError);
    throw deleteError;
  }

  // Create new cookbook_recipes relationships with order
  if (recipeIds.length > 0) {
    const cookbookRecipes = recipeIds.map((recipeId, index) => ({
      cookbook_id: cookbookId,
      recipe_id: recipeId,
      order: index, // Preserve the order
    }));

    const { error: insertError } = await supabase
      .from('cookbook_recipes')
      .insert(cookbookRecipes);

    if (insertError) {
      console.error('Error inserting cookbook recipes:', insertError);
      throw insertError;
    }
  }
}

/**
 * Deletes a cookbook
 */
export async function deleteCookbook(id: string): Promise<void> {
  const { error } = await supabase
    .from('cookbooks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cookbook:', error);
    throw error;
  }
}
