/**
 * DiagramTestPage - Test page for Dataset Diagram View
 * Loads mock data and demonstrates all diagram features
 */

import { useEffect } from 'react';
import { DatasetDiagramView } from '../components/Diagram/DatasetDiagramView';
import { useDiagramStore } from '../store/diagramStore';
import { generateMockDiagramData } from '../utils/mockDiagramData';
import { TopBar } from '../components/Layout/TopBar';
import { NavigationSidebar } from '../components/Layout/NavigationSidebar';

export function DiagramTestPage() {
  const { setNodes, setEdges, applyLayout, setContext } = useDiagramStore();

  useEffect(() => {
    // Set test context
    setContext('test-account-id', 'test-workspace-id', 'dataset');

    // Generate mock data with 12 nodes
    const mockData = generateMockDiagramData(12);

    // Load nodes and relationship edges
    setNodes(mockData.nodes);
    setEdges(mockData.relationshipEdges);

    // Apply initial hierarchical layout after a short delay
    setTimeout(() => {
      applyLayout('hierarchical');
    }, 100);
  }, [setNodes, setEdges, applyLayout, setContext]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <NavigationSidebar />
        <main className="flex-1 relative">
          <DatasetDiagramView />
        </main>
      </div>
    </div>
  );
}
