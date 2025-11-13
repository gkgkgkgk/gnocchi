const API_URL = 'http://127.0.0.1:8001';

export interface ScrapedRecipe {
  title: string;
  ingredients: Array<{
    text: string;
    id: string | null;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  notes: string;
  metadata: {
    prep_time: number;
    cook_time: number;
    servings: number;
  };
}

export interface PinterestImportResponse {
  recipe: ScrapedRecipe;
  source_url: string;
  source_image: string | null;
}

export async function importFromPinterest(url: string): Promise<PinterestImportResponse> {
  try {
    const response = await fetch(`${API_URL}/scrape-pinterest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to import from Pinterest');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Pinterest import error:', error);
    throw error;
  }
}

export async function importFromWebsite(url: string): Promise<PinterestImportResponse> {
  try {
    const response = await fetch(`${API_URL}/scrape-website`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to import from website');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Website import error:', error);
    throw error;
  }
}
