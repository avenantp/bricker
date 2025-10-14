/**
 * Rate Limiter for Source Control API Requests
 *
 * This class implements a token bucket algorithm to enforce rate limits
 * and prevent exceeding API quotas for source control providers.
 */

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  perMilliseconds: number;

  /**
   * Minimum interval between requests in milliseconds
   */
  minInterval?: number;
}

/**
 * Request queue item
 */
interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  addedAt: number;
}

/**
 * Rate Limiter using Token Bucket Algorithm
 */
export class RateLimiter {
  private config: Required<RateLimiterConfig>;
  private tokens: number;
  private lastRefillTime: number;
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private lastRequestTime = 0;

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      perMilliseconds: config.perMilliseconds,
      minInterval: config.minInterval || 0
    };

    // Start with full bucket
    this.tokens = config.maxRequests;
    this.lastRefillTime = Date.now();

    // Start background refill process
    this.startRefillTimer();
  }

  /**
   * Enqueue a request to be executed with rate limiting
   * @param fn Function to execute
   * @returns Promise that resolves with the function result
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        addedAt: Date.now()
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Refill tokens based on time elapsed
      this.refillTokens();

      // Wait if no tokens available
      if (this.tokens < 1) {
        await this.waitForTokens();
        continue;
      }

      // Enforce minimum interval between requests
      if (this.config.minInterval > 0) {
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.config.minInterval) {
          await this.sleep(this.config.minInterval - timeSinceLastRequest);
        }
      }

      // Process next request
      const request = this.queue.shift();
      if (!request) break;

      // Consume a token
      this.tokens -= 1;
      this.lastRequestTime = Date.now();

      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    // Calculate tokens to add based on elapsed time
    const tokensToAdd = (elapsed / this.config.perMilliseconds) * this.config.maxRequests;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(
        this.config.maxRequests,
        this.tokens + Math.floor(tokensToAdd)
      );
      this.lastRefillTime = now;
    }
  }

  /**
   * Wait for tokens to become available
   */
  private async waitForTokens(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const timeUntilNextToken = Math.max(
      0,
      this.config.perMilliseconds / this.config.maxRequests - elapsed
    );

    await this.sleep(timeUntilNextToken);
    this.refillTokens();
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start background timer to refill tokens
   */
  private startRefillTimer(): void {
    setInterval(() => {
      this.refillTokens();

      // Process queue if there are pending requests
      if (this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }, Math.min(1000, this.config.perMilliseconds / this.config.maxRequests));
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    availableTokens: number;
    maxTokens: number;
    queueLength: number;
    processing: boolean;
  } {
    this.refillTokens();

    return {
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.config.maxRequests,
      queueLength: this.queue.length,
      processing: this.processing
    };
  }

  /**
   * Clear the queue and reset
   */
  reset(): void {
    // Reject all queued requests
    for (const request of this.queue) {
      request.reject(new Error('Rate limiter was reset'));
    }

    this.queue = [];
    this.tokens = this.config.maxRequests;
    this.lastRefillTime = Date.now();
    this.lastRequestTime = 0;
    this.processing = false;
  }
}

/**
 * Create rate limiter with preset configurations for common providers
 */
export class RateLimiterPresets {
  /**
   * GitHub rate limiter (5000 requests/hour for authenticated users)
   */
  static github(): RateLimiter {
    return new RateLimiter({
      maxRequests: 5000,
      perMilliseconds: 60 * 60 * 1000, // 1 hour
      minInterval: 100 // 100ms between requests
    });
  }

  /**
   * GitLab rate limiter (600 requests/minute)
   */
  static gitlab(): RateLimiter {
    return new RateLimiter({
      maxRequests: 600,
      perMilliseconds: 60 * 1000, // 1 minute
      minInterval: 100
    });
  }

  /**
   * Bitbucket rate limiter (1000 requests/hour)
   */
  static bitbucket(): RateLimiter {
    return new RateLimiter({
      maxRequests: 1000,
      perMilliseconds: 60 * 60 * 1000, // 1 hour
      minInterval: 200
    });
  }

  /**
   * Azure DevOps rate limiter (200 requests/minute per user)
   */
  static azure(): RateLimiter {
    return new RateLimiter({
      maxRequests: 200,
      perMilliseconds: 60 * 1000, // 1 minute
      minInterval: 300
    });
  }

  /**
   * Generic conservative rate limiter
   */
  static conservative(): RateLimiter {
    return new RateLimiter({
      maxRequests: 100,
      perMilliseconds: 60 * 1000, // 1 minute
      minInterval: 500
    });
  }
}
