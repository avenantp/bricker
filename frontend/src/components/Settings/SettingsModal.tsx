import { useState } from 'react';
import { X, Settings as SettingsIcon, Moon, Sun } from 'lucide-react';
import { GitHubSettings } from './GitHubSettings';
import { useStore } from '@/store/useStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'github' | 'general'>('github');
  const { isDarkMode, toggleDarkMode } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('github')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'github'
                ? 'text-primary-500 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            GitHub Integration
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-primary-500 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            General
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'github' && <GitHubSettings />}
          {activeTab === 'general' && (
            <div className="p-6 space-y-6">
              {/* Appearance Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h3>

                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? (
                      <Moon className="w-5 h-5 text-gray-700" />
                    ) : (
                      <Sun className="w-5 h-5 text-gray-700" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Dark Mode</p>
                      <p className="text-sm text-gray-500">
                        {isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDarkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Other Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Settings</h3>
                <p className="text-gray-500 text-sm">More settings coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
