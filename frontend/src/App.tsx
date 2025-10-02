import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { PropertiesPanel } from './components/Layout/PropertiesPanel';
import { FlowCanvas } from './components/Flow/FlowCanvas';
import { ChatInterface } from './components/Chat/ChatInterface';
import { AuthPage } from './components/Auth/AuthPage';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './hooks/useWorkspace';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: workspacesLoading } = useWorkspace();
  const { currentWorkspace, setCurrentWorkspace } = useStore();

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspace) {
      const firstWorkspace = workspaces[0];
      setCurrentWorkspace({
        id: firstWorkspace.id,
        name: firstWorkspace.name,
        owner_id: firstWorkspace.owner_id,
        created_at: new Date(firstWorkspace.created_at),
      });
    }
  }, [workspaces, currentWorkspace, setCurrentWorkspace]);

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show loading while fetching workspaces
  if (workspacesLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
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
  );
}

export default App;
