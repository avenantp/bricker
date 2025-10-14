import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  tier: 'free' | 'pro' | 'enterprise' | 'custom';
  displayName: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  maxUsers: number | null;
  maxProjects: number | null;
  maxDatasets: number | null;
  maxMonthlyAiRequests: number | null;
  maxStorageMb: number | null;
  maxWorkspacesPerProject: number | null;
  maxConnections: number | null;
  features: string[];
  hasGitSync: boolean;
  hasAiAssistance: boolean;
  hasDataVaultAccelerator: boolean;
  hasPrioritySupport: boolean;
  hasSso: boolean;
  hasAuditLogs: boolean;
  hasApiAccess: boolean;
  hasWhiteLabeling: boolean;
  trialDays: number;
  isActive: boolean;
  isPublic: boolean;
  isRecommended: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  accountId: string;
  planId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
  startDate: Date;
  endDate: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  canceledAt: Date | null;
  endedAt: Date | null;
  billingCycle: 'monthly' | 'yearly' | null;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  metadata: Record<string, any> | null;
}

export interface AccountWithSubscription {
  account: any;
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
}

// =====================================================
// Subscription Service
// =====================================================

export class SubscriptionService {
  /**
   * Get all available subscription plans
   */
  static async getAvailablePlans(options?: {
    publicOnly?: boolean;
    includeFeatures?: boolean;
  }): Promise<SubscriptionPlan[]> {
    try {
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (options?.publicOnly) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapPlanFromDb);
    } catch (error) {
      console.error('Failed to get available plans:', error);
      throw error;
    }
  }

  /**
   * Get a specific plan by ID
   */
  static async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.mapPlanFromDb(data);
    } catch (error) {
      console.error('Failed to get plan:', error);
      throw error;
    }
  }

  /**
   * Get plan by slug (e.g., 'free', 'pro', 'enterprise')
   */
  static async getPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.mapPlanFromDb(data);
    } catch (error) {
      console.error('Failed to get plan by slug:', error);
      throw error;
    }
  }

  /**
   * Get current account with subscription details
   */
  static async getCurrentAccountWithSubscription(
    accountId: string
  ): Promise<AccountWithSubscription> {
    try {
      // Get account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;
      if (!account) throw new Error('Account not found');

      // Get current subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      // Get current plan
      let plan: SubscriptionPlan | null = null;
      if (account.current_plan_id) {
        plan = await this.getPlanById(account.current_plan_id);
      }

      return {
        account,
        subscription: subscription ? this.mapSubscriptionFromDb(subscription) : null,
        plan,
      };
    } catch (error) {
      console.error('Failed to get account with subscription:', error);
      throw error;
    }
  }

  /**
   * Check if account is on trial
   */
  static isOnTrial(account: any): boolean {
    if (!account) return false;
    if (account.subscription_status !== 'trialing') return false;
    if (!account.trial_end_date) return false;

    const trialEnd = new Date(account.trial_end_date);
    return trialEnd > new Date();
  }

  /**
   * Get trial days remaining
   */
  static getTrialDaysRemaining(account: any): number {
    if (!this.isOnTrial(account)) return 0;

    const trialEnd = new Date(account.trial_end_date);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calculate yearly savings percentage
   */
  static calculateYearlySavings(plan: SubscriptionPlan): number {
    if (!plan.priceMonthly || !plan.priceYearly) return 0;

    const yearlyAsMonthly = plan.priceYearly / 12;
    const savings = ((plan.priceMonthly - yearlyAsMonthly) / plan.priceMonthly) * 100;
    return Math.round(savings);
  }

  /**
   * Format price for display
   */
  static formatPrice(
    amount: number | null,
    currency: string = 'usd',
    cycle?: 'monthly' | 'yearly'
  ): string {
    if (amount === null) return 'Contact us';
    if (amount === 0) return 'Free';

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

    if (cycle) {
      return `${formatted}/${cycle === 'monthly' ? 'mo' : 'yr'}`;
    }

    return formatted;
  }

  /**
   * Get price for billing cycle
   */
  static getPriceForCycle(
    plan: SubscriptionPlan,
    cycle: 'monthly' | 'yearly'
  ): number | null {
    return cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  }

  /**
   * Compare plans (useful for upgrade/downgrade logic)
   */
  static comparePlans(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): {
    isUpgrade: boolean;
    isDowngrade: boolean;
    priceDifference: number;
  } {
    const currentMonthly = currentPlan.priceMonthly || 0;
    const newMonthly = newPlan.priceMonthly || 0;

    return {
      isUpgrade: newMonthly > currentMonthly,
      isDowngrade: newMonthly < currentMonthly,
      priceDifference: newMonthly - currentMonthly,
    };
  }

  /**
   * Get subscription status badge color
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'green';
      case 'trialing':
        return 'blue';
      case 'past_due':
        return 'orange';
      case 'canceled':
      case 'unpaid':
        return 'red';
      case 'incomplete':
      case 'incomplete_expired':
        return 'gray';
      default:
        return 'gray';
    }
  }

  /**
   * Get subscription status display text
   */
  static getStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial';
      case 'past_due':
        return 'Past Due';
      case 'canceled':
        return 'Canceled';
      case 'unpaid':
        return 'Unpaid';
      case 'incomplete':
        return 'Incomplete';
      case 'incomplete_expired':
        return 'Expired';
      case 'paused':
        return 'Paused';
      default:
        return status;
    }
  }

  /**
   * Check if feature is available for account
   */
  static hasFeature(account: any, featureKey: string): boolean {
    // Map feature keys to account columns or plan features
    const featureMap: Record<string, string> = {
      git_sync: 'hasGitSync',
      ai_assistance: 'hasAiAssistance',
      data_vault_accelerator: 'hasDataVaultAccelerator',
      priority_support: 'hasPrioritySupport',
      sso: 'hasSso',
      audit_logs: 'hasAuditLogs',
      api_access: 'hasApiAccess',
      white_labeling: 'hasWhiteLabeling',
    };

    // For now, return true (you would check against plan features in production)
    return true;
  }

  /**
   * Get feature list for plan comparison
   */
  static getFeatureComparison(plans: SubscriptionPlan[]): {
    feature: string;
    values: Record<string, boolean | string>;
  }[] {
    const features = [
      'Git Sync',
      'AI Assistance',
      'Data Vault Accelerator',
      'Priority Support',
      'SSO',
      'Audit Logs',
      'API Access',
      'White Labeling',
    ];

    return features.map((feature) => {
      const values: Record<string, boolean | string> = {};
      plans.forEach((plan) => {
        // Map feature to plan property
        values[plan.slug] = this.getPlanFeatureValue(plan, feature);
      });
      return { feature, values };
    });
  }

  private static getPlanFeatureValue(plan: SubscriptionPlan, feature: string): boolean | string {
    switch (feature) {
      case 'Git Sync':
        return plan.hasGitSync;
      case 'AI Assistance':
        return plan.hasAiAssistance;
      case 'Data Vault Accelerator':
        return plan.hasDataVaultAccelerator;
      case 'Priority Support':
        return plan.hasPrioritySupport;
      case 'SSO':
        return plan.hasSso;
      case 'Audit Logs':
        return plan.hasAuditLogs;
      case 'API Access':
        return plan.hasApiAccess;
      case 'White Labeling':
        return plan.hasWhiteLabeling;
      default:
        return false;
    }
  }

  // =====================================================
  // Private Mapping Methods
  // =====================================================

  private static mapPlanFromDb(data: any): SubscriptionPlan {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      tier: data.tier,
      displayName: data.display_name,
      description: data.description,
      priceMonthly: data.price_monthly,
      priceYearly: data.price_yearly,
      currency: data.currency || 'usd',
      stripePriceIdMonthly: data.stripe_price_id_monthly,
      stripePriceIdYearly: data.stripe_price_id_yearly,
      maxUsers: data.max_users,
      maxProjects: data.max_projects,
      maxDatasets: data.max_datasets,
      maxMonthlyAiRequests: data.max_monthly_ai_requests,
      maxStorageMb: data.max_storage_mb,
      maxWorkspacesPerProject: data.max_workspaces_per_project,
      maxConnections: data.max_connections,
      features: data.features || [],
      hasGitSync: data.has_git_sync || false,
      hasAiAssistance: data.has_ai_assistance || false,
      hasDataVaultAccelerator: data.has_data_vault_accelerator || false,
      hasPrioritySupport: data.has_priority_support || false,
      hasSso: data.has_sso || false,
      hasAuditLogs: data.has_audit_logs || false,
      hasApiAccess: data.has_api_access || false,
      hasWhiteLabeling: data.has_white_labeling || false,
      trialDays: data.trial_days || 0,
      isActive: data.is_active || false,
      isPublic: data.is_public || false,
      isRecommended: data.is_recommended || false,
      sortOrder: data.sort_order || 0,
    };
  }

  private static mapSubscriptionFromDb(data: any): Subscription {
    return {
      id: data.id,
      accountId: data.account_id,
      planId: data.plan_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeCustomerId: data.stripe_customer_id,
      stripePriceId: data.stripe_price_id,
      status: data.status,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : null,
      currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : null,
      currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
      trialStart: data.trial_start ? new Date(data.trial_start) : null,
      trialEnd: data.trial_end ? new Date(data.trial_end) : null,
      canceledAt: data.canceled_at ? new Date(data.canceled_at) : null,
      endedAt: data.ended_at ? new Date(data.ended_at) : null,
      billingCycle: data.billing_cycle,
      cancelAtPeriodEnd: data.cancel_at_period_end || false,
      autoRenew: data.auto_renew || false,
      metadata: data.metadata,
    };
  }
}
