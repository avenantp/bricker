import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsageWarnings } from '@/hooks/useUsage';
import { useStore } from '@/store/useStore';

/**
 * LimitWarningBanner - Global banner for displaying usage limit warnings
 *
 * This component should be placed at the top of the application layout
 * to provide app-wide visibility of critical usage warnings.
 *
 * Features:
 * - Auto-shows when any resource reaches warning/critical levels
 * - Dismissible by user (stores in localStorage)
 * - Direct navigation to subscription management
 * - Color-coded by severity (warning/critical)
 * - Shows most critical warning first
 */
export function LimitWarningBanner() {
  const navigate = useNavigate();
  const { currentAccount } = useStore();
  const { data: warnings } = useUsageWarnings();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    // Load dismissed warnings from localStorage
    const stored = localStorage.getItem('dismissedWarnings');
    return stored ? JSON.parse(stored) : [];
  });

  if (!warnings?.hasWarnings || !currentAccount) {
    return null;
  }

  // Filter out dismissed warnings
  const activeWarnings = warnings.warnings.filter(
    (w) => !dismissed.includes(`${currentAccount.id}-${w.resource}`)
  );

  if (activeWarnings.length === 0) {
    return null;
  }

  // Show the most critical warning
  const warning = activeWarnings[0];

  const handleDismiss = () => {
    const warningKey = `${currentAccount.id}-${warning.resource}`;
    const newDismissed = [...dismissed, warningKey];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedWarnings', JSON.stringify(newDismissed));
  };

  const handleUpgrade = () => {
    navigate('/admin/subscription');
  };

  const isCritical = warning.level === 'critical';

  return (
    <div
      className={`${
        isCritical
          ? 'bg-red-600'
          : warning.level === 'warning'
          ? 'bg-orange-600'
          : 'bg-yellow-600'
      } text-white`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">
                {isCritical ? 'Critical: ' : 'Warning: '}
                {warning.resource.charAt(0).toUpperCase() + warning.resource.slice(1)} limit at{' '}
                {warning.percentage}%
              </p>
              <p className="text-sm opacity-90 mt-0.5">
                {isCritical
                  ? 'You cannot add more resources until you upgrade your plan.'
                  : `You're using ${warning.currentUsage} of ${warning.limit} available. Consider upgrading soon.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeWarnings.length > 1 && (
              <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                +{activeWarnings.length - 1} more
              </span>
            )}
            <button
              onClick={handleUpgrade}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
            >
              Upgrade Plan
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CompactLimitWarning - Compact version for use in specific pages
 *
 * Use this when you want to show warnings within a specific page
 * rather than as a global banner.
 */
export function CompactLimitWarning({ resourceType }: { resourceType?: 'users' | 'projects' | 'datasets' | 'ai_requests' | 'storage' }) {
  const navigate = useNavigate();
  const { data: warnings } = useUsageWarnings();

  if (!warnings?.hasWarnings) {
    return null;
  }

  // If resourceType is specified, filter for that resource only
  const relevantWarnings = resourceType
    ? warnings.warnings.filter((w) => w.resource === resourceType)
    : warnings.warnings;

  if (relevantWarnings.length === 0) {
    return null;
  }

  const warning = relevantWarnings[0];
  const isCritical = warning.level === 'critical';

  return (
    <div
      className={`rounded-lg p-4 flex items-start gap-3 ${
        isCritical
          ? 'bg-red-50 border border-red-200'
          : warning.level === 'warning'
          ? 'bg-orange-50 border border-orange-200'
          : 'bg-yellow-50 border border-yellow-200'
      }`}
    >
      <AlertCircle
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          isCritical ? 'text-red-600' : warning.level === 'warning' ? 'text-orange-600' : 'text-yellow-600'
        }`}
      />
      <div className="flex-1">
        <h3
          className={`font-medium ${
            isCritical ? 'text-red-900' : warning.level === 'warning' ? 'text-orange-900' : 'text-yellow-900'
          }`}
        >
          {isCritical ? 'Limit Reached' : 'Approaching Limit'}
        </h3>
        <p
          className={`text-sm mt-1 ${
            isCritical ? 'text-red-700' : warning.level === 'warning' ? 'text-orange-700' : 'text-yellow-700'
          }`}
        >
          You're at {warning.percentage}% of your {warning.resource} limit ({warning.currentUsage} of{' '}
          {warning.limit} used).
          {isCritical && ' Upgrade now to continue using this resource.'}
        </p>
        {relevantWarnings.length > 1 && (
          <p
            className={`text-xs mt-2 ${
              isCritical ? 'text-red-600' : warning.level === 'warning' ? 'text-orange-600' : 'text-yellow-600'
            }`}
          >
            +{relevantWarnings.length - 1} more warning{relevantWarnings.length - 1 > 1 ? 's' : ''}
          </p>
        )}
      </div>
      <button
        onClick={() => navigate('/admin/subscription')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
          isCritical
            ? 'bg-red-600 text-white hover:bg-red-700'
            : warning.level === 'warning'
            ? 'bg-orange-600 text-white hover:bg-orange-700'
            : 'bg-yellow-600 text-white hover:bg-yellow-700'
        }`}
      >
        Upgrade
      </button>
    </div>
  );
}

/**
 * InlineLimitWarning - Inline version for use within forms/actions
 *
 * Use this when a user is about to perform an action that would
 * exceed their limits (e.g., adding a new user, creating a project)
 */
export function InlineLimitWarning({
  resourceType,
  actionText,
}: {
  resourceType: 'users' | 'projects' | 'datasets' | 'ai_requests' | 'storage';
  actionText: string;
}) {
  const navigate = useNavigate();
  const { data: warnings } = useUsageWarnings();

  if (!warnings?.hasWarnings) {
    return null;
  }

  const warning = warnings.warnings.find((w) => w.resource === resourceType);

  if (!warning) {
    return null;
  }

  const isCritical = warning.level === 'critical';

  return (
    <div
      className={`text-sm p-3 rounded-lg flex items-start gap-2 ${
        isCritical
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-orange-50 text-orange-700 border border-orange-200'
      }`}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">
          {isCritical ? `Cannot ${actionText}` : `Limited capacity for ${actionText}`}
        </p>
        <p className="text-xs mt-1 opacity-90">
          {isCritical
            ? `You've reached your plan's ${resourceType} limit. Upgrade to continue.`
            : `You're at ${warning.percentage}% of your ${resourceType} limit. Consider upgrading.`}
        </p>
      </div>
      <button
        onClick={() => navigate('/admin/subscription')}
        className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
          isCritical
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-orange-600 text-white hover:bg-orange-700'
        }`}
      >
        Upgrade
      </button>
    </div>
  );
}
