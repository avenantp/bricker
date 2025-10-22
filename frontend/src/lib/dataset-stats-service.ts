/**
 * Dataset Statistics Service
 * Fetches counts for columns, relationships, and lineage
 */

import { supabase } from './supabase';

export interface DatasetStats {
  columnCount: number;
  relationshipCount: number;
  lineageCount: {
    upstream: number;
    downstream: number;
  };
}

/**
 * Get statistics for a dataset
 */
export async function getDatasetStats(datasetId: string): Promise<DatasetStats> {
  try {
    // Get column count
    const { count: columnCount, error: columnError } = await supabase
      .from('columns')
      .select('*', { count: 'exact', head: true })
      .eq('dataset_id', datasetId);

    if (columnError) {
      console.error('[DatasetStats] Error fetching column count:', columnError);
    }

    // Get relationship count (columns that have references)
    const { count: relationshipCount, error: relationshipError } = await supabase
      .from('columns')
      .select('*', { count: 'exact', head: true })
      .eq('dataset_id', datasetId)
      .not('reference_column_id', 'is', null);

    if (relationshipError) {
      console.error('[DatasetStats] Error fetching relationship count:', relationshipError);
    }

    // Get upstream count (lineage where this dataset is downstream)
    const { count: upstreamCount, error: upstreamError } = await supabase
      .from('lineage')
      .select('*', { count: 'exact', head: true })
      .eq('downstream_dataset_id', datasetId);

    if (upstreamError) {
      console.error('[DatasetStats] Error fetching upstream count:', upstreamError);
    }

    // Get downstream count (lineage where this dataset is upstream)
    const { count: downstreamCount, error: downstreamError } = await supabase
      .from('lineage')
      .select('*', { count: 'exact', head: true })
      .eq('upstream_dataset_id', datasetId);

    if (downstreamError) {
      console.error('[DatasetStats] Error fetching downstream count:', downstreamError);
    }

    return {
      columnCount: columnCount || 0,
      relationshipCount: relationshipCount || 0,
      lineageCount: {
        upstream: upstreamCount || 0,
        downstream: downstreamCount || 0,
      },
    };
  } catch (error) {
    console.error('[DatasetStats] Failed to fetch dataset stats:', error);
    return {
      columnCount: 0,
      relationshipCount: 0,
      lineageCount: { upstream: 0, downstream: 0 },
    };
  }
}
