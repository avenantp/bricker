import { Check, CreditCard, Calendar, AlertCircle, TrendingUp, Users, Folder, Database, Zap, HardDrive } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useSubscriptionPlans, useCurrentSubscription, usePlanSelection, useYearlySavings } from '@/hooks/useSubscription';
import { useUsage, useUsageWarnings } from '@/hooks/useUsage';
import { UsageService } from '@/services/usage-service';

export function SubscriptionManagementEnhanced() {
  const { currentAccount } = useStore();

  // Use our new hooks
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans({ publicOnly: true });
  const { data: currentSub } = useCurrentSubscription();
  const { data: usage } = useUsage();
  const { data: warnings } = useUsageWarnings();

  // Plan selection state
  const {
    billingCycle,
    setBillingCycle,
    selectedPlan,
  } = usePlanSelection(currentSub?.plan?.id);

  const currentPlan = currentSub?.plan;
  const trialDaysRemaining = currentAccount?.trial_end_date
    ? Math.max(0, Math.ceil((new Date(currentAccount.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isTrial = currentAccount?.subscription_status === 'trialing';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription & Billing</h2>
        <p className="text-sm text-gray-600">Manage your subscription plan and monitor usage</p>
      </div>

      {/* Current Status */}
      {isTrial && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900">Trial Period</h3>
            <p className="text-sm text-orange-700 mt-1">
              You have {trialDaysRemaining} days remaining in your free trial.
              Upgrade to continue using Uroq after your trial ends.
            </p>
          </div>
        </div>
      )}

      {currentPlan && !isTrial && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-green-900">Active Subscription</h3>
              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                {currentAccount?.subscription_tier?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              You're currently on the <strong>{currentPlan.displayName}</strong> plan.
            </p>
          </div>
        </div>
      )}

      {/* Usage Warnings */}
      {warnings?.hasWarnings && (
        <div className={`border rounded-lg p-4 mb-6 flex items-start gap-3 ${
          warnings.warnings[0].level === 'critical'
            ? 'bg-red-50 border-red-200'
            : warnings.warnings[0].level === 'warning'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            warnings.warnings[0].level === 'critical'
              ? 'text-red-600'
              : warnings.warnings[0].level === 'warning'
              ? 'text-orange-600'
              : 'text-yellow-600'
          }`} />
          <div className="flex-1">
            <h3 className={`font-medium ${
              warnings.warnings[0].level === 'critical'
                ? 'text-red-900'
                : warnings.warnings[0].level === 'warning'
                ? 'text-orange-900'
                : 'text-yellow-900'
            }`}>
              {warnings.warnings[0].level === 'critical' ? 'Critical' : 'Usage Warning'}
            </h3>
            <p className={`text-sm mt-1 ${
              warnings.warnings[0].level === 'critical'
                ? 'text-red-700'
                : warnings.warnings[0].level === 'warning'
                ? 'text-orange-700'
                : 'text-yellow-700'
            }`}>
              You're at {warnings.warnings[0].percentage}% of your {warnings.warnings[0].resource} limit.
              {warnings.warnings[0].level === 'critical' && ' Upgrade now to avoid service interruption.'}
            </p>
            {warnings.warnings.length > 1 && (
              <p className={`text-xs mt-2 ${
                warnings.warnings[0].level === 'critical'
                  ? 'text-red-600'
                  : warnings.warnings[0].level === 'warning'
                  ? 'text-orange-600'
                  : 'text-yellow-600'
              }`}>
                +{warnings.warnings.length - 1} more warning{warnings.warnings.length - 1 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Usage Overview */}
      {usage && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Current Usage
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Users */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>Team</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {usage.users.current}
                {!usage.users.unlimited && <span className="text-sm text-gray-500">/{usage.users.limit}</span>}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.users.percentage >= 90 ? 'bg-red-500' :
                    usage.users.percentage >= 80 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usage.users.percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Projects */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Folder className="w-4 h-4" />
                <span>Projects</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {usage.projects.current}
                {!usage.projects.unlimited && <span className="text-sm text-gray-500">/{usage.projects.limit}</span>}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.projects.percentage >= 90 ? 'bg-red-500' :
                    usage.projects.percentage >= 80 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usage.projects.percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Datasets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Database className="w-4 h-4" />
                <span>Datasets</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {usage.datasets.current}
                {!usage.datasets.unlimited && <span className="text-sm text-gray-500">/{usage.datasets.limit}</span>}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.datasets.percentage >= 90 ? 'bg-red-500' :
                    usage.datasets.percentage >= 80 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usage.datasets.percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* AI Requests */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Zap className="w-4 h-4" />
                <span>AI Requests</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {usage.aiRequests.current}
                {!usage.aiRequests.unlimited && <span className="text-sm text-gray-500">/{usage.aiRequests.limit}</span>}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.aiRequests.percentage >= 90 ? 'bg-red-500' :
                    usage.aiRequests.percentage >= 80 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usage.aiRequests.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Resets {new Date(usage.aiRequests.resetsAt).toLocaleDateString()}
              </p>
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HardDrive className="w-4 h-4" />
                <span>Storage</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {UsageService.formatBytes(usage.storage.currentMb)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.storage.percentage >= 90 ? 'bg-red-500' :
                    usage.storage.percentage >= 80 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usage.storage.percentage, 100)}%` }}
                />
              </div>
              {!usage.storage.unlimited && (
                <p className="text-xs text-gray-500">
                  of {UsageService.formatBytes(usage.storage.limitMb)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={`text-sm ${billingCycle === 'monthly' ? 'font-semibold' : 'text-gray-600'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm ${billingCycle === 'yearly' ? 'font-semibold' : 'text-gray-600'}`}>
          Yearly <span className="text-green-600">(Save 17%)</span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plansLoading ? (
          <div className="col-span-3 text-center py-12 text-gray-500">Loading plans...</div>
        ) : (
          plans?.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            const isCurrentPlan = currentPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-lg border-2 p-6 ${
                  isCurrentPlan
                    ? 'border-primary-500 bg-primary-50'
                    : plan.isRecommended
                    ? 'border-primary-300 bg-white relative'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.isRecommended && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.displayName}</h3>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    {price === null ? (
                      <span className="text-2xl font-bold">Contact us</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-gray-600 ml-2">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}

                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {plan.maxUsers === -1
                        ? 'Unlimited team members'
                        : `Up to ${plan.maxUsers} team members`}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {plan.maxProjects === -1
                        ? 'Unlimited projects'
                        : `Up to ${plan.maxProjects} projects`}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {plan.maxMonthlyAiRequests === -1
                        ? 'Unlimited AI requests'
                        : `${plan.maxMonthlyAiRequests} AI requests/month`}
                    </span>
                  </li>
                </ul>

                <button
                  disabled={isCurrentPlan}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : plan.isRecommended
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'btn-primary'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : price === null ? 'Contact Sales' : 'Upgrade'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
