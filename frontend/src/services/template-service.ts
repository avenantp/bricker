import { supabase } from '../lib/supabase';
import {
  TemplateFragment,
  TemplateComposition,
  TemplateCompositionVersion,
} from '../types/template';

/**
 * Template Fragment Service
 */

export async function createTemplateFragment(
  fragment: Omit<TemplateFragment, 'id' | 'created_at' | 'updated_at'>
): Promise<TemplateFragment> {
  const { data, error } = await supabase
    .from('template_fragments')
    .insert(fragment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTemplateFragments(
  workspaceId: string
): Promise<TemplateFragment[]> {
  const { data, error } = await supabase
    .from('template_fragments')
    .select('*')
    .or(`workspace_id.eq.${workspaceId},is_public.eq.true`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTemplateFragment(
  fragmentId: string
): Promise<TemplateFragment> {
  const { data, error } = await supabase
    .from('template_fragments')
    .select('*')
    .eq('id', fragmentId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTemplateFragment(
  fragmentId: string,
  updates: Partial<TemplateFragment>
): Promise<TemplateFragment> {
  const { data, error } = await supabase
    .from('template_fragments')
    .update(updates)
    .eq('id', fragmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTemplateFragment(fragmentId: string): Promise<void> {
  const { error } = await supabase
    .from('template_fragments')
    .delete()
    .eq('id', fragmentId);

  if (error) throw error;
}

/**
 * Template Composition Service
 */

export async function createTemplateComposition(
  composition: Omit<TemplateComposition, 'id' | 'created_at' | 'updated_at'>
): Promise<TemplateComposition> {
  const { data, error } = await supabase
    .from('template_compositions')
    .insert(composition)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTemplateCompositions(
  workspaceId: string
): Promise<TemplateComposition[]> {
  const { data, error } = await supabase
    .from('template_compositions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTemplateComposition(
  compositionId: string
): Promise<TemplateComposition> {
  const { data, error } = await supabase
    .from('template_compositions')
    .select('*')
    .eq('id', compositionId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTemplateComposition(
  compositionId: string,
  updates: Partial<TemplateComposition>
): Promise<TemplateComposition> {
  const { data, error } = await supabase
    .from('template_compositions')
    .update(updates)
    .eq('id', compositionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTemplateComposition(
  compositionId: string
): Promise<void> {
  const { error } = await supabase
    .from('template_compositions')
    .update({ is_archived: true })
    .eq('id', compositionId);

  if (error) throw error;
}

/**
 * Template Composition Version Service
 */

export async function createCompositionVersion(
  compositionId: string,
  flowData: TemplateComposition['flow_data'],
  compiledTemplate: string,
  changeSummary: string,
  userId: string
): Promise<TemplateCompositionVersion> {
  // Get the next version number
  const { data: versions, error: versionError } = await supabase
    .from('template_composition_versions')
    .select('version_number')
    .eq('composition_id', compositionId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (versionError) throw versionError;

  const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

  const { data, error } = await supabase
    .from('template_composition_versions')
    .insert({
      composition_id: compositionId,
      version_number: nextVersion,
      flow_data: flowData,
      compiled_template: compiledTemplate,
      created_by: userId,
      change_summary: changeSummary,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCompositionVersions(
  compositionId: string
): Promise<TemplateCompositionVersion[]> {
  const { data, error } = await supabase
    .from('template_composition_versions')
    .select('*')
    .eq('composition_id', compositionId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCompositionVersion(
  compositionId: string,
  versionNumber: number
): Promise<TemplateCompositionVersion> {
  const { data, error } = await supabase
    .from('template_composition_versions')
    .select('*')
    .eq('composition_id', compositionId)
    .eq('version_number', versionNumber)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Search and Filter
 */

export async function searchTemplateFragments(
  workspaceId: string,
  query: string,
  category?: string
): Promise<TemplateFragment[]> {
  let queryBuilder = supabase
    .from('template_fragments')
    .select('*')
    .or(`workspace_id.eq.${workspaceId},is_public.eq.true`)
    .ilike('name', `%${query}%`);

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  const { data, error } = await queryBuilder.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getFragmentsByCategory(
  workspaceId: string,
  category: string
): Promise<TemplateFragment[]> {
  const { data, error } = await supabase
    .from('template_fragments')
    .select('*')
    .or(`workspace_id.eq.${workspaceId},is_public.eq.true`)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
