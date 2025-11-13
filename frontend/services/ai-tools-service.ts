import { supabase } from '@/lib/supabase';
import { API_ENDPOINTS } from '@/config/api';

export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetches all enabled AI tools from the database
 */
export async function fetchAITools(): Promise<AITool[]> {
  const { data, error } = await supabase
    .from('ai_tools')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching AI tools:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches a single AI tool by name
 */
export async function fetchAIToolByName(name: string): Promise<AITool | null> {
  const { data, error } = await supabase
    .from('ai_tools')
    .select('*')
    .eq('name', name)
    .single();

  if (error) {
    console.error('Error fetching AI tool:', error);
    return null;
  }

  return data;
}

/**
 * Executes an AI tool on a recipe to generate a modified version
 */
export async function executeAITool(recipe: any, tool: AITool, userGuidance?: string): Promise<any> {
  try {
    // Extract AI insight reasoning if available
    const aiReasoning = recipe.ai_insight?.text && recipe.ai_insight.text !== '__GENERATING__' 
      ? recipe.ai_insight.text 
      : '';
    
    const response = await fetch(API_ENDPOINTS.EXECUTE_TOOL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe: {
          title: recipe.title,
          ingredients: recipe.ingredients?.map((ing: any) => ({
            text: ing.text,
            quantity: ing.quantity,
            unit: ing.unit?.abbreviation || ing.unit?.name || '',
          })) || [],
          instructions: recipe.steps || [],
          notes: recipe.notes || '',
          metadata: {
            prep_time: recipe.prep_time || recipe.prepTime || 0,
            cook_time: recipe.cook_time || recipe.cookTime || 0,
            servings: recipe.servings || 0,
          },
        },
        tool: {
          name: tool.name,
          description: tool.description,
          prompt: tool.prompt,
        },
        user_guidance: userGuidance || '',
        ai_reasoning: aiReasoning,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tool execution failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.recipe;
  } catch (error) {
    console.error('Error executing AI tool:', error);
    throw error;
  }
}
