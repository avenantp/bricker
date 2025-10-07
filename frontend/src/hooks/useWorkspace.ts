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
    // In dev mode, skip workspace loading
    if (hasDevAdminAccess()) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

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

      // Get workspaces where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user!.id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setWorkspaces([]);
        return;
      }

      const workspaceIds = memberData.map((m) => m.workspace_id);

      // Get workspace details
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds)
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
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name,
          description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as owner in workspace_members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

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
