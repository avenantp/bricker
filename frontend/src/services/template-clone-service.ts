import { supabase } from '../lib/supabase';
import { GitHubClient } from '../lib/github-api';
import yaml from 'js-yaml';
import {
  TemplateFragment,
  TemplateComposition,
  CompositionNodeData,
  CompositionEdgeData,
} from '../types/template';

/**
 * Clone a system template to a workspace
 */
export async function cloneTemplateComposition(
  sourceCompositionId: string,
  targetWorkspaceId: string,
  userId: string,
  customName?: string
): Promise<TemplateComposition> {
  // Get source composition
  const { data: source, error: fetchError } = await supabase
    .from('template_compositions')
    .select('*')
    .eq('id', sourceCompositionId)
    .single();

  if (fetchError) throw fetchError;

  // Create cloned composition
  const clonedName = customName || `${source.name} (Copy)`;
  const { data: cloned, error: cloneError } = await supabase
    .from('template_compositions')
    .insert({
      workspace_id: targetWorkspaceId,
      name: clonedName,
      description: source.description,
      language: source.language,
      flow_data: source.flow_data,
      is_system_template: false,
      cloned_from_id: sourceCompositionId,
      created_by: userId,
    })
    .select()
    .single();

  if (cloneError) throw cloneError;

  return cloned;
}

/**
 * Clone a template fragment to a workspace
 */
export async function cloneTemplateFragment(
  sourceFragmentId: string,
  targetWorkspaceId: string,
  userId: string,
  customName?: string
): Promise<TemplateFragment> {
  // Get source fragment
  const { data: source, error: fetchError } = await supabase
    .from('template_fragments')
    .select('*')
    .eq('id', sourceFragmentId)
    .single();

  if (fetchError) throw fetchError;

  // Create cloned fragment
  const clonedName = customName || `${source.name} (Copy)`;
  const { data: cloned, error: cloneError } = await supabase
    .from('template_fragments')
    .insert({
      workspace_id: targetWorkspaceId,
      name: clonedName,
      description: source.description,
      category: source.category,
      language: source.language,
      fragment_content: source.fragment_content,
      variables: source.variables,
      dependencies: source.dependencies,
      is_public: false,
      is_system_template: false,
      cloned_from_id: sourceFragmentId,
      created_by: userId,
    })
    .select()
    .single();

  if (cloneError) throw cloneError;

  return cloned;
}

/**
 * Convert template composition to YAML
 */
export function compositionToYAML(composition: TemplateComposition, compiledTemplate?: string): string {
  const yamlData = {
    metadata: {
      id: composition.id,
      name: composition.name,
      description: composition.description || '',
      language: composition.language,
      version: '1.0.0', // TODO: Get from composition
      author: composition.created_by,
      created_at: composition.created_at,
      updated_at: composition.updated_at,
      is_system_template: composition.is_system_template,
      cloned_from: composition.cloned_from_id,
      tags: [], // TODO: Add tags support
    },
    flow: {
      nodes: composition.flow_data.nodes.map((node: CompositionNodeData) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: composition.flow_data.edges.map((edge: CompositionEdgeData) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
        source_handle: edge.data?.condition ? 'conditional' : undefined,
      })),
    },
    compiled_template: compiledTemplate || '',
    validation: {
      is_valid: true,
      errors: [],
      warnings: [],
      last_validated_at: new Date().toISOString(),
    },
  };

  return yaml.dump(yamlData, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
  });
}

/**
 * Convert template fragment to YAML
 */
export function fragmentToYAML(fragment: TemplateFragment): string {
  const yamlData = {
    metadata: {
      id: fragment.id,
      name: fragment.name,
      description: fragment.description || '',
      category: fragment.category,
      language: fragment.language,
      version: '1.0.0',
      author: fragment.created_by,
      created_at: fragment.created_at,
      updated_at: fragment.updated_at,
      is_system_template: fragment.is_system_template,
      cloned_from: fragment.cloned_from_id,
    },
    variables: fragment.variables,
    dependencies: fragment.dependencies,
    content: fragment.fragment_content,
  };

  return yaml.dump(yamlData, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
  });
}

/**
 * Parse YAML to template composition
 */
export function yamlToComposition(yamlContent: string, workspaceId: string, userId: string): Omit<TemplateComposition, 'id' | 'created_at' | 'updated_at'> {
  const data = yaml.load(yamlContent) as any;

  return {
    workspace_id: workspaceId,
    name: data.metadata.name,
    description: data.metadata.description,
    language: data.metadata.language,
    flow_data: {
      nodes: data.flow.nodes,
      edges: data.flow.edges,
    },
    is_system_template: data.metadata.is_system_template || false,
    cloned_from_id: data.metadata.cloned_from || null,
    github_path: null,
    yaml_valid: true,
    yaml_errors: [],
    last_validated_at: null,
    created_by: userId,
    is_archived: false,
  };
}

/**
 * Parse YAML to template fragment
 */
export function yamlToFragment(yamlContent: string, workspaceId: string, userId: string): Omit<TemplateFragment, 'id' | 'created_at' | 'updated_at'> {
  const data = yaml.load(yamlContent) as any;

  return {
    workspace_id: workspaceId,
    name: data.metadata.name,
    description: data.metadata.description,
    category: data.metadata.category,
    language: data.metadata.language,
    fragment_content: data.content,
    variables: data.variables || [],
    dependencies: data.dependencies || [],
    is_public: false,
    is_system_template: data.metadata.is_system_template || false,
    cloned_from_id: data.metadata.cloned_from || null,
    github_path: null,
    created_by: userId,
  };
}

/**
 * Sync template composition to GitHub
 */
export async function syncCompositionToGitHub(
  composition: TemplateComposition,
  githubToken: string,
  repoOwner: string,
  repoName: string,
  branch: string = 'main',
  compiledTemplate?: string
): Promise<string> {
  const yamlContent = compositionToYAML(composition, compiledTemplate);
  const slug = composition.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const filePath = `metadata/templates/compositions/${slug}.yaml`;

  const client = new GitHubClient(githubToken);

  try {
    // Try to get existing file SHA
    const { sha } = await client.getFileContent(repoOwner, repoName, filePath, branch);
    // Update existing file
    await client.upsertFile(
      repoOwner,
      repoName,
      filePath,
      yamlContent,
      `Update template composition: ${composition.name}`,
      branch,
      sha
    );
  } catch (error) {
    // File doesn't exist, create new
    await client.upsertFile(
      repoOwner,
      repoName,
      filePath,
      yamlContent,
      `Add template composition: ${composition.name}`,
      branch
    );
  }

  // Update github_path in database
  await supabase
    .from('template_compositions')
    .update({ github_path: filePath })
    .eq('id', composition.id);

  return filePath;
}

/**
 * Sync template fragment to GitHub
 */
export async function syncFragmentToGitHub(
  fragment: TemplateFragment,
  githubToken: string,
  repoOwner: string,
  repoName: string,
  branch: string = 'main'
): Promise<string> {
  const yamlContent = fragmentToYAML(fragment);
  const slug = fragment.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const filePath = `metadata/templates/fragments/${fragment.category}/${slug}.yaml`;

  const client = new GitHubClient(githubToken);

  try {
    // Try to get existing file SHA
    const { sha } = await client.getFileContent(repoOwner, repoName, filePath, branch);
    // Update existing file
    await client.upsertFile(
      repoOwner,
      repoName,
      filePath,
      yamlContent,
      `Update template fragment: ${fragment.name}`,
      branch,
      sha
    );
  } catch (error) {
    // File doesn't exist, create new
    await client.upsertFile(
      repoOwner,
      repoName,
      filePath,
      yamlContent,
      `Add template fragment: ${fragment.name}`,
      branch
    );
  }

  // Update github_path in database
  await supabase
    .from('template_fragments')
    .update({ github_path: filePath })
    .eq('id', fragment.id);

  return filePath;
}

/**
 * Get all system templates (read-only unless in dev mode)
 */
export async function getSystemTemplateCompositions(): Promise<TemplateComposition[]> {
  const { data, error } = await supabase
    .from('template_compositions')
    .select('*')
    .eq('is_system_template', true)
    .eq('is_archived', false)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get all system fragments (read-only unless in dev mode)
 */
export async function getSystemTemplateFragments(): Promise<TemplateFragment[]> {
  const { data, error } = await supabase
    .from('template_fragments')
    .select('*')
    .eq('is_system_template', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Check if user can edit template (respects dev mode)
 */
export async function canEditComposition(
  compositionId: string,
  userId: string,
  isDevMode: boolean
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_edit_template_composition', {
    composition_uuid: compositionId,
    user_uuid: userId,
    dev_mode_enabled: isDevMode,
  });

  if (error) {
    console.error('Permission check error:', error);
    return false;
  }

  return data || false;
}

/**
 * Check if user can edit fragment (respects dev mode)
 */
export async function canEditFragment(
  fragmentId: string,
  userId: string,
  isDevMode: boolean
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_edit_template_fragment', {
    fragment_uuid: fragmentId,
    user_uuid: userId,
    dev_mode_enabled: isDevMode,
  });

  if (error) {
    console.error('Permission check error:', error);
    return false;
  }

  return data || false;
}
