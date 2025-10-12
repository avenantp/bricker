import { useState, useEffect } from 'react';
import { supabase, Database } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

type Project = Database['public']['Tables']['projects']['Row'];

export function useProject() {
  const { currentWorkspace } = useStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects();
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [currentWorkspace]);

  const loadProjects = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      setProjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (
    name: string,
    description?: string,
    projectType: 'Standard' | 'DataVault' | 'Dimensional' = 'Standard'
  ) => {
    if (!currentWorkspace) throw new Error('No workspace selected');

    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          workspace_id: currentWorkspace.id,
          name,
          description,
          project_type: projectType,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      await loadProjects();
      return project;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  const updateProject = async (
    projectId: string,
    updates: Database['public']['Tables']['projects']['Update']
  ) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      await loadProjects();
      return data;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      await loadProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: loadProjects,
  };
}
