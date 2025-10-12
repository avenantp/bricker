import { useState, useEffect } from 'react';
import { supabase, Database } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { hasDevAdminAccess } from '@/config/env';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];

export function useWorkspace() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
      setLoading(false);
    }
  }, [user]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query workspaces directly - RLS policy handles filtering to user's workspaces
      // The policy checks workspace_members (which now has RLS disabled, so no recursion)
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (workspacesError) throw workspacesError;

      setWorkspaces(workspacesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      console.error('Error loading workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (name: string, description?: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Use RPC function to create workspace and add owner as member in one transaction
      // This bypasses RLS policies and avoids circular dependency issues
      const { data: workspaceData, error: workspaceError } = await supabase
        .rpc('create_workspace_with_owner', {
          p_name: name,
          p_description: description || null,
          p_github_repo_url: null,
        })
        .single();

      if (workspaceError) throw workspaceError;

      // Map the returned fields to the expected structure
      const workspace = {
        id: workspaceData.workspace_id,
        name: workspaceData.workspace_name,
        description: workspaceData.workspace_description,
        owner_id: workspaceData.workspace_owner_id,
        github_repo_url: workspaceData.workspace_github_repo_url,
        created_at: workspaceData.workspace_created_at,
        updated_at: workspaceData.workspace_updated_at,
      };

      await loadWorkspaces();
      return workspace;
    } catch (err) {
      console.error('Error creating workspace:', err);
      throw err;
    }
  };

  const updateWorkspace = async (
    workspaceId: string,
    updates: Database['public']['Tables']['workspaces']['Update']
  ) => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;

      await loadWorkspaces();
      return data;
    } catch (err) {
      console.error('Error updating workspace:', err);
      throw err;
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;

      await loadWorkspaces();
    } catch (err) {
      console.error('Error deleting workspace:', err);
      throw err;
    }
  };

  const getUserRole = async (workspaceId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.role || null;
    } catch (err) {
      console.error('Error getting user role:', err);
      return null;
    }
  };

  const inviteMember = async (
    workspaceId: string,
    userId: string,
    role: 'admin' | 'editor' | 'viewer'
  ) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error inviting member:', err);
      throw err;
    }
  };

  const removeMember = async (workspaceId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  };

  return {
    workspaces,
    loading,
    error,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getUserRole,
    inviteMember,
    removeMember,
    refreshWorkspaces: loadWorkspaces,
  };
}
