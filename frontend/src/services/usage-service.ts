import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface UsageMetric {
  current: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
}

export interface UsageSnapshot {
  accountId: string;
  periodStart: Date;
  periodEnd: Date;
  users: UsageMetric;
  projects: UsageMetric;
  datasets: UsageMetric;
  aiRequests: UsageMetric & { resetsAt: Date };
  storage: UsageMetric & { currentMb: number; limitMb: number };
}

export interface LimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  percentage: number;
  message: string;
  requiresUpgrade: boolean;
}

export interface UsageEvent {
  id: string;
  accountId: string;
  userId?: string;
  eventType: 'ai_request' | 'dataset_created' | 'project_created' | 'user_invited' | 'storage_used' | 'api_call';
  eventCategory?: string;
  quantity: number;
  unit?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export type ResourceType = 'users' | 'projects' | 'datasets' | 'ai_requests' | 'storage';

// =====================================================
// Usage Service
// =====================================================

export class UsageService {
  /**
   * Get current usage snapshot for an account
   */
  static async getUsage(accountId: string): Promise<UsageSnapshot> {
    try {
      // Get account with current counters
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;
      if (!account) throw new Error('Account not found');

      // Calculate usage metrics
      const users: UsageMetric = {
        current: account.current_user_count || 0,
        limit: account.max_users || 0,
        percentage: this.calculatePercentage(account.current_user_count, account.max_users),
        unlimited: account.max_users === -1,
      };

      const projects: UsageMetric = {
        current: account.current_project_count || 0,
        limit: account.max_projects || 0,
        percentage: this.calculatePercentage(account.current_project_count, account.max_projects),
        unlimited: account.max_projects === -1,
      };

      const datasets: UsageMetric = {
        current: account.current_dataset_count || 0,
        limit: account.max_datasets || 0,
        percentage: this.calculatePercentage(account.current_dataset_count, account.max_datasets),
        unlimited: account.max_datasets === -1,
      };

      const aiRequests: UsageMetric & { resetsAt: Date } = {
        current: account.current_monthly_ai_requests || 0,
        limit: account.max_monthly_ai_requests || 0,
        percentage: this.calculatePercentage(
          account.current_monthly_ai_requests,
          account.max_monthly_ai_requests
        ),
        unlimited: account.max_monthly_ai_requests === -1,
        resetsAt: account.usage_reset_date
          ? new Date(account.usage_reset_date)
          : this.getNextResetDate(),
      };

      const storage: UsageMetric & { currentMb: number; limitMb: number } = {
        current: account.current_storage_mb || 0,
        limit: account.max_storage_mb || 0,
        percentage: this.calculatePercentage(account.current_storage_mb, account.max_storage_mb),
        unlimited: account.max_storage_mb === -1,
        currentMb: account.current_storage_mb || 0,
        limitMb: account.max_storage_mb || 0,
      };

      return {
        accountId,
        periodStart: account.usage_reset_date
          ? new Date(account.usage_reset_date)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        periodEnd: aiRequests.resetsAt,
        users,
        projects,
        datasets,
        aiRequests,
        storage,
      };
    } catch (error) {
      console.error('Failed to get usage:', error);
      throw error;
    }
  }

  /**
   * Check if a resource operation would exceed limits
   */
  static async checkLimit(
    accountId: string,
    resourceType: ResourceType,
    incrementBy: number = 1
  ): Promise<LimitCheckResult> {
    try {
      // Call the database function
      const { data, error } = await supabase.rpc('check_resource_limit', {
        p_account_id: accountId,
        p_resource_type: resourceType,
        p_increment: incrementBy,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No result from limit check');
      }

      const result = Array.isArray(data) ? data[0] : data;

      return {
        allowed: result.allowed,
        currentUsage: result.current_usage,
        limit: result.limit_value,
        percentage: parseFloat(result.percentage),
        message: result.message,
        requiresUpgrade: !result.allowed && result.limit_value !== -1,
      };
    } catch (error) {
      console.error('Failed to check limit:', error);
      throw error;
    }
  }

  /**
   * Track a usage event
   */
  static async trackEvent(event: Omit<UsageEvent, 'id' | 'createdAt'>): Promise<UsageEvent> {
    try {
      const { data, error } = await supabase
        .from('usage_events')
        .insert({
          account_id: event.accountId,
          user_id: event.userId,
          event_type: event.eventType,
          event_category: event.eventCategory,
          quantity: event.quantity,
          unit: event.unit,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          metadata: event.metadata,
        })
        .select()
        .single();

      if (error) throw error;

      // For AI requests, also increment the counter
      if (event.eventType === 'ai_request') {
        await this.incrementCounter(event.accountId, 'ai_requests', event.quantity);
      }

      return {
        id: data.id,
        accountId: data.account_id,
        userId: data.user_id,
        eventType: data.event_type,
        eventCategory: data.event_category,
        quantity: data.quantity,
        unit: data.unit,
        resourceType: data.resource_type,
        resourceId: data.resource_id,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error('Failed to track event:', error);
      throw error;
    }
  }

  /**
   * Get usage history with filters
   */
  static async getUsageHistory(
    accountId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      eventType?: string;
      limit?: number;
    }
  ): Promise<UsageEvent[]> {
    try {
      let query = supabase
        .from('usage_events')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((event) => ({
        id: event.id,
        accountId: event.account_id,
        userId: event.user_id,
        eventType: event.event_type,
        eventCategory: event.event_category,
        quantity: event.quantity,
        unit: event.unit,
        resourceType: event.resource_type,
        resourceId: event.resource_id,
        metadata: event.metadata,
        createdAt: new Date(event.created_at),
      }));
    } catch (error) {
      console.error('Failed to get usage history:', error);
      throw error;
    }
  }

  /**
   * Get usage summary view (uses database view)
   */
  static async getUsageSummary(accountId: string) {
    try {
      const { data, error } = await supabase
        .from('account_usage_summary')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get usage summary:', error);
      throw error;
    }
  }

  /**
   * Sync usage counters with actual data (for data integrity)
   */
  static async syncUsageCounters(accountId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('sync_usage_counters', {
        p_account_id: accountId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to sync usage counters:', error);
      throw error;
    }
  }

  /**
   * Check if account is approaching any limits (80%+)
   */
  static async getWarnings(accountId: string): Promise<{
    hasWarnings: boolean;
    warnings: Array<{ resource: string; percentage: number; level: 'notice' | 'warning' | 'critical' }>;
  }> {
    const usage = await this.getUsage(accountId);
    const warnings: Array<{ resource: string; percentage: number; level: 'notice' | 'warning' | 'critical' }> = [];

    const checkMetric = (metric: UsageMetric, resourceName: string) => {
      if (metric.unlimited) return;

      if (metric.percentage >= 95) {
        warnings.push({ resource: resourceName, percentage: metric.percentage, level: 'critical' });
      } else if (metric.percentage >= 90) {
        warnings.push({ resource: resourceName, percentage: metric.percentage, level: 'warning' });
      } else if (metric.percentage >= 80) {
        warnings.push({ resource: resourceName, percentage: metric.percentage, level: 'notice' });
      }
    };

    checkMetric(usage.users, 'Team Members');
    checkMetric(usage.projects, 'Projects');
    checkMetric(usage.datasets, 'Datasets');
    checkMetric(usage.aiRequests, 'AI Requests');
    checkMetric(usage.storage, 'Storage');

    return {
      hasWarnings: warnings.length > 0,
      warnings,
    };
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private static calculatePercentage(current: number, limit: number): number {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.round((current / limit) * 100 * 100) / 100; // Round to 2 decimal places
  }

  private static getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return nextMonth;
  }

  private static async incrementCounter(
    accountId: string,
    resourceType: ResourceType,
    amount: number = 1
  ): Promise<void> {
    // Map resource type to column name
    const columnMap: Record<ResourceType, string> = {
      users: 'current_user_count',
      projects: 'current_project_count',
      datasets: 'current_dataset_count',
      ai_requests: 'current_monthly_ai_requests',
      storage: 'current_storage_mb',
    };

    const column = columnMap[resourceType];
    if (!column) return;

    // Increment the counter
    const { error } = await supabase.rpc('increment', {
      row_id: accountId,
      x: amount,
    });

    if (error) {
      console.error('Failed to increment counter:', error);
    }
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(mb: number): string {
    if (mb < 1024) return `${mb} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  /**
   * Get warning level color for UI
   */
  static getWarningColor(percentage: number): string {
    if (percentage >= 95) return 'red';
    if (percentage >= 90) return 'orange';
    if (percentage >= 80) return 'yellow';
    return 'green';
  }
}
