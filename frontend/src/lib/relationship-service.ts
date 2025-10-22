/**
 * Relationship Service
 * Handles validation and creation of relationships between datasets
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { supabase } from './supabase';
import type { Node } from '../types/node';
import type { RelationshipType, Cardinality } from '../types/canvas';

// =====================================================
// Types
// =====================================================

export interface CreateRelationshipPayload {
  source_node_uuid: string;
  target_node_uuid: string;
  source_nodeitem_uuids: string[];
  target_nodeitem_uuids: string[];
  relationship_type: RelationshipType;
  cardinality: Cardinality;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// =====================================================
// Validation Functions
// =====================================================

/**
 * Check if two data types are compatible for relationships
 */
function areTypesCompatible(type1: string, type2: string): boolean {
  // Normalize types (convert to uppercase for comparison)
  const t1 = type1.toUpperCase().trim();
  const t2 = type2.toUpperCase().trim();

  // Exact match
  if (t1 === t2) return true;

  // Integer types compatibility
  const intTypes = ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT'];
  if (intTypes.includes(t1) && intTypes.includes(t2)) return true;

  // String types compatibility
  const stringTypes = ['VARCHAR', 'CHAR', 'TEXT', 'STRING'];
  if (stringTypes.some(st => t1.includes(st)) && stringTypes.some(st => t2.includes(st))) {
    return true;
  }

  // Decimal/Float types compatibility
  const numericTypes = ['DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL'];
  if (numericTypes.some(nt => t1.includes(nt)) && numericTypes.some(nt => t2.includes(nt))) {
    return true;
  }

  // UUID compatibility
  if ((t1.includes('UUID') || t1.includes('GUID')) && (t2.includes('UUID') || t2.includes('GUID'))) {
    return true;
  }

  return false;
}

/**
 * Validate relationship creation
 * Implements validation rules from specification section 7.2
 */
export function validateRelationship(
  sourceNode: Node,
  targetNode: Node,
  sourceItemUuids: string[],
  targetItemUuids: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: No self-references
  if (sourceNode.uuid === targetNode.uuid) {
    errors.push('Cannot create relationship to the same dataset');
  }

  // Rule 2: Column count match
  if (sourceItemUuids.length !== targetItemUuids.length) {
    errors.push(`Source and target column counts must match (source: ${sourceItemUuids.length}, target: ${targetItemUuids.length})`);
  }

  // Get actual column objects
  const sourceItems = sourceNode.node_items.filter(item => sourceItemUuids.includes(item.uuid));
  const targetItems = targetNode.node_items.filter(item => targetItemUuids.includes(item.uuid));

  // Rule 3: Data type compatibility
  for (let i = 0; i < Math.min(sourceItems.length, targetItems.length); i++) {
    const sourceType = sourceItems[i].data_type;
    const targetType = targetItems[i].data_type;

    if (!areTypesCompatible(sourceType, targetType)) {
      errors.push(
        `Column ${i + 1}: Incompatible data types (${sourceItems[i].name}: ${sourceType} vs ${targetItems[i].name}: ${targetType})`
      );
    }
  }

  // Rule 4: Warning if FK doesn't target PK
  const allTargetPK = targetItems.every(item => item.is_primary_key);
  if (!allTargetPK) {
    warnings.push('Best practice: Foreign key relationships typically target primary key columns');
  }

  // Rule 5: Warning if nullable columns in FK
  const hasNullableSource = sourceItems.some(item => item.is_nullable);
  if (hasNullableSource) {
    warnings.push('Some source columns are nullable, which may affect relationship integrity');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check for duplicate relationships
 */
export async function checkDuplicateRelationship(
  sourceNodeUuid: string,
  targetNodeUuid: string,
  sourceItemUuids: string[],
  targetItemUuids: string[]
): Promise<boolean> {
  try {
    // Query for existing relationships between these nodes
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .in('column_id', sourceItemUuids)
      .not('reference_column_id', 'is', null);

    if (error) throw error;

    // Check if any of the source columns already reference the target columns
    if (data) {
      for (const column of data) {
        if (targetItemUuids.includes(column.reference_column_id)) {
          return true; // Duplicate found
        }
      }
    }

    return false;
  } catch (error) {
    console.error('[RelationshipService] Error checking duplicates:', error);
    return false; // Assume no duplicate on error
  }
}

// =====================================================
// Relationship Creation
// =====================================================

/**
 * Create relationship between datasets
 * Stores relationship information in the columns table via reference_column_id
 */
export async function createRelationship(
  payload: CreateRelationshipPayload,
  githubToken?: string,
  githubRepo?: string
): Promise<void> {
  console.log('[RelationshipService] Creating relationship:', payload);

  try {
    // Check for duplicates first
    const isDuplicate = await checkDuplicateRelationship(
      payload.source_node_uuid,
      payload.target_node_uuid,
      payload.source_nodeitem_uuids,
      payload.target_nodeitem_uuids
    );

    if (isDuplicate) {
      throw new Error('A relationship already exists between these columns');
    }

    // Create relationships by updating source columns with reference_column_id
    for (let i = 0; i < payload.source_nodeitem_uuids.length; i++) {
      const sourceItemUuid = payload.source_nodeitem_uuids[i];
      const targetItemUuid = payload.target_nodeitem_uuids[i];

      // Update the source column with reference information
      const { error } = await supabase
        .from('columns')
        .update({
          reference_column_id: targetItemUuid,
          reference_type: payload.relationship_type,
          is_foreign_key: payload.relationship_type === 'FK',
        })
        .eq('column_id', sourceItemUuid);

      if (error) {
        console.error('[RelationshipService] Error updating column:', error);
        throw error;
      }
    }

    console.log('[RelationshipService] Relationship created successfully');

    // TODO: If GitHub integration is enabled, commit changes to repository
    if (githubToken && githubRepo) {
      console.log('[RelationshipService] GitHub sync not yet implemented');
      // Future: Sync relationship metadata to GitHub repository
    }
  } catch (error: any) {
    console.error('[RelationshipService] Failed to create relationship:', error);
    throw error;
  }
}

/**
 * Delete relationship between columns
 */
export async function deleteRelationship(
  sourceItemUuid: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('columns')
      .update({
        reference_column_id: null,
        reference_type: null,
        is_foreign_key: false,
      })
      .eq('column_id', sourceItemUuid);

    if (error) throw error;

    console.log('[RelationshipService] Relationship deleted successfully');
  } catch (error) {
    console.error('[RelationshipService] Failed to delete relationship:', error);
    throw error;
  }
}

/**
 * Get all relationships for a dataset
 */
export async function getDatasetRelationships(
  datasetId: string
): Promise<any[]> {
  try {
    // Get columns that have references (outgoing relationships)
    const { data: outgoing, error: outgoingError } = await supabase
      .from('columns')
      .select(`
        column_id,
        name,
        reference_column_id,
        reference_type,
        datasets!inner(dataset_id, name, fqn)
      `)
      .eq('dataset_id', datasetId)
      .not('reference_column_id', 'is', null);

    if (outgoingError) throw outgoingError;

    // Get columns that are referenced by others (incoming relationships)
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('column_id')
      .eq('dataset_id', datasetId);

    if (columnsError) throw columnsError;

    const columnIds = columns?.map(c => c.column_id) || [];

    const { data: incoming, error: incomingError } = await supabase
      .from('columns')
      .select(`
        column_id,
        name,
        reference_column_id,
        reference_type,
        datasets!inner(dataset_id, name, fqn)
      `)
      .in('reference_column_id', columnIds);

    if (incomingError) throw incomingError;

    return [
      ...(outgoing || []).map(r => ({ ...r, direction: 'outgoing' })),
      ...(incoming || []).map(r => ({ ...r, direction: 'incoming' })),
    ];
  } catch (error) {
    console.error('[RelationshipService] Failed to get relationships:', error);
    return [];
  }
}
