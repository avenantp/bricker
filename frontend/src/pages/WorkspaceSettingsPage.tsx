import { useParams } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { WorkspaceSettings } from '@/components/Settings/WorkspaceSettings';

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-8">
        <WorkspaceSettings />
      </div>
    </div>
  );
}
