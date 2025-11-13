/**
 * API Configuration
 * Centralized API URLs for the application
 */

export const API_CONFIG = {
  LLM_API_URL: process.env.EXPO_PUBLIC_LLM_API_URL || 'http://localhost:8001',
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
};

export const API_ENDPOINTS = {
  // LLM Server endpoints
  ANNOTATE_RECIPE: `${API_CONFIG.LLM_API_URL}/annotate-recipe`,
  ANALYZE_RECIPE: `${API_CONFIG.LLM_API_URL}/analyze-recipe`,
  EXECUTE_TOOL: `${API_CONFIG.LLM_API_URL}/execute-tool`,
  GENERATE_SHOPPING_LIST: `${API_CONFIG.LLM_API_URL}/generate-shopping-list`,
  
  // Main API endpoints
  PARSE_RECIPE_IMAGE: `${API_CONFIG.LLM_API_URL}/parse-recipe-image`,
};
