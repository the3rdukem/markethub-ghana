/**
 * OpenAI Service
 *
 * AI-powered features for the marketplace.
 * Credentials are managed from Admin → API Management.
 *
 * PRODUCTION-READY: All calls go through the Central API Execution Layer.
 *
 * Capabilities:
 * - Semantic product search
 * - Product recommendations
 * - Content moderation
 * - Natural language queries
 */

import { useIntegrationsStore } from '../integrations-store';
import { executeAPI, isIntegrationReady, getIntegrationStatus } from '../api-execution-layer';

const INTEGRATION_ID = 'openai';
const OPENAI_API_BASE = 'https://api.openai.com/v1';

export interface SemanticSearchRequest {
  query: string;
  productDescriptions: Array<{ id: string; title: string; description: string; category?: string }>;
  maxResults?: number;
}

export interface SemanticSearchResult {
  success: boolean;
  results?: Array<{
    id: string;
    score: number;
    relevance: 'high' | 'medium' | 'low';
  }>;
  error?: string;
  integrationDisabled?: boolean;
}

export interface ContentModerationResult {
  success: boolean;
  flagged: boolean;
  categories?: {
    hate: boolean;
    harassment: boolean;
    selfHarm: boolean;
    sexual: boolean;
    violence: boolean;
  };
  error?: string;
  integrationDisabled?: boolean;
}

export interface ProductRecommendationResult {
  success: boolean;
  recommendations?: Array<{
    id: string;
    score: number;
    reason: string;
  }>;
  error?: string;
  integrationDisabled?: boolean;
}

/**
 * Get OpenAI configuration from integrations store
 */
export const getOpenAIConfig = (): {
  apiKey: string;
  orgId?: string;
} | null => {
  const store = useIntegrationsStore.getState();
  const integration = store.getIntegration(INTEGRATION_ID);

  if (!integration?.isEnabled || !integration?.isConfigured || integration?.status !== 'connected') {
    return null;
  }

  const apiKey = store.getCredentialValue(INTEGRATION_ID, 'OPENAI_API_KEY');
  const orgId = store.getCredentialValue(INTEGRATION_ID, 'OPENAI_ORG_ID');

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    orgId,
  };
};

/**
 * Check if OpenAI is available
 */
export const isOpenAIEnabled = (): boolean => {
  return isIntegrationReady(INTEGRATION_ID);
};

/**
 * Get OpenAI status for UI display
 */
export const getOpenAIStatus = (): {
  available: boolean;
  message: string;
} => {
  const status = getIntegrationStatus(INTEGRATION_ID);
  return {
    available: status.available,
    message: status.message,
  };
};

/**
 * Perform semantic search using embeddings
 * Ranks products based on semantic similarity to the query
 */
export const semanticSearch = async (
  request: SemanticSearchRequest
): Promise<SemanticSearchResult> => {
  if (!isOpenAIEnabled()) {
    const status = getOpenAIStatus();
    return {
      success: false,
      error: status.message || 'AI search not available',
      integrationDisabled: true,
    };
  }

  const config = getOpenAIConfig();
  if (!config) {
    return {
      success: false,
      error: 'AI search not configured',
      integrationDisabled: true,
    };
  }

  const maxResults = request.maxResults || 10;

  const result = await executeAPI<{
    data: Array<{ embedding: number[]; index: number }>;
  }>(
    INTEGRATION_ID,
    'create_embeddings',
    async () => {
      // Create embeddings for query and all products
      const textsToEmbed = [
        request.query,
        ...request.productDescriptions.map((p) => `${p.title}. ${p.description}. Category: ${p.category || 'General'}`),
      ];

      const response = await fetch(`${OPENAI_API_BASE}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...(config.orgId && { 'OpenAI-Organization': config.orgId }),
        },
        body: JSON.stringify({
          input: textsToEmbed,
          model: 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      return response.json();
    },
    { timeout: 60000, maxRetries: 2 }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error?.message || 'Semantic search failed',
    };
  }

  // Calculate cosine similarity between query and each product
  const queryEmbedding = result.data.data[0].embedding;
  const scores: Array<{ id: string; score: number }> = [];

  for (let i = 1; i < result.data.data.length; i++) {
    const productEmbedding = result.data.data[i].embedding;
    const similarity = cosineSimilarity(queryEmbedding, productEmbedding);
    scores.push({
      id: request.productDescriptions[i - 1].id,
      score: similarity,
    });
  }

  // Sort by score descending and take top results
  scores.sort((a, b) => b.score - a.score);
  const topResults = scores.slice(0, maxResults);

  return {
    success: true,
    results: topResults.map((r) => ({
      id: r.id,
      score: r.score,
      relevance: r.score > 0.8 ? 'high' : r.score > 0.5 ? 'medium' : 'low',
    })),
  };
};

/**
 * Natural language product query
 * Uses GPT to understand and parse natural language queries
 */
export const naturalLanguageQuery = async (query: string): Promise<{
  success: boolean;
  parsed?: {
    searchTerms: string[];
    filters: {
      category?: string;
      priceRange?: { min?: number; max?: number };
      sortBy?: 'price' | 'rating' | 'newest';
    };
  };
  error?: string;
  integrationDisabled?: boolean;
}> => {
  if (!isOpenAIEnabled()) {
    return {
      success: false,
      error: 'AI search not available',
      integrationDisabled: true,
    };
  }

  const config = getOpenAIConfig();
  if (!config) {
    return {
      success: false,
      error: 'AI search not configured',
      integrationDisabled: true,
    };
  }

  const result = await executeAPI<{
    choices: Array<{ message: { content: string } }>;
  }>(
    INTEGRATION_ID,
    'parse_query',
    async () => {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...(config.orgId && { 'OpenAI-Organization': config.orgId }),
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a product search assistant. Parse the user's query and extract:
1. searchTerms: Key product terms to search for
2. filters: Any mentioned filters like category, price range, sort order

Respond in JSON format only:
{
  "searchTerms": ["term1", "term2"],
  "filters": {
    "category": "optional category",
    "priceRange": { "min": number or null, "max": number or null },
    "sortBy": "price" | "rating" | "newest" or null
  }
}`,
            },
            {
              role: 'user',
              content: query,
            },
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      return response.json();
    },
    { timeout: 30000, maxRetries: 1 }
  );

  if (!result.success || !result.data?.choices?.[0]) {
    return {
      success: false,
      error: result.error?.message || 'Query parsing failed',
    };
  }

  try {
    const parsed = JSON.parse(result.data.choices[0].message.content);
    return {
      success: true,
      parsed: {
        searchTerms: parsed.searchTerms || [],
        filters: {
          category: parsed.filters?.category,
          priceRange: parsed.filters?.priceRange,
          sortBy: parsed.filters?.sortBy,
        },
      },
    };
  } catch {
    return {
      success: false,
      error: 'Failed to parse AI response',
    };
  }
};

/**
 * Content moderation for product listings
 */
export const moderateContent = async (content: string): Promise<ContentModerationResult> => {
  if (!isOpenAIEnabled()) {
    return {
      success: false,
      flagged: false,
      error: 'Content moderation not available',
      integrationDisabled: true,
    };
  }

  const config = getOpenAIConfig();
  if (!config) {
    return {
      success: false,
      flagged: false,
      error: 'Content moderation not configured',
      integrationDisabled: true,
    };
  }

  const result = await executeAPI<{
    results: Array<{
      flagged: boolean;
      categories: {
        hate: boolean;
        harassment: boolean;
        'self-harm': boolean;
        sexual: boolean;
        violence: boolean;
      };
    }>;
  }>(
    INTEGRATION_ID,
    'moderate_content',
    async () => {
      const response = await fetch(`${OPENAI_API_BASE}/moderations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...(config.orgId && { 'OpenAI-Organization': config.orgId }),
        },
        body: JSON.stringify({
          input: content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      return response.json();
    },
    { timeout: 15000, maxRetries: 2 }
  );

  if (!result.success || !result.data?.results?.[0]) {
    return {
      success: false,
      flagged: false,
      error: result.error?.message || 'Content moderation failed',
    };
  }

  const modResult = result.data.results[0];

  return {
    success: true,
    flagged: modResult.flagged,
    categories: {
      hate: modResult.categories.hate,
      harassment: modResult.categories.harassment,
      selfHarm: modResult.categories['self-harm'],
      sexual: modResult.categories.sexual,
      violence: modResult.categories.violence,
    },
  };
};

/**
 * Generate product recommendations based on user history
 */
export const getProductRecommendations = async (
  userHistory: {
    viewedProductIds: string[];
    purchasedProductIds: string[];
    searchQueries: string[];
  },
  availableProducts: Array<{ id: string; title: string; category: string }>,
  maxRecommendations: number = 5
): Promise<ProductRecommendationResult> => {
  if (!isOpenAIEnabled()) {
    return {
      success: false,
      error: 'AI recommendations not available',
      integrationDisabled: true,
    };
  }

  const config = getOpenAIConfig();
  if (!config) {
    return {
      success: false,
      error: 'AI recommendations not configured',
      integrationDisabled: true,
    };
  }

  const result = await executeAPI<{
    choices: Array<{ message: { content: string } }>;
  }>(
    INTEGRATION_ID,
    'get_recommendations',
    async () => {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...(config.orgId && { 'OpenAI-Organization': config.orgId }),
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a product recommendation engine. Based on the user's history, recommend products from the available list.

Respond in JSON format only:
{
  "recommendations": [
    { "id": "product_id", "score": 0.95, "reason": "Brief reason" }
  ]
}`,
            },
            {
              role: 'user',
              content: `User History:
- Viewed: ${userHistory.viewedProductIds.join(', ') || 'None'}
- Purchased: ${userHistory.purchasedProductIds.join(', ') || 'None'}
- Searches: ${userHistory.searchQueries.join(', ') || 'None'}

Available Products:
${availableProducts.map((p) => `${p.id}: ${p.title} (${p.category})`).join('\n')}

Recommend up to ${maxRecommendations} products.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      return response.json();
    },
    { timeout: 30000, maxRetries: 1 }
  );

  if (!result.success || !result.data?.choices?.[0]) {
    return {
      success: false,
      error: result.error?.message || 'Recommendation generation failed',
    };
  }

  try {
    const parsed = JSON.parse(result.data.choices[0].message.content);
    return {
      success: true,
      recommendations: parsed.recommendations || [],
    };
  } catch {
    return {
      success: false,
      error: 'Failed to parse recommendations',
    };
  }
};

// ============ Helper Functions ============

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get OpenAI service health
 */
export const getOpenAIHealth = async (): Promise<{
  healthy: boolean;
  error?: string;
}> => {
  if (!isOpenAIEnabled()) {
    return { healthy: false, error: 'OpenAI not configured' };
  }

  const config = getOpenAIConfig();
  if (!config) {
    return { healthy: false, error: 'OpenAI not configured' };
  }

  const result = await executeAPI<{ data: Array<{ id: string }> }>(
    INTEGRATION_ID,
    'health_check',
    async () => {
      const response = await fetch(`${OPENAI_API_BASE}/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          ...(config.orgId && { 'OpenAI-Organization': config.orgId }),
        },
      });

      if (!response.ok) {
        throw new Error('API health check failed');
      }

      return response.json();
    },
    { timeout: 10000, maxRetries: 1 }
  );

  return {
    healthy: result.success,
    error: result.error?.message,
  };
};
