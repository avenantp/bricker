/**
 * DiagramTestPage - Test page for Dataset Diagram View
 * Loads mock data and demonstrates all diagram features
 */

import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useParams } from 'react-router-dom';
import { DatasetDiagramView } from '../components/Diagram/DatasetDiagramView';
import { DatasetTreeView } from '../components/Diagram/DatasetTreeView';
import { DatasetDetailsPanel } from '../components/Diagram/DatasetDetailsPanel';
import { DiagramTopBar } from '../components/Diagram/DiagramTopBar';
import { useDiagramStore } from '../store/diagramStore';
import { generateMockDiagramData } from '../utils/mockDiagramData';
import { CollapsedNavigationSidebar } from '../components/Layout/CollapsedNavigationSidebar';

export function DiagramTestPage() {
  const { workspaceId, diagramId } = useParams<{ workspaceId: string; diagramId: string }>();
  const { setNodes, setEdges, applyLayout, setContext, selectedDatasetId } = useDiagramStore();

  useEffect(() => {
    // Set context with actual route params (no account ID for test page)
    if (workspaceId && diagramId) {
      setContext(null, workspaceId, diagramId);
    }

    // TODO: Load actual test data
    // Mock data removed - add your own test data here
  }, [setContext, workspaceId, diagramId]);

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <DiagramTopBar />
        <div className="flex-1 flex overflow-hidden">
          {/* Collapsed Navigation Sidebar (icon-only) */}
          <CollapsedNavigationSidebar />

          {/* Dataset TreeView */}
          <DatasetTreeView
            className="w-80"
            workspaceId={workspaceId}
            diagramId={diagramId}
          />

          {/* Main Diagram Canvas */}
          <main className="flex-1 relative">
            <DatasetDiagramView />
          </main>

          {/* Dataset Details Panel (right sidebar) */}
          {selectedDatasetId && (
            <DatasetDetailsPanel className="w-96" workspaceId={workspaceId} />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
