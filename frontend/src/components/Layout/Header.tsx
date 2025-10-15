import { Sparkles, Settings, LogOut, User, Code2, FlaskConical } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useDevMode } from '@/hooks/useDevMode';
import { WorkspaceSelector } from '../Auth/WorkspaceSelector';
import { ProjectSelector } from '../Project/ProjectSelector';
import { SettingsModal } from '../Settings/SettingsModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { toggleChat, currentWorkspace } = useStore();
  const { user, signOut } = useAuth();
  const { isDevMode } = useDevMode();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Force reload to clear dev mode state
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      {/* Logo and Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Uroq</h1>
          <p className="text-xs text-gray-500">Automation Builder</p>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Workspace Selector - always shown */}
        <WorkspaceSelector />

        {/* Project Selector - shown when a workspace is selected */}
        {currentWorkspace && <ProjectSelector />}

        {/* Dev Mode - Template Editor */}
        {isDevMode && (
          <button
            onClick={() => navigate('/templates')}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-sm"
            title="Template Editor (Dev Mode)"
          >
            <FlaskConical className="w-4 h-4" />
            <span className="text-sm font-medium">Templates</span>
          </button>
        )}

        {/* AI Assistant Toggle */}
        <button
          onClick={toggleChat}
          className="btn-icon"
          title="Toggle AI Assistant"
        >
          <Sparkles className="w-5 h-5 text-secondary-600" />
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="btn-icon"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="btn-icon flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-3 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.email || 'Dev User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isDevMode ? 'Dev Mode' : 'Signed in'}
                  </div>
                </div>
                <div className="p-2">
                  {isDevMode && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/templates');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors mb-1"
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span className="text-sm font-medium">Templates</span>
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </header>
  );
}
