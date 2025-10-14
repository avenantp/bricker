import { TrendingUp, Users, Folder, Database, Zap, HardDrive, Calendar, AlertTriangle, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useUsage, useUsageHistory, useUsageWarnings, useUsageMetrics } from '@/hooks/useUsage';
import { useCurrentSubscription } from '@/hooks/useSubscription';
import { UsageService } from '@/services/usage-service';
import { useState } from 'react';

export function UsageDashboard() {
  const { currentAccount } = useStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Hooks
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: currentSub } = useCurrentSubscription();
  const { data: warnings } = useUsageWarnings();
  const { data: history } = useUsageHistory({
    days: selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90,
  });
  const metrics = useUsageMetrics();

  if (usageLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4">Loading usage data...</p>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
        <p>Unable to load usage data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor your account's resource usage and limits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Current Plan Banner */}
      {currentSub && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{currentSub.plan.displayName} Plan</h3>
              <p className="text-primary-100 text-sm mt-1">{currentSub.plan.description}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {currentSub.plan.priceMonthly === null
                  ? 'Custom'
                  : `$${currentSub.plan.priceMonthly}`}
              </div>
              {currentSub.plan.priceMonthly !== null && (
                <div className="text-primary-100 text-sm">per month</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Critical Warnings */}
      {warnings?.hasWarnings && warnings.warnings.some((w) => w.level === 'critical') && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 text-lg">Critical Usage Alerts</h3>
              <div className="mt-3 space-y-2">
                {warnings.warnings
                  .filter((w) => w.level === 'critical')
                  .map((warning, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="font-medium text-red-900">
                          {warning.resource.charAt(0).toUpperCase() + warning.resource.slice(1)}
                        </p>
                        <p className="text-sm text-red-700">
                          {warning.currentUsage} of {warning.limit} used ({warning.percentage}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                          Upgrade Plan
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users */}
        <UsageMetricCard
          title="Team Members"
          icon={<Users className="w-6 h-6" />}
          current={usage.users.current}
          limit={usage.users.limit}
          percentage={usage.users.percentage}
          unlimited={usage.users.unlimited}
          color="blue"
          trend={metrics?.users?.trend}
          changeText={metrics?.users?.changeText}
        />

        {/* Projects */}
        <UsageMetricCard
          title="Projects"
          icon={<Folder className="w-6 h-6" />}
          current={usage.projects.current}
          limit={usage.projects.limit}
          percentage={usage.projects.percentage}
          unlimited={usage.projects.unlimited}
          color="green"
          trend={metrics?.projects?.trend}
          changeText={metrics?.projects?.changeText}
        />

        {/* Datasets */}
        <UsageMetricCard
          title="Datasets"
          icon={<Database className="w-6 h-6" />}
          current={usage.datasets.current}
          limit={usage.datasets.limit}
          percentage={usage.datasets.percentage}
          unlimited={usage.datasets.unlimited}
          color="purple"
          trend={metrics?.datasets?.trend}
          changeText={metrics?.datasets?.changeText}
        />

        {/* AI Requests */}
        <UsageMetricCard
          title="AI Requests"
          icon={<Zap className="w-6 h-6" />}
          current={usage.aiRequests.current}
          limit={usage.aiRequests.limit}
          percentage={usage.aiRequests.percentage}
          unlimited={usage.aiRequests.unlimited}
          color="yellow"
          trend={metrics?.aiRequests?.trend}
          changeText={metrics?.aiRequests?.changeText}
          footer={
            usage.aiRequests.resetsAt && (
              <p className="text-xs text-gray-500 mt-2">
                Resets {new Date(usage.aiRequests.resetsAt).toLocaleDateString()}
              </p>
            )
          }
        />

        {/* Storage */}
        <UsageMetricCard
          title="Storage"
          icon={<HardDrive className="w-6 h-6" />}
          current={usage.storage.currentMb}
          limit={usage.storage.limitMb}
          percentage={usage.storage.percentage}
          unlimited={usage.storage.unlimited}
          color="orange"
          formatValue={(val) => UsageService.formatBytes(val)}
          trend={metrics?.storage?.trend}
          changeText={metrics?.storage?.changeText}
        />

        {/* Usage Health Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Usage Health</h3>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>

          <div className="space-y-3">
            <UsageHealthItem
              label="Team Members"
              percentage={usage.users.percentage}
              status={getHealthStatus(usage.users.percentage)}
            />
            <UsageHealthItem
              label="Projects"
              percentage={usage.projects.percentage}
              status={getHealthStatus(usage.projects.percentage)}
            />
            <UsageHealthItem
              label="Datasets"
              percentage={usage.datasets.percentage}
              status={getHealthStatus(usage.datasets.percentage)}
            />
            <UsageHealthItem
              label="AI Requests"
              percentage={usage.aiRequests.percentage}
              status={getHealthStatus(usage.aiRequests.percentage)}
            />
            <UsageHealthItem
              label="Storage"
              percentage={usage.storage.percentage}
              status={getHealthStatus(usage.storage.percentage)}
            />
          </div>
        </div>
      </div>

      {/* Usage History Chart (Placeholder for future chart implementation) */}
      {history && history.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Usage Trends
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>Chart visualization coming soon</p>
            {/* Future: Add chart library like recharts or chart.js */}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {warnings?.hasWarnings && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
          <div className="space-y-3">
            {warnings.warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  warning.level === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : warning.level === 'warning'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <p className="font-medium text-gray-900">
                  {warning.resource.charAt(0).toUpperCase() + warning.resource.slice(1)} at{' '}
                  {warning.percentage}%
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {warning.level === 'critical'
                    ? 'Immediate action required. Upgrade your plan to continue using this resource.'
                    : warning.level === 'warning'
                    ? 'Consider upgrading your plan soon to avoid hitting limits.'
                    : 'You may want to review your usage and consider upgrading for more capacity.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Usage Metric Card Component
function UsageMetricCard({
  title,
  icon,
  current,
  limit,
  percentage,
  unlimited,
  color,
  formatValue,
  trend,
  changeText,
  footer,
}: {
  title: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'orange';
  formatValue?: (val: number) => string;
  trend?: 'up' | 'down' | 'stable';
  changeText?: string;
  footer?: React.ReactNode;
}) {
  const colorClasses = {
    blue: {
      icon: 'text-blue-600',
      bg: 'bg-blue-50',
      progress: 'bg-blue-500',
    },
    green: {
      icon: 'text-green-600',
      bg: 'bg-green-50',
      progress: 'bg-green-500',
    },
    purple: {
      icon: 'text-purple-600',
      bg: 'bg-purple-50',
      progress: 'bg-purple-500',
    },
    yellow: {
      icon: 'text-yellow-600',
      bg: 'bg-yellow-50',
      progress: 'bg-yellow-500',
    },
    orange: {
      icon: 'text-orange-600',
      bg: 'bg-orange-50',
      progress: 'bg-orange-500',
    },
  };

  const classes = colorClasses[color];
  const displayCurrent = formatValue ? formatValue(current) : current.toLocaleString();
  const displayLimit = formatValue ? formatValue(limit) : limit.toLocaleString();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className={`p-2 rounded-lg ${classes.bg} ${classes.icon}`}>{icon}</div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{displayCurrent}</span>
            {!unlimited && <span className="text-gray-500">/ {displayLimit}</span>}
          </div>
          {unlimited && <p className="text-sm text-gray-500 mt-1">Unlimited</p>}
        </div>

        {!unlimited && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">{percentage.toFixed(1)}% used</span>
              {trend && changeText && (
                <span
                  className={`flex items-center gap-1 ${
                    trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  {trend === 'up' && <ArrowUp className="w-3 h-3" />}
                  {trend === 'down' && <ArrowDown className="w-3 h-3" />}
                  {changeText}
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentage >= 90
                    ? 'bg-red-500'
                    : percentage >= 80
                    ? 'bg-orange-500'
                    : classes.progress
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {footer}
      </div>
    </div>
  );
}

// Usage Health Item Component
function UsageHealthItem({
  label,
  percentage,
  status,
}: {
  label: string;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical';
}) {
  const statusConfig = {
    healthy: { color: 'bg-green-500', text: 'Healthy', textColor: 'text-green-700' },
    warning: { color: 'bg-orange-500', text: 'Warning', textColor: 'text-orange-700' },
    critical: { color: 'bg-red-500', text: 'Critical', textColor: 'text-red-700' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
        <span className={`text-xs font-medium ${config.textColor}`}>{config.text}</span>
      </div>
    </div>
  );
}

// Helper function to determine health status
function getHealthStatus(percentage: number): 'healthy' | 'warning' | 'critical' {
  if (percentage >= 90) return 'critical';
  if (percentage >= 75) return 'warning';
  return 'healthy';
}
