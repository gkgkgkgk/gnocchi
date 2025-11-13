import { supabase } from '@/lib/supabase';
import { parseIngredient } from '@/utils/ingredient-parser';
import { API_ENDPOINTS } from '@/config/api';
import { fetchAITools, AITool } from './ai-tools-service';
import { fetchUnits, Unit } from './unit-service';

export interface RecipeIngredient {
  text: string;  // Raw ingredient text as written
  id?: string;  // Optional ingredient ID for linking to ingredients table
  ingredient_id?: string;  // Alias for id (for backward compatibility)
  quantity: number;
  unit_id?: string;
  ingredient?: {
    id: string;
    name: string;
  };
  unit?: {
    id: string;
    name: string;
    abbreviation: string;
  };
}

export interface AIInsight {
  text: string;
  suggested_tool: string | null;
}

export interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  image_url?: string;
  prepTime?: number;
  prep_time?: number;
  cookTime?: number;
  cook_time?: number;
  servings?: number;
  userId?: string;
  user_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  ingredients?: RecipeIngredient[];
  steps?: string[];
  annotated_steps?: string[];
  ai_insight?: AIInsight;
  images?: string[]; // Array of image URLs, chosen image is in image_url
  metadata?: {
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  };
}

/**
 * Fetches all recipes from the database
 */
export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches a single recipe by ID with ingredients
 */
export async function fetchRecipeById(id: string): Promise<Recipe | null> {
  // Get the recipe with ingredients JSONB column
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

  if (recipeError) {
    console.error('Error fetching recipe:', recipeError);
    throw recipeError;
  }

  if (!recipe) {
    return null;
  }

  // If there are ingredients in JSONB format, enrich them with data from the tables
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    const ingredientIds = recipe.ingredients
      .map((item: any) => item.id || item.ingredient_id)
      .filter(Boolean);
    
    const unitIds = recipe.ingredients
      .map((item: any) => item.unit)
      .filter(Boolean);

    // Fetch ingredient details
    const { data: ingredientsData } = await supabase
      .from('ingredients')
      .select('id, name')
      .in('id', ingredientIds);

    // Fetch unit details
    const { data: unitsData } = await supabase
      .from('units')
      .select('id, name, abbreviation')
      .in('id', unitIds);


    // Create lookup maps
    const ingredientsMap = new Map(ingredientsData?.map(i => [i.id, i]) || []);
    const unitsMap = new Map(unitsData?.map(u => [u.id, u]) || []);

    // Enrich the ingredients with their names and units
    const enrichedIngredients = recipe.ingredients.map((item: any) => ({
      text: item.text || '',  // Include raw ingredient text
      id: item.id || item.ingredient_id,
      ingredient_id: item.id || item.ingredient_id,
      quantity: item.quantity,
      unit_id: item.unit,
      ingredient: ingredientsMap.get(item.id || item.ingredient_id),
      unit: item.unit ? unitsMap.get(item.unit) : undefined
    }));

    recipe.ingredients = enrichedIngredients;
  }

  // Check if annotated_steps is missing and auto-annotate (async, don't await)
  // Only trigger if it's truly missing (null or undefined from DB), not if it's an empty array or has content
  const shouldGenerateAnnotations = !recipe.annotated_steps && recipe.steps && recipe.steps.length > 0;
  
  if (shouldGenerateAnnotations) {
    console.log('No annotated steps found, generating in background...');
    
    // Run in background without blocking
    annotateRecipeInstructions(recipe).then(annotatedInstructions => {
      // Save to database
      return saveAnnotatedInstructions(id, annotatedInstructions);
    }).catch(err => {
      console.error('Failed to generate/save annotated steps:', err);
    });
  }

  // Check if ai_insight is missing and auto-generate (async, don't await)
  // Only trigger if it's truly missing, not if it's already generating
  const shouldGenerateInsight = !recipe.ai_insight && recipe.ingredients && recipe.ingredients.length > 0;
  
  if (shouldGenerateInsight) {
    console.log('No AI insight found, generating in background...');
    // Mark as generating with a special loading state
    recipe.ai_insight = { text: '__GENERATING__', suggested_tool: null };
    
    // Run in background without blocking
    analyzeRecipeInsight(recipe).then(insightData => {
      console.log('AI insight generated:', insightData);
      // Save to database
      return saveRecipeInsight(id, insightData);
    }).catch(err => {
      console.error('Failed to generate/save AI insight:', err);
    });
  }

  return recipe;
}

/**
 * Fetches recipes for the current user
 */
export async function fetchUserRecipes(): Promise<Recipe[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user recipes:', error);
    throw error;
  }

  return data || [];
}

export interface CreateRecipeInput {
  title: string;
  ingredients: Array<{
    text: string;  // Raw ingredient text
    id?: string;  // Optional ingredient ID
    quantity: string;
    unit?: string;
  }>;
  steps: string[];
  image_url?: string;
  notes?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Creates a new recipe in the database
 */
export async function createRecipe(input: CreateRecipeInput): Promise<Recipe | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      title: input.title,
      ingredients: input.ingredients,
      steps: input.steps,
      image_url: input.image_url,
      notes: input.notes,
      source: input.source,
      tags: input.tags,
      metadata: {
        prepTime: input.metadata?.prep_time || 0,
        cookTime: input.metadata?.cook_time || 0,
        servings: input.metadata?.servings || 0,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }

  return data;
}

/**
 * Updates an existing recipe in the database
 */
export async function updateRecipe(id: string, input: CreateRecipeInput): Promise<Recipe | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('recipes')
    .update({
      title: input.title,
      ingredients: input.ingredients,
      steps: input.steps,
      image_url: input.image_url,
      notes: input.notes,
      source: input.source,
      tags: input.tags,
      metadata: {
        prepTime: input.metadata?.prep_time || 0,
        cookTime: input.metadata?.cook_time || 0,
        servings: input.metadata?.servings || 0,
      },
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }

  return data;
}

/**
 * Annotates a recipe's instructions with ingredient references using AI
 */
async function annotateRecipeInstructions(recipe: Recipe) {
  try {
    // Prepare ingredients list (just the text)
    const ingredientTexts = recipe.ingredients?.map(ing => ing.text) || [];
    const originalSteps = recipe.steps || [];
    
    // Call the LLM server annotation endpoint
    const response = await fetch(API_ENDPOINTS.ANNOTATE_RECIPE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instructions: originalSteps,
        ingredients: ingredientTexts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Annotation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const annotatedSteps = data['annotated_instructions'].map((step: any) => step.annotated);

    return annotatedSteps;
  } catch (error) {
    console.error('Error annotating recipe:', error);
    // Return original instructions as fallback
    return recipe.steps || [];
  }
}

/**
 * Saves annotated instructions to the database
 */
async function saveAnnotatedInstructions(
  recipeId: string,
  annotatedInstructions: string[]
): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ annotated_steps: annotatedInstructions })
    .eq('id', recipeId);

  if (error) {
    console.error('Error saving annotated steps:', error);
    throw error;
  }
}

/**
 * Analyzes a recipe for dietary compliance and provides insights
 */
export async function analyzeRecipeInsight(recipe: Recipe): Promise<AIInsight> {
  try {
    // Get user profile for dietary restrictions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, profile_config')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Extract dietary restrictions from profile_config
    const dietaryRestrictions = profile.profile_config?.dietary_restrictions || [];
    const displayName = profile.display_name || 'Chef';
    const favoriteFood = profile.profile_config?.favorite_food || '';

    // Prepare recipe data for the API
    const recipeData = {
      title: recipe.title,
      ingredients: recipe.ingredients?.map(ing => ({
        text: ing.text,
        quantity: ing.quantity,
        unit: ing.unit?.abbreviation || ing.unit?.name || '',
      })) || [],
      instructions: recipe.steps || [],
      notes: '',
      metadata: {
        prep_time: recipe.prep_time || recipe.prepTime || 0,
        cook_time: recipe.cook_time || recipe.cookTime || 0,
        servings: recipe.servings || 0,
      },
    };

    const userProfile = {
      display_name: displayName,
      dietary_restrictions: dietaryRestrictions,
      favorite_food: favoriteFood,
    };

    // Fetch available AI tools from database
    const tools = await fetchAITools();
    const toolsForAPI = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      prompt: tool.prompt,
    }));

    // Call the LLM server analyze-recipe endpoint
    const response = await fetch(API_ENDPOINTS.ANALYZE_RECIPE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe: recipeData,
        user_profile: userProfile,
        available_tools: toolsForAPI,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      text: data.insight,
      suggested_tool: data.recommended_tool,
    };
  } catch (error) {
    console.error('Error analyzing recipe:', error);
    // Return a default insight as fallback
    return {
      text: 'Unable to analyze recipe at this time.',
      suggested_tool: null,
    };
  }
}

/**
 * Saves AI insight to the database
 */
export async function saveRecipeInsight(
  recipeId: string,
  insight: AIInsight
): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ 
      ai_insight: insight,
    })
    .eq('id', recipeId);

  if (error) {
    console.error('Error saving AI insight:', error);
    throw error;
  }
}

/**
 * Saves a modified recipe from AI tool execution
 * Converts the LLM response format to the database format
 */
export async function saveModifiedRecipe(modifiedRecipe: any, originalRecipe?: Recipe): Promise<Recipe | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch all units to match unit names to IDs
  const allUnits = await fetchUnits();

  // Helper function to find best matching unit
  const findBestUnitMatch = (unitStr: string): string | null => {
    if (!unitStr) return null;
    
    const normalized = unitStr.toLowerCase().trim();
    
    // Try exact match first (name or abbreviation)
    let match = allUnits.find((u: Unit) => 
      u.name?.toLowerCase() === normalized ||
      u.abbreviation?.toLowerCase() === normalized
    );
    if (match) return match.id;
    
    // Try without trailing 's' (plural handling)
    const singular = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
    match = allUnits.find((u: Unit) => 
      u.name?.toLowerCase() === singular ||
      u.abbreviation?.toLowerCase() === singular ||
      u.name?.toLowerCase() === singular + 's' ||
      u.abbreviation?.toLowerCase() === singular + 's'
    );
    if (match) return match.id;
    
    // Try partial match (unit name/abbr contains or is contained in the input)
    match = allUnits.find((u: Unit) => {
      const name = u.name?.toLowerCase() || '';
      const abbr = u.abbreviation?.toLowerCase() || '';
      return (
        (name && (name.includes(normalized) || normalized.includes(name))) ||
        (abbr && (abbr.includes(normalized) || normalized.includes(abbr)))
      );
    });
    if (match) return match.id;
    
    // No good match found
    return null;
  };

  // Convert LLM recipe format to database format
  const recipeInput = {
    title: modifiedRecipe.title,
    ingredients: modifiedRecipe.ingredients?.map((ing: any) => {
      const unitId = findBestUnitMatch(ing.unit);
      
      return {
        text: ing.text,
        quantity: ing.quantity,
        unit: unitId,
      };
    }) || [],
    steps: modifiedRecipe.instructions || [],
    notes: modifiedRecipe.notes || '',
    metadata: {
      prep_time: modifiedRecipe.metadata?.prep_time || originalRecipe?.metadata?.prepTime || originalRecipe?.prepTime || originalRecipe?.prep_time || 0,
      cook_time: modifiedRecipe.metadata?.cook_time || originalRecipe?.metadata?.cookTime || originalRecipe?.cookTime || originalRecipe?.cook_time || 0,
      servings: modifiedRecipe.metadata?.servings || originalRecipe?.metadata?.servings || originalRecipe?.servings || 0,
    },
  };

  return createRecipe(recipeInput);
}

/**
 * Deletes a recipe from the database
 */
export async function deleteRecipe(id: string): Promise<void> {
  console.log('Deleting recipe with ID:', id);
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
}
