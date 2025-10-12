/**
 * Project service for CRUD operations
 * Handles all project-related database interactions via Supabase
 */

import { supabase } from './supabase';
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectFilters,
  ProjectDeletionInfo,
} from '../types/project';

/**
 * Fetch all projects for a workspace
 */
export async function getProjects(
  workspaceId: string,
  filters?: ProjectFilters
): Promise<Project[]> {
  let query = supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId);

  // Apply filters
  if (filters?.project_type) {
    query = query.eq('project_type', filters.project_type);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  const sortBy = filters?.sort_by || 'created_at';
  const sortOrder = filters?.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return data;
}

/**
 * Create a new project
 */
export async function createProject(
  payload: CreateProjectPayload
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      workspace_id: payload.workspace_id,
      name: payload.name,
      description: payload.description || null,
      project_type: payload.project_type,
      configuration: payload.configuration || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing project
 */
export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  if (payload.project_type !== undefined)
    updateData.project_type = payload.project_type;
  if (payload.configuration !== undefined)
    updateData.configuration = payload.configuration;

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data;
}

/**
 * Delete a project
 * Returns information about dependencies that will be cascade deleted
 */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

/**
 * Get project deletion info (dependencies that will be cascade deleted)
 */
export async function getProjectDeletionInfo(
  projectId: string
): Promise<ProjectDeletionInfo> {
  // Fetch project
  const project = await getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Count data models
  const { count: dataModelsCount, error: modelsError } = await supabase
    .from('data_models')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (modelsError) {
    throw new Error(`Failed to count data models: ${modelsError.message}`);
  }

  // Count UUID registry entries
  const { count: uuidRegistryCount, error: registryError } = await supabase
    .from('uuid_registry')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (registryError) {
    throw new Error(`Failed to count UUID registry: ${registryError.message}`);
  }

  const hasDependencies =
    (dataModelsCount || 0) > 0 || (uuidRegistryCount || 0) > 0;

  return {
    project,
    data_models_count: dataModelsCount || 0,
    uuid_registry_count: uuidRegistryCount || 0,
    has_dependencies: hasDependencies,
  };
}

/**
 * Check if user has access to project
 * (via workspace membership)
 */
export async function hasProjectAccess(
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      workspace_id,
      workspaces!inner (
        workspace_members!inner (
          user_id
        )
      )
    `
    )
    .eq('id', projectId)
    .eq('workspaces.workspace_members.user_id', userId)
    .single();

  if (error) {
    return false;
  }

  return !!data;
}

/**
 * Get user's role for a project's workspace
 */
export async function getProjectUserRole(
  projectId: string,
  userId: string
): Promise<'owner' | 'admin' | 'editor' | 'viewer' | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      workspace_id,
      workspaces!inner (
        workspace_members!inner (
          user_id,
          role
        )
      )
    `
    )
    .eq('id', projectId)
    .eq('workspaces.workspace_members.user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  // Extract role from nested structure
  const workspaces = (data as any).workspaces;
  if (workspaces?.workspace_members?.[0]?.role) {
    return workspaces.workspace_members[0].role;
  }

  return null;
}

/**
 * Duplicate a project (with or without data models)
 */
export async function duplicateProject(
  projectId: string,
  newName: string,
  includeDataModels = false
): Promise<Project> {
  const original = await getProject(projectId);
  if (!original) {
    throw new Error('Project not found');
  }

  // Create new project
  const newProject = await createProject({
    workspace_id: original.workspace_id,
    name: newName,
    description: original.description
      ? `Copy of ${original.description}`
      : null,
    project_type: original.project_type,
    configuration: original.configuration,
  });

  // Optionally duplicate data models
  if (includeDataModels) {
    const { data: dataModels, error } = await supabase
      .from('data_models')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to fetch data models: ${error.message}`);
    }

    if (dataModels && dataModels.length > 0) {
      const newModels = dataModels.map((model) => ({
        ...model,
        id: undefined, // Let DB generate new ID
        project_id: newProject.id,
        name: `${model.name} (copy)`,
        created_at: undefined,
        updated_at: undefined,
      }));

      const { error: insertError } = await supabase
        .from('data_models')
        .insert(newModels);

      if (insertError) {
        throw new Error(`Failed to duplicate data models: ${insertError.message}`);
      }
    }
  }

  return newProject;
}
