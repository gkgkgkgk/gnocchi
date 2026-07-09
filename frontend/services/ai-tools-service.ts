import { api } from '@/lib/api';
import type { Recipe } from './recipe-service';

export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

export async function fetchAITools(): Promise<AITool[]> {
  return api.get<AITool[]>('/ai-tools');
}

export async function fetchAIToolByName(name: string): Promise<AITool | null> {
  const tools = await fetchAITools();
  return tools.find((t) => t.name === name) ?? null;
}

/**
 * Apply an AI tool to a recipe. Returns the modified recipe payload; caller
 * decides whether to save it as a new recipe or overwrite the current one.
 */
export async function executeAITool(
  recipe: Recipe,
  tool: AITool,
  userGuidance?: string,
): Promise<any> {
  const aiReasoning =
    recipe.ai_insight?.insight && recipe.ai_insight.insight !== '__GENERATING__'
      ? recipe.ai_insight.insight
      : '';

  const payload = {
    recipe: {
      title: recipe.title,
      ingredients: recipe.ingredients.map((i) => ({
        text: i.text,
        quantity: i.quantity,
        unit: i.unit,
      })),
      instructions: recipe.steps,
      notes: recipe.notes ?? '',
      metadata: {
        prep_time: recipe.prep_time ?? 0,
        cook_time: recipe.cook_time ?? 0,
        servings: recipe.servings ?? 1,
      },
    },
    tool,
    user_guidance: userGuidance ?? '',
    ai_reasoning: aiReasoning,
  };
  const res = await api.post<{ recipe: any }>('/ai/execute-tool', payload);
  return res.recipe;
}
