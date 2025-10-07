import { useEffect, useState } from 'react';
import { Check, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  max_team_members: number | null;
  max_projects: number | null;
  max_workspaces: number | null;
  features: string[];
}

export function SubscriptionManagement() {
  const { currentCompany } = useStore();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (!currentCompany?.trial_ends_at) return 0;
    const trialEnd = new Date(currentCompany.trial_ends_at);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const currentPlan = plans.find((p) => p.id === currentCompany?.subscription_plan_id);
  const trialDaysRemaining = getTrialDaysRemaining();
  const isTrial = currentCompany?.subscription_status === 'trial';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription & Billing</h2>
        <p className="text-sm text-gray-600">Manage your subscription plan</p>
      </div>

      {/* Current Status */}
      {isTrial && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900">Trial Period</h3>
            <p className="text-sm text-orange-700 mt-1">
              You have {trialDaysRemaining} days remaining in your free trial.
              Upgrade to continue using Urck after your trial ends.
            </p>
          </div>
        </div>
      )}

      {currentPlan && !isTrial && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Active Subscription</h3>
            <p className="text-sm text-green-700 mt-1">
              You're currently on the <strong>{currentPlan.display_name}</strong> plan.
            </p>
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
        {loading ? (
          <div className="col-span-3 text-center py-12 text-gray-500">Loading plans...</div>
        ) : (
          plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isCurrentPlan = currentPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-lg border-2 p-6 ${
                  isCurrentPlan
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.display_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-gray-600 ml-2">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
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
                      {plan.max_team_members === -1
                        ? 'Unlimited team members'
                        : `Up to ${plan.max_team_members} team members`}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      {plan.max_projects === -1
                        ? 'Unlimited projects'
                        : `Up to ${plan.max_projects} projects`}
                    </span>
                  </li>
                </ul>

                <button
                  disabled={isCurrentPlan}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'btn-primary'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
