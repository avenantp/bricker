import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { useAuth } from './hooks/useAuth';
import { useDevMode } from './hooks/useDevMode';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

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

  // Show loading screen while checking auth and dev mode
  if (!hasAdminAccess && (authLoading || (user && !devModeReady))) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">
            {isDevMode && user ? 'Setting up dev mode...' : 'Loading...'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            If this takes too long, check browser console for errors
          </p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in (unless dev mode with admin access)
  if (!user && !hasAdminAccess) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Home page with projects list */}
        <Route path="/" element={<HomePage />} />

        {/* Admin panel - only for owners and admins */}
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

        {/* Template Management - Dev Mode Only */}
        <Route path="/templates" element={<DevModeRoute><TemplateLibrary /></DevModeRoute>} />
        <Route path="/templates/new" element={<DevModeRoute><TemplateEditorPage /></DevModeRoute>} />
        <Route path="/templates/:compositionId" element={<DevModeRoute><TemplateEditorPage /></DevModeRoute>} />

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
    </BrowserRouter>
  );
}

// Route protection component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userRole } = useStore();
  const { hasAdminAccess } = useDevMode();

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
function DevModeRoute({ children }: { children: React.ReactNode }) {
  const { isDevMode } = useDevMode();

  if (!isDevMode) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default App;
