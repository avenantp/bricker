/**
 * AI Enhancement Service
 * Provides AI-powered suggestions for column metadata (business names, descriptions)
 * Features: Single & batch enhancement, cost estimation, caching, error handling
 */

import type { Column } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface DatasetContext {
  datasetName: string;
  datasetDescription?: string;
  medallionLayer?: string;
  entityType?: string;
  relatedDatasets?: string[];
  existingColumns?: Column[];
}

export interface AIBusinessNameSuggestion {
  suggestedName: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface AIDescriptionSuggestion {
  suggestedDescription: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface BatchEnhancementOptions {
  enhanceBusinessNames: boolean;
  enhanceDescriptions: boolean;
  confidenceThreshold?: number; // Only apply if confidence > threshold
  autoApplyHighConfidence?: boolean; // Auto-apply if confidence > 80
}

export interface ColumnEnhancement {
  columnId: string;
  columnName: string;
  businessName?: AIBusinessNameSuggestion;
  description?: AIDescriptionSuggestion;
  applied: boolean;
}

export interface BatchEnhancementResult {
  enhancements: ColumnEnhancement[];
  totalProcessed: number;
  autoApplied: number;
  requiresReview: number;
  estimatedCost: number;
}

export interface CostEstimate {
  columnCount: number;
  estimatedTokens: number;
  estimatedCost: number; // USD
  modelUsed: string;
}

export interface AIEnhancementOptions {
  enhanceBusinessName?: boolean;
  enhanceDescription?: boolean;
  useCache?: boolean;
}

export interface AIEnhancementResult {
  columnId: string;
  businessName?: AIBusinessNameSuggestion;
  description?: AIDescriptionSuggestion;
  tokenUsage: number;
  cost: number;
}

// ============================================================================
// Cache Implementation
// ============================================================================

class EnhancementCache {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.cache = new Map();
  }

  private getCacheKey(column: Column, type: 'businessName' | 'description'): string {
    return `${type}:${column.name}:${column.data_type}`;
  }

  get(column: Column, type: 'businessName' | 'description'): any | null {
    const key = this.getCacheKey(column, type);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(column: Column, type: 'businessName' | 'description', data: any): void {
    const key = this.getCacheKey(column, type);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const enhancementCache = new EnhancementCache();

// ============================================================================
// Rate Limiting
// ============================================================================

class RateLimiter {
  private requests: number[];
  private readonly maxRequests = 10;
  private readonly timeWindow = 60 * 1000; // 1 minute

  constructor() {
    this.requests = [];
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside time window
    this.requests = this.requests.filter((time) => now - time < this.timeWindow);

    // Check if limit exceeded
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`
      );
    }

    // Add current request
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// ============================================================================
// AI Enhancement Service
// ============================================================================

export class AIEnhancementService {
  /**
   * Generate business name suggestion for a column
   */
  static async suggestBusinessName(
    column: Column,
    context: DatasetContext
  ): Promise<AIBusinessNameSuggestion> {
    // Check cache first
    const cached = enhancementCache.get(column, 'businessName');
    if (cached) {
      return cached;
    }

    // Check rate limit
    await rateLimiter.checkLimit();

    try {
      // Call AI API (placeholder - will be replaced with actual API call)
      const response = await this.callAIAPI({
        type: 'businessName',
        column,
        context,
      });

      const suggestion: AIBusinessNameSuggestion = {
        suggestedName: response.suggestedName,
        confidence: response.confidence,
        reasoning: response.reasoning,
      };

      // Cache the result
      enhancementCache.set(column, 'businessName', suggestion);

      return suggestion;
    } catch (error) {
      throw this.handleAIError(error);
    }
  }

  /**
   * Generate description for a column
   */
  static async suggestDescription(
    column: Column,
    context: DatasetContext
  ): Promise<AIDescriptionSuggestion> {
    // Check cache first
    const cached = enhancementCache.get(column, 'description');
    if (cached) {
      return cached;
    }

    // Check rate limit
    await rateLimiter.checkLimit();

    try {
      // Call AI API (placeholder - will be replaced with actual API call)
      const response = await this.callAIAPI({
        type: 'description',
        column,
        context,
      });

      const suggestion: AIDescriptionSuggestion = {
        suggestedDescription: response.suggestedDescription,
        confidence: response.confidence,
        reasoning: response.reasoning,
      };

      // Cache the result
      enhancementCache.set(column, 'description', suggestion);

      return suggestion;
    } catch (error) {
      throw this.handleAIError(error);
    }
  }

  /**
   * Batch enhance multiple columns
   */
  static async batchEnhanceColumns(
    columns: Column[],
    context: DatasetContext,
    options: BatchEnhancementOptions
  ): Promise<BatchEnhancementResult> {
    const enhancements: ColumnEnhancement[] = [];
    let totalProcessed = 0;
    let autoApplied = 0;
    let requiresReview = 0;
    let estimatedCost = 0;

    for (const column of columns) {
      try {
        const enhancement: ColumnEnhancement = {
          columnId: column.id,
          columnName: column.name,
          applied: false,
        };

        // Enhance business name
        if (options.enhanceBusinessNames) {
          const businessName = await this.suggestBusinessName(column, context);
          enhancement.businessName = businessName;

          // Auto-apply if confidence is high enough
          if (
            options.autoApplyHighConfidence &&
            businessName.confidence >= (options.confidenceThreshold || 80)
          ) {
            enhancement.applied = true;
            autoApplied++;
          } else {
            requiresReview++;
          }
        }

        // Enhance description
        if (options.enhanceDescriptions) {
          const description = await this.suggestDescription(column, context);
          enhancement.description = description;

          // Auto-apply if confidence is high enough (and not already applied)
          if (
            !enhancement.applied &&
            options.autoApplyHighConfidence &&
            description.confidence >= (options.confidenceThreshold || 80)
          ) {
            enhancement.applied = true;
            autoApplied++;
          } else if (!enhancement.applied) {
            requiresReview++;
          }
        }

        enhancements.push(enhancement);
        totalProcessed++;

        // Estimate cost (rough estimate: 100 tokens per enhancement)
        estimatedCost += 0.001; // ~$0.001 per enhancement
      } catch (error) {
        console.error(`Failed to enhance column ${column.name}:`, error);
        // Continue with other columns
      }
    }

    return {
      enhancements,
      totalProcessed,
      autoApplied,
      requiresReview,
      estimatedCost,
    };
  }

  /**
   * Estimate cost before processing
   */
  static async estimateEnhancementCost(columnCount: number): Promise<CostEstimate> {
    // Rough estimates based on Claude API pricing
    const avgTokensPerColumn = 100; // Average tokens for name + description
    const costPerThousandTokens = 0.015; // Example pricing for Claude Haiku

    const estimatedTokens = columnCount * avgTokensPerColumn;
    const estimatedCost = (estimatedTokens / 1000) * costPerThousandTokens;

    return {
      columnCount,
      estimatedTokens,
      estimatedCost,
      modelUsed: 'claude-3-haiku-20240307',
    };
  }

  /**
   * Clear the enhancement cache
   */
  static clearCache(): void {
    enhancementCache.clear();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Call the AI API (placeholder - to be implemented with actual backend endpoint)
   */
  private static async callAIAPI(request: any): Promise<any> {
    // TODO: Replace with actual API call to backend
    // For now, return mock data for demonstration

    const { type, column, context } = request;

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (type === 'businessName') {
      // Generate mock business name from technical name
      const mockName = this.generateMockBusinessName(column.name);
      return {
        suggestedName: mockName,
        confidence: Math.floor(Math.random() * 20) + 80, // 80-100
        reasoning: `Converted technical name "${column.name}" to human-readable format based on common naming conventions.`,
      };
    }

    if (type === 'description') {
      // Generate mock description
      const mockDescription = this.generateMockDescription(column.name, column.data_type);
      return {
        suggestedDescription: mockDescription,
        confidence: Math.floor(Math.random() * 20) + 75, // 75-95
        reasoning: `Generated description based on column name "${column.name}" and data type "${column.data_type}".`,
      };
    }

    throw new Error('Invalid AI API request type');
  }

  /**
   * Generate mock business name (temporary until real AI is connected)
   */
  private static generateMockBusinessName(technicalName: string): string {
    // Convert snake_case to Title Case
    return technicalName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate mock description (temporary until real AI is connected)
   */
  private static generateMockDescription(name: string, dataType: string): string {
    const businessName = this.generateMockBusinessName(name);
    return `The ${businessName} field stores ${dataType} data related to ${businessName.toLowerCase()}.`;
  }

  /**
   * Handle AI service errors with retry logic
   */
  private static handleAIError(error: any): Error {
    if (error.message?.includes('rate limit')) {
      return new Error(
        'AI service rate limit exceeded. Please wait a moment before trying again.'
      );
    }

    if (error.message?.includes('timeout')) {
      return new Error('AI service request timed out. Please try again.');
    }

    if (error.status === 503) {
      return new Error('AI service is temporarily unavailable. Please try again later.');
    }

    return new Error(
      `AI enhancement failed: ${error.message || 'Unknown error'}. Please try again.`
    );
  }
}

// ============================================================================
// Retry with Exponential Backoff
// ============================================================================

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on rate limit errors
      if ((error as Error).message?.includes('rate limit')) {
        throw error;
      }

      // Don't retry on last attempt
      if (i === maxRetries - 1) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
