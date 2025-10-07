import { useState } from 'react';
import { Users, Settings, CreditCard, BarChart, Shield } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { SubscriptionManagement } from './SubscriptionManagement';

type AdminTab = 'users' | 'subscription' | 'settings' | 'analytics' | 'audit';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const tabs = [
    { id: 'users' as const, label: 'User Management', icon: Users },
    { id: 'subscription' as const, label: 'Subscription', icon: CreditCard },
    { id: 'settings' as const, label: 'Company Settings', icon: Settings },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart },
    { id: 'audit' as const, label: 'Audit Logs', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage your company settings and users</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${isActive
                        ? 'border-primary-500 text-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'subscription' && <SubscriptionManagement />}
            {activeTab === 'settings' && <CompanySettings />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'audit' && <AuditLogs />}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanySettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Company Settings</h2>
      <p className="text-gray-600">Company settings coming soon...</p>
    </div>
  );
}

function Analytics() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Analytics</h2>
      <p className="text-gray-600">Analytics dashboard coming soon...</p>
    </div>
  );
}

function AuditLogs() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
      <p className="text-gray-600">Audit logs available for Enterprise plans...</p>
    </div>
  );
}
