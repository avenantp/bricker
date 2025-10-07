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
import { useAuth } from './hooks/useAuth';
import { useDevMode } from './hooks/useDevMode';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { isDevMode, isReady: devModeReady } = useDevMode();

  // Show loading screen while checking auth and dev mode
  if (authLoading || (user && !devModeReady)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {isDevMode && user ? 'Setting up dev mode...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Home page with projects list */}
        <Route path="/" element={<HomePage />} />

        {/* Admin panel - only for owners and admins */}
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

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

export default App;
