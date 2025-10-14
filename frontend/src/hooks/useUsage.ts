import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsageService, UsageSnapshot, UsageEvent, ResourceType, LimitCheckResult } from '@/services/usage-service';
import { useStore } from '@/store/useStore';

// =====================================================
// Query Keys
// =====================================================

export const usageKeys = {
  all: ['usage'] as const,
  byAccount: (accountId: string) => [...usageKeys.all, accountId] as const,
  current: (accountId: string) => [...usageKeys.byAccount(accountId), 'current'] as const,
  history: (accountId: string, filters?: any) => [...usageKeys.byAccount(accountId), 'history', filters] as const,
  warnings: (accountId: string) => [...usageKeys.byAccount(accountId), 'warnings'] as const,
  summary: (accountId: string) => [...usageKeys.byAccount(accountId), 'summary'] as const,
};

// =====================================================
// Usage Hooks
// =====================================================

/**
 * Get current usage for account
 * Automatically refetches every 30 seconds
 */
export function useUsage(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: usageKeys.current(id || ''),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return UsageService.getUsage(id);
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Get usage history with filters
 */
export function useUsageHistory(
  accountId?: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
    limit?: number;
  }
) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: usageKeys.history(id || '', filters),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return UsageService.getUsageHistory(id, filters);
    },
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get usage warnings (80%+ of limits)
 */
export function useUsageWarnings(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: usageKeys.warnings(id || ''),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return UsageService.getWarnings(id);
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get usage summary (from database view)
 */
export function useUsageSummary(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: usageKeys.summary(id || ''),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return UsageService.getUsageSummary(id);
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Check if a resource operation would exceed limits
 */
export function useCheckLimit() {
  return useMutation({
    mutationFn: ({
      accountId,
      resourceType,
      incrementBy = 1,
    }: {
      accountId: string;
      resourceType: ResourceType;
      incrementBy?: number;
    }) => UsageService.checkLimit(accountId, resourceType, incrementBy),
  });
}

/**
 * Track a usage event
 */
export function useTrackUsageEvent() {
  const queryClient = useQueryClient();
  const { currentAccount } = useStore();

  return useMutation({
    mutationFn: (event: Parameters<typeof UsageService.trackEvent>[0]) =>
      UsageService.trackEvent(event),
    onSuccess: (_, variables) => {
      // Invalidate usage queries to refetch
      const accountId = variables.accountId;
      queryClient.invalidateQueries({ queryKey: usageKeys.current(accountId) });
      queryClient.invalidateQueries({ queryKey: usageKeys.history(accountId) });
      queryClient.invalidateQueries({ queryKey: usageKeys.warnings(accountId) });
      queryClient.invalidateQueries({ queryKey: usageKeys.summary(accountId) });
    },
  });
}

/**
 * Sync usage counters (force recalculation)
 */
export function useSyncUsageCounters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => UsageService.syncUsageCounters(accountId),
    onSuccess: (_, accountId) => {
      // Invalidate all usage queries
      queryClient.invalidateQueries({ queryKey: usageKeys.byAccount(accountId) });
    },
  });
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Check if any resource is approaching limits
 */
export function useHasWarnings(accountId?: string) {
  const { data: warnings } = useUsageWarnings(accountId);
  return warnings?.hasWarnings || false;
}

/**
 * Get the most critical warning
 */
export function useCriticalWarning(accountId?: string) {
  const { data: warnings } = useUsageWarnings(accountId);

  if (!warnings || !warnings.hasWarnings) return null;

  // Find critical warnings first
  const critical = warnings.warnings.find((w) => w.level === 'critical');
  if (critical) return critical;

  // Then high warnings
  const high = warnings.warnings.find((w) => w.level === 'warning');
  if (high) return high;

  // Finally notices
  return warnings.warnings[0];
}

/**
 * Check if a specific resource is at or near limit
 */
export function useIsResourceLimited(
  resourceType: 'users' | 'projects' | 'datasets' | 'aiRequests' | 'storage',
  threshold: number = 90,
  accountId?: string
) {
  const { data: usage } = useUsage(accountId);

  if (!usage) return false;

  const metric = usage[resourceType];
  return metric.percentage >= threshold;
}

/**
 * Get formatted usage string for display
 */
export function useFormattedUsage(
  resourceType: 'users' | 'projects' | 'datasets' | 'aiRequests' | 'storage',
  accountId?: string
) {
  const { data: usage } = useUsage(accountId);

  if (!usage) return null;

  const metric = usage[resourceType];

  if (metric.unlimited) {
    return `${metric.current} (Unlimited)`;
  }

  if (resourceType === 'storage') {
    return `${UsageService.formatBytes(metric.current)} / ${UsageService.formatBytes(metric.limit)}`;
  }

  return `${metric.current} / ${metric.limit}`;
}
