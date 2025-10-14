import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService, SubscriptionPlan } from '@/services/subscription-service';
import { useStore } from '@/store/useStore';

// =====================================================
// Query Keys
// =====================================================

export const subscriptionKeys = {
  all: ['subscription'] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
  plan: (planId: string) => [...subscriptionKeys.all, 'plan', planId] as const,
  planBySlug: (slug: string) => [...subscriptionKeys.all, 'plan', 'slug', slug] as const,
  byAccount: (accountId: string) => [...subscriptionKeys.all, accountId] as const,
  current: (accountId: string) => [...subscriptionKeys.byAccount(accountId), 'current'] as const,
};

// =====================================================
// Subscription Hooks
// =====================================================

/**
 * Get all available subscription plans
 */
export function useSubscriptionPlans(options?: { publicOnly?: boolean; includeFeatures?: boolean }) {
  return useQuery({
    queryKey: [...subscriptionKeys.plans(), options],
    queryFn: () => SubscriptionService.getAvailablePlans(options),
    staleTime: 300000, // 5 minutes (plans don't change often)
  });
}

/**
 * Get a specific plan by ID
 */
export function useSubscriptionPlan(planId?: string) {
  return useQuery({
    queryKey: subscriptionKeys.plan(planId || ''),
    queryFn: () => {
      if (!planId) throw new Error('No plan ID provided');
      return SubscriptionService.getPlanById(planId);
    },
    enabled: !!planId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get a plan by slug (e.g., 'free', 'pro', 'enterprise')
 */
export function useSubscriptionPlanBySlug(slug?: string) {
  return useQuery({
    queryKey: subscriptionKeys.planBySlug(slug || ''),
    queryFn: () => {
      if (!slug) throw new Error('No plan slug provided');
      return SubscriptionService.getPlanBySlug(slug);
    },
    enabled: !!slug,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get current account with subscription details
 */
export function useCurrentSubscription(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: subscriptionKeys.current(id || ''),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return SubscriptionService.getCurrentAccountWithSubscription(id);
    },
    enabled: !!id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Check if account is on trial
 */
export function useIsOnTrial(accountId?: string) {
  const { currentAccount } = useStore();
  const account = accountId ? null : currentAccount;

  if (account) {
    return SubscriptionService.isOnTrial(account);
  }

  const { data } = useCurrentSubscription(accountId);
  return data?.account ? SubscriptionService.isOnTrial(data.account) : false;
}

/**
 * Get trial days remaining
 */
export function useTrialDaysRemaining(accountId?: string) {
  const { currentAccount } = useStore();
  const account = accountId ? null : currentAccount;

  if (account) {
    return SubscriptionService.getTrialDaysRemaining(account);
  }

  const { data } = useCurrentSubscription(accountId);
  return data?.account ? SubscriptionService.getTrialDaysRemaining(data.account) : 0;
}

/**
 * Get current plan details
 */
export function useCurrentPlan(accountId?: string) {
  const { data } = useCurrentSubscription(accountId);
  return data?.plan || null;
}

/**
 * Calculate yearly savings for a plan
 */
export function useYearlySavings(plan?: SubscriptionPlan) {
  if (!plan) return 0;
  return SubscriptionService.calculateYearlySavings(plan);
}

/**
 * Compare two plans
 */
export function useComparePlans(currentPlanId?: string, newPlanId?: string) {
  const { data: currentPlan } = useSubscriptionPlan(currentPlanId);
  const { data: newPlan } = useSubscriptionPlan(newPlanId);

  if (!currentPlan || !newPlan) return null;

  return SubscriptionService.comparePlans(currentPlan, newPlan);
}

/**
 * Get formatted price for a plan and billing cycle
 */
export function useFormattedPrice(
  plan?: SubscriptionPlan,
  cycle?: 'monthly' | 'yearly'
) {
  if (!plan) return null;

  const price = SubscriptionService.getPriceForCycle(plan, cycle || 'monthly');
  return SubscriptionService.formatPrice(price, plan.currency, cycle);
}

/**
 * Check if a feature is available
 */
export function useHasFeature(featureKey: string, accountId?: string) {
  const { currentAccount } = useStore();
  const account = accountId ? null : currentAccount;

  if (account) {
    return SubscriptionService.hasFeature(account, featureKey);
  }

  const { data } = useCurrentSubscription(accountId);
  return data?.account ? SubscriptionService.hasFeature(data.account, featureKey) : false;
}

/**
 * Get feature comparison for multiple plans
 */
export function useFeatureComparison(planIds?: string[]) {
  const { data: plans } = useSubscriptionPlans();

  if (!plans || !planIds) return [];

  const selectedPlans = plans.filter((p) => planIds.includes(p.id));
  return SubscriptionService.getFeatureComparison(selectedPlans);
}

/**
 * Get recommended plan (for upgrade prompts)
 */
export function useRecommendedPlan() {
  const { data: plans } = useSubscriptionPlans({ publicOnly: true });
  return plans?.find((p) => p.isRecommended) || plans?.find((p) => p.slug === 'pro');
}

/**
 * Check if account needs upgrade (based on usage)
 */
export function useNeedsUpgrade(accountId?: string) {
  const { currentAccount } = useStore();
  const account = accountId ? null : currentAccount;

  // Simple check: if on free plan and has any usage warnings
  const tier = account?.subscription_tier || 'free';

  // Import usage hook to check warnings
  // This is a simplified version - you could enhance this logic
  return tier === 'free' && (account?.current_user_count || 0) > 1;
}

/**
 * Get subscription status color for badges
 */
export function useSubscriptionStatusColor() {
  const { currentAccount } = useStore();
  const status = currentAccount?.subscription_status || 'active';
  return SubscriptionService.getStatusColor(status);
}

/**
 * Get subscription status text
 */
export function useSubscriptionStatusText() {
  const { currentAccount } = useStore();
  const status = currentAccount?.subscription_status || 'active';
  return SubscriptionService.getStatusText(status);
}

// =====================================================
// Plan Selection Hook with State
// =====================================================

/**
 * Hook for managing plan selection flow
 */
export function usePlanSelection(initialPlanId?: string) {
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | undefined>(initialPlanId);
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');

  const { data: selectedPlan } = useSubscriptionPlan(selectedPlanId);
  const { data: currentSubscription } = useCurrentSubscription();

  const price = selectedPlan ? SubscriptionService.getPriceForCycle(selectedPlan, billingCycle) : null;
  const formattedPrice = selectedPlan ? SubscriptionService.formatPrice(price, selectedPlan.currency, billingCycle) : null;

  const comparison = currentSubscription?.plan && selectedPlan
    ? SubscriptionService.comparePlans(currentSubscription.plan, selectedPlan)
    : null;

  const yearlySavings = selectedPlan ? SubscriptionService.calculateYearlySavings(selectedPlan) : 0;

  return {
    selectedPlanId,
    selectedPlan,
    billingCycle,
    price,
    formattedPrice,
    comparison,
    yearlySavings,
    setSelectedPlanId,
    setBillingCycle,
    isUpgrade: comparison?.isUpgrade || false,
    isDowngrade: comparison?.isDowngrade || false,
  };
}

// Add React import at the top if not already imported
import React from 'react';
