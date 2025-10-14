import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { UroqLogo } from '@/components/Logo/UroqLogo';

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

export function SubscriptionSelectionPage() {
  console.log('[SubscriptionSelection] Component mounted');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  console.log('[SubscriptionSelection] User:', user?.email);
  console.log('[SubscriptionSelection] Loading:', loading);
  console.log('[SubscriptionSelection] Plans count:', plans.length);

  useEffect(() => {
    console.log('[SubscriptionSelection] useEffect triggered');
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      console.log('[SubscriptionSelection] Loading plans...');
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) {
        console.error('[SubscriptionSelection] Error loading plans:', error);
        throw error;
      }
      console.log('[SubscriptionSelection] Plans loaded:', data);
      setPlans(data || []);
    } catch (error) {
      console.error('[SubscriptionSelection] Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      console.error('[SubscriptionSelection] No user found');
      return;
    }

    console.log('[SubscriptionSelection] Selecting plan:', planId, 'for user:', user.id);
    setSelecting(true);
    try {
      // Check if user already has an account (via account_users)
      console.log('[SubscriptionSelection] Checking for existing account...');
      const { data: userAccounts, error: accountCheckError } = await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .single();

      if (accountCheckError && accountCheckError.code !== 'PGRST116') {
        console.error('[SubscriptionSelection] Error checking account:', accountCheckError);
        throw accountCheckError;
      }

      let accountId = userAccounts?.account_id;
      console.log('[SubscriptionSelection] Existing account ID:', accountId);

      if (!accountId) {
        // Create account if it doesn't exist
        console.log('[SubscriptionSelection] Creating new account...');
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts')
          .insert({
            name: `${user.email}'s Account`,
            account_type: 'individual',
            current_plan_id: planId,
            subscription_status: 'trialing',
            trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('id')
          .single();

        if (accountError) {
          console.error('[SubscriptionSelection] Error creating account:', accountError);
          throw accountError;
        }
        accountId = newAccount.id;
        console.log('[SubscriptionSelection] Created account with ID:', accountId);

        // Add user as owner in account_users table
        console.log('[SubscriptionSelection] Adding user as account owner...');
        const { error: accountUserError } = await supabase
          .from('account_users')
          .insert({
            account_id: accountId,
            user_id: user.id,
            role: 'owner',
          });

        if (accountUserError) {
          console.error('[SubscriptionSelection] Error adding account user:', accountUserError);
          throw accountUserError;
        }
      } else {
        // Update existing account
        console.log('[SubscriptionSelection] Updating existing account...');
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            current_plan_id: planId,
            subscription_status: 'trialing',
            trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', accountId);

        if (updateError) {
          console.error('[SubscriptionSelection] Error updating account:', updateError);
          throw updateError;
        }
        console.log('[SubscriptionSelection] Account updated');
      }

      // Navigate to home page (users will create projects and workspaces later)
      console.log('[SubscriptionSelection] Plan selection complete, navigating to home');
      navigate('/');
    } catch (error: any) {
      console.error('[SubscriptionSelection] Failed to select plan:', error);
      alert(`Failed to select plan: ${error.message || 'Please try again.'}`);
    } finally {
      setSelecting(false);
    }
  };

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UroqLogo size="sm" showText={true} />
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Skip for now
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600">
            Start with a 14-day free trial. No credit card required.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
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
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading plans...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
              const isPopular = index === 1; // Middle plan is usually most popular

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border-2 p-8 bg-white relative ${
                    isPopular
                      ? 'border-primary-500 shadow-xl scale-105'
                      : 'border-gray-200 shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.display_name}</h3>
                    <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-bold">${price}</span>
                      <span className="text-gray-600 ml-2">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && plan.price_monthly && (
                      <p className="text-sm text-gray-500 mt-1">
                        ${(price / 12).toFixed(0)}/month billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}

                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">
                        {plan.max_team_members === -1
                          ? 'Unlimited team members'
                          : `Up to ${plan.max_team_members} team members`}
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">
                        {plan.max_projects === -1
                          ? 'Unlimited projects'
                          : `Up to ${plan.max_projects} projects`}
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">
                        {plan.max_workspaces === -1
                          ? 'Unlimited workspaces'
                          : `Up to ${plan.max_workspaces} workspaces`}
                      </span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={selecting}
                    className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'btn-primary'
                        : 'border-2 border-primary-500 text-primary-700 hover:bg-primary-50'
                    }`}
                  >
                    {selecting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Start Free Trial
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-600">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Cancel anytime during your trial with no charges.
          </p>
        </div>
      </div>
    </div>
  );
}
