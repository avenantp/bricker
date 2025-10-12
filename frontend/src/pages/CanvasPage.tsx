/**
 * Canvas Page
 * Main page for the project canvas view
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { ProjectCanvas } from '../components/Canvas';
import { getProject } from '../lib/project-service';
import type { Project } from '../types/project';
import type { CanvasNode, CanvasEdge } from '../types/canvas';

export function CanvasPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [saved, setSaved] = useState(false);

  // Load project
  useEffect(() => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getProject(projectId);
      if (!data) {
        setError('Project not found');
        return;
      }

      setProject(data);

      // TODO: Load nodes and edges from GitHub/Supabase
      // For now, create sample data
      const sampleNodes: CanvasNode[] = [
        {
          id: '1',
          type: 'dataNode',
          position: { x: 250, y: 100 },
          data: {
            uuid: 'uuid-1',
            fqn: 'main.bronze.customers',
            project_id: projectId,
            name: 'customers',
            medallion_layer: 'Bronze',
            entity_type: 'Table',
            entity_subtype: null,
            materialization_type: 'Table',
            description: 'Customer master data from source system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ai_confidence_score: 95,
          },
        },
        {
          id: '2',
          type: 'dataNode',
          position: { x: 500, y: 100 },
          data: {
            uuid: 'uuid-2',
            fqn: 'main.silver.hub_customer',
            project_id: projectId,
            name: 'hub_customer',
            medallion_layer: 'Silver',
            entity_type: 'DataVault',
            entity_subtype: 'Hub',
            materialization_type: 'Table',
            description: 'Customer hub containing business keys',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ai_confidence_score: 88,
          },
        },
        {
          id: '3',
          type: 'dataNode',
          position: { x: 750, y: 100 },
          data: {
            uuid: 'uuid-3',
            fqn: 'main.gold.dim_customer',
            project_id: projectId,
            name: 'dim_customer',
            medallion_layer: 'Gold',
            entity_type: 'DataMart',
            entity_subtype: 'Dimension',
            materialization_type: 'Table',
            description: 'Customer dimension for analytics',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ai_confidence_score: 92,
          },
        },
      ];

      const sampleEdges: CanvasEdge[] = [
        {
          id: 'e1-2',
          source: '1',
          target: '2',
          type: 'relationship',
          data: {
            relationship_type: 'FK',
            cardinality: '1:1',
          },
        },
        {
          id: 'e2-3',
          source: '2',
          target: '3',
          type: 'relationship',
          data: {
            relationship_type: 'FK',
            cardinality: '1:M',
          },
        },
      ];

      setNodes(sampleNodes);
      setEdges(sampleEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (savedNodes: CanvasNode[], savedEdges: CanvasEdge[]) => {
    // TODO: Save nodes and edges to GitHub/Supabase
    console.log('Saving:', { nodes: savedNodes, edges: savedEdges });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNodesChange = (updatedNodes: CanvasNode[]) => {
    setNodes(updatedNodes);
  };

  const handleEdgesChange = (updatedEdges: CanvasEdge[]) => {
    setEdges(updatedEdges);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading canvas...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading canvas</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {project.description || 'Data model canvas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Save className="w-4 h-4" />
                Saved
              </span>
            )}
            <button
              onClick={() => navigate(`/projects/${projectId}/settings`)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Project Type Badge */}
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`px-3 py-1 text-xs font-medium rounded ${
              project.project_type === 'DataVault'
                ? 'bg-purple-100 text-purple-700'
                : project.project_type === 'Dimensional'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {project.project_type}
          </span>
          {project.configuration?.medallion_layers_enabled && (
            <span className="px-3 py-1 text-xs font-medium rounded bg-amber-100 text-amber-700">
              Medallion Architecture
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ProjectCanvas
          projectId={project.id}
          initialNodes={nodes}
          initialEdges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
