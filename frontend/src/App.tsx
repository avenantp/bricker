import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { PropertiesPanel } from './components/Layout/PropertiesPanel';
import { FlowCanvas } from './components/Flow/FlowCanvas';
import { ChatInterface } from './components/Chat/ChatInterface';
import { AuthPage } from './components/Auth/AuthPage';
import { HomePage } from './components/Home/HomePage';
import { AdminPanel } from './components/Admin/AdminPanel';
import { TemplateEditorPage } from './pages/TemplateEditorPage';
import { TemplateLibrary } from './components/Templates/TemplateLibrary';
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage';
import { SubscriptionSelectionPage } from './pages/SubscriptionSelectionPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { useAuth } from './hooks/useAuth';
import { useDevMode } from './hooks/useDevMode';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { isDevMode, isReady: devModeReady, hasAdminAccess } = useDevMode();
  const { isDarkMode } = useStore();

  // Apply dark mode class to html element
  useEffect(() => {
    console.log('[App] isDarkMode changed:', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      console.log('[App] Added dark class to html');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('[App] Removed dark class from html');
    }
    console.log('[App] HTML classes:', document.documentElement.className);
  }, [isDarkMode]);

  return (
    <BrowserRouter>
      {/* Show loading screen while checking auth */}
      {authLoading ? (
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
            <p className="text-xs text-gray-500 mt-2">
              If this takes too long, check browser console for errors
            </p>
          </div>
        </div>
      ) : !user ? (
        /* Show auth page if not logged in (even in dev mode) */
        <AuthPage />
      ) : (
        <AppRoutes devModeReady={devModeReady} hasAdminAccess={hasAdminAccess} isDevMode={isDevMode} />
      )}
    </BrowserRouter>
  );
}

// Separate component for routes to use useLocation
function AppRoutes({ devModeReady, hasAdminAccess, isDevMode }: { devModeReady: boolean; hasAdminAccess: boolean; isDevMode: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const isSubscriptionPage = location.pathname === '/select-subscription';

  // Check if user has a subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setCheckingSubscription(false);
        return;
      }

      try {
        console.log('[App] Checking subscription for user:', user.id);

        // Check if user has an account with a subscription
        const { data: userAccount, error: userAccountError } = await supabase
          .from('account_users')
          .select('account_id')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .single();

        if (userAccountError && userAccountError.code !== 'PGRST116') {
          console.error('[App] Error checking user account:', userAccountError);
        }

        let accounts = null;
        let error = null;

        if (userAccount?.account_id) {
          const { data, error: accountError } = await supabase
            .from('accounts')
            .select('id, current_plan_id, subscription_status')
            .eq('id', userAccount.account_id)
            .single();

          accounts = data;
          error = accountError;
        }

        console.log('[App] Account data:', accounts);

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new users
          console.error('[App] Error checking subscription:', error);
        }

        const hasSub = !!accounts?.current_plan_id;
        setHasSubscription(hasSub);
        console.log('[App] Has subscription:', hasSub);

        // Redirect to subscription page if no subscription and not already there
        if (!hasSub && !isSubscriptionPage) {
          console.log('[App] No subscription found, redirecting to subscription selection');
          navigate('/select-subscription');
        }
      } catch (error) {
        console.error('[App] Failed to check subscription:', error);
        setHasSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user, isSubscriptionPage, navigate]);

  // Show loading if devMode is not ready, unless we're on the subscription page
  if (!devModeReady && !isSubscriptionPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">
            {isDevMode ? 'Setting up dev mode...' : 'Loading...'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            If this takes too long, check browser console for errors
          </p>
        </div>
      </div>
    );
  }

  // Show loading while checking subscription
  if (checkingSubscription && !isSubscriptionPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Home page - redirects to projects */}
      <Route path="/" element={<Navigate to="/projects" replace />} />

      {/* Projects Management */}
      <Route path="/projects" element={<ProjectsPage />} />

      {/* Workspaces Management for a specific project */}
      <Route path="/projects/:projectId/workspaces" element={<WorkspacesPage />} />

      {/* Connections Management for a specific workspace */}
      <Route path="/workspaces/:workspaceId/connections" element={<ConnectionsPage />} />

      {/* Legacy home page (for backward compatibility during migration) */}
      <Route path="/home" element={<HomePage />} />

      {/* Subscription selection page - accessible immediately after signup */}
      <Route path="/select-subscription" element={<SubscriptionSelectionPage />} />

      {/* Admin panel - only for owners and admins */}
      <Route path="/admin" element={<AdminRoute hasAdminAccess={hasAdminAccess}><AdminPanel /></AdminRoute>} />

      {/* Workspace settings */}
      <Route path="/workspace/:workspaceId/settings" element={<WorkspaceSettingsPage />} />

      {/* Template Management - Dev Mode Only */}
      <Route path="/templates" element={<DevModeRoute isDevMode={isDevMode}><TemplateLibrary /></DevModeRoute>} />
      <Route path="/templates/new" element={<DevModeRoute isDevMode={isDevMode}><TemplateEditorPage /></DevModeRoute>} />
      <Route path="/templates/:compositionId" element={<DevModeRoute isDevMode={isDevMode}><TemplateEditorPage /></DevModeRoute>} />

      {/* Workspace flow canvas - for creating new project */}
      <Route
        path="/workspace/:workspaceId/new"
        element={
          <div className="h-screen flex flex-col overflow-hidden">
            <Header />
            <div className="flex-1 flex overflow-hidden">
              <Sidebar />
              <main className="flex-1 relative">
                <ReactFlowProvider>
                  <FlowCanvas />
                </ReactFlowProvider>
              </main>
              <PropertiesPanel />
            </div>
            <ChatInterface />
          </div>
        }
      />

      {/* Workspace flow canvas - for editing existing project */}
      <Route
        path="/workspace/:workspaceId/project/:projectId"
        element={
          <div className="h-screen flex flex-col overflow-hidden">
            <Header />
            <div className="flex-1 flex overflow-hidden">
              <Sidebar />
              <main className="flex-1 relative">
                <ReactFlowProvider>
                  <FlowCanvas />
                </ReactFlowProvider>
              </main>
              <PropertiesPanel />
            </div>
            <ChatInterface />
          </div>
        }
      />

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Route protection component
function AdminRoute({ children, hasAdminAccess }: { children: React.ReactNode; hasAdminAccess: boolean }) {
  const { userRole } = useStore();

  // In dev mode with admin access, always allow
  if (hasAdminAccess) {
    return <>{children}</>;
  }

  if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Dev mode only route protection
function DevModeRoute({ children, isDevMode }: { children: React.ReactNode; isDevMode: boolean }) {
  if (!isDevMode) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default App;
