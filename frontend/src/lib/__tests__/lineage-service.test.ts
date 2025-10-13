/**
 * Unit tests for lineage-service
 * Tests column-level data lineage tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLineage,
  getLineage,
  getLineageWithDetails,
  updateLineage,
  deleteLineage,
  getColumnLineage,
  getDatasetLineage,
  getWorkspaceLineage,
  batchDeleteLineages,
  deleteColumnLineages,
} from '../lineage-service';
import { supabase } from '../supabase';
import {
  createMockLineage,
  createMockColumn,
  createMockDataset,
  mockSupabaseSuccess,
  mockSupabaseError,
} from '../../test/test-utils';
import type { CreateLineagePayload, UpdateLineagePayload } from '../../types/lineage';

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('lineage-service', () => {
  const mockUserId = 'user_test_123';
  const mockWorkspaceId = 'ws_test_123';
  const mockLineageId = 'lin_test_123';
  const mockColumnId = 'col_test_123';
  const mockDatasetId = 'ds_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLineage', () => {
    it('should create a new lineage successfully', async () => {
      const payload: CreateLineagePayload = {
        workspace_id: mockWorkspaceId,
        downstream_dataset_id: 'ds_target_123',
        downstream_column_id: 'col_target_123',
        upstream_dataset_id: 'ds_source_123',
        upstream_column_id: 'col_source_123',
        mapping_type: 'direct',
      };

      const mockLineage = createMockLineage({
        downstream_dataset_id: payload.downstream_dataset_id,
        upstream_dataset_id: payload.upstream_dataset_id,
      });

      const mockInsertChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockLineage)),
      };

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockUpdateChain as any).mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any)
        .mockReturnValueOnce(mockInsertChain)
        .mockReturnValueOnce(mockUpdateChain)
        .mockReturnValueOnce({ from: vi.fn().mockReturnThis() }); // Audit log

      const result = await createLineage(payload, mockUserId);

      expect(result).toEqual(mockLineage);
      expect(supabase.from).toHaveBeenCalledWith('lineage');
    });

    it('should throw error if creation fails', async () => {
      const payload: CreateLineagePayload = {
        workspace_id: mockWorkspaceId,
        downstream_dataset_id: 'ds_target_123',
        downstream_column_id: 'col_target_123',
        upstream_dataset_id: 'ds_source_123',
        upstream_column_id: 'col_source_123',
        mapping_type: 'direct',
      };

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Creation failed')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(createLineage(payload, mockUserId)).rejects.toThrow(
        'Failed to create lineage: Creation failed'
      );
    });
  });

  describe('getLineage', () => {
    it('should fetch lineage by ID successfully', async () => {
      const mockLineage = createMockLineage({ lineage_id: mockLineageId });

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockLineage)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getLineage(mockLineageId);

      expect(result).toEqual(mockLineage);
      expect(mockChain.eq).toHaveBeenCalledWith('lineage_id', mockLineageId);
    });

    it('should return null if lineage not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Not found', 'PGRST116')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getLineage(mockLineageId);

      expect(result).toBeNull();
    });
  });

  describe('getLineageWithDetails', () => {
    it('should fetch lineage with full details', async () => {
      const mockLineageWithDetails = {
        lineage_id: mockLineageId,
        downstream_dataset: { name: 'Target Dataset', fqn: 'main.bronze.target' },
        downstream_column: { name: 'target_col' },
        upstream_dataset: { name: 'Source Dataset', fqn: 'main.bronze.source' },
        upstream_column: { name: 'source_col' },
      };

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockLineageWithDetails)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getLineageWithDetails(mockLineageId);

      expect(result).toBeDefined();
      expect(result?.downstream_dataset_name).toBe('Target Dataset');
      expect(result?.upstream_dataset_name).toBe('Source Dataset');
    });
  });

  describe('updateLineage', () => {
    it('should update lineage successfully', async () => {
      const payload: UpdateLineagePayload = {
        transformation_expression: 'CAST(source_col AS STRING)',
      };

      const mockLineage = createMockLineage({
        lineage_id: mockLineageId,
        transformation_expression: payload.transformation_expression,
      });

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockLineage)),
      };

      const mockMarkUncommittedChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockMarkUncommittedChain as any).mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any)
        .mockReturnValueOnce(mockUpdateChain)
        .mockReturnValueOnce(mockMarkUncommittedChain)
        .mockReturnValueOnce({ from: vi.fn().mockReturnThis() }); // Audit log

      const result = await updateLineage(mockLineageId, payload, mockUserId);

      expect(result.transformation_expression).toBe(payload.transformation_expression);
    });
  });

  describe('deleteLineage', () => {
    it('should delete lineage successfully', async () => {
      const mockLineage = createMockLineage({ lineage_id: mockLineageId });

      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockLineage)),
      };

      const mockDeleteChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockDeleteChain as any).mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any)
        .mockReturnValueOnce(mockGetChain)
        .mockReturnValueOnce(mockDeleteChain);

      await deleteLineage(mockLineageId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('lineage');
    });

    it('should throw error if lineage not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Not found', 'PGRST116')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(deleteLineage(mockLineageId, mockUserId)).rejects.toThrow(
        'Lineage not found'
      );
    });
  });

  describe('getColumnLineage', () => {
    it('should fetch upstream and downstream lineages for a column', async () => {
      const mockColumn = {
        column_id: mockColumnId,
        name: 'test_column',
        dataset_id: mockDatasetId,
        datasets: { name: 'Test Dataset' },
      };

      const mockUpstreamLineages = [
        {
          lineage_id: 'lin_1',
          downstream_dataset: { name: 'Target', fqn: 'main.bronze.target' },
          downstream_column: { name: 'target_col' },
          upstream_dataset: { name: 'Source1', fqn: 'main.bronze.source1' },
          upstream_column: { name: 'source1_col' },
        },
      ];

      const mockDownstreamLineages = [
        {
          lineage_id: 'lin_2',
          downstream_dataset: { name: 'Target2', fqn: 'main.silver.target2' },
          downstream_column: { name: 'target2_col' },
          upstream_dataset: { name: 'Source', fqn: 'main.bronze.source' },
          upstream_column: { name: 'source_col' },
        },
      ];

      const mockGetColumnChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
      };

      const mockUpstreamChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockUpstreamChain as any).mockResolvedValue(mockSupabaseSuccess(mockUpstreamLineages));

      const mockDownstreamChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockDownstreamChain as any).mockResolvedValue(mockSupabaseSuccess(mockDownstreamLineages));

      (supabase.from as any)
        .mockReturnValueOnce(mockGetColumnChain)
        .mockReturnValueOnce(mockUpstreamChain)
        .mockReturnValueOnce(mockDownstreamChain);

      const result = await getColumnLineage(mockColumnId);

      expect(result.column_id).toBe(mockColumnId);
      expect(result.upstream_lineages).toHaveLength(1);
      expect(result.downstream_lineages).toHaveLength(1);
    });

    it('should throw error if column not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(getColumnLineage(mockColumnId)).rejects.toThrow('Column not found');
    });
  });

  describe('getDatasetLineage', () => {
    it('should fetch upstream and downstream datasets', async () => {
      const mockDataset = createMockDataset({
        dataset_id: mockDatasetId,
        name: 'Test Dataset',
        fqn: 'main.bronze.test',
      });

      const mockColumns = [
        { column_id: 'col_1' },
        { column_id: 'col_2' },
      ];

      const mockUpstreamLineages = [
        {
          upstream_dataset_id: 'ds_source_1',
          datasets: { name: 'Source 1', fqn: 'main.landing.source1' },
        },
      ];

      const mockDownstreamLineages = [
        {
          downstream_dataset_id: 'ds_target_1',
          datasets: { name: 'Target 1', fqn: 'main.silver.target1' },
        },
      ];

      const mockGetDatasetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      const mockGetColumnsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockGetColumnsChain as any).mockResolvedValue(mockSupabaseSuccess(mockColumns));

      const mockUpstreamChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      };

      (mockUpstreamChain as any).mockResolvedValue(mockSupabaseSuccess(mockUpstreamLineages));

      const mockDownstreamChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      };

      (mockDownstreamChain as any).mockResolvedValue(mockSupabaseSuccess(mockDownstreamLineages));

      (supabase.from as any)
        .mockReturnValueOnce(mockGetDatasetChain)
        .mockReturnValueOnce(mockGetColumnsChain)
        .mockReturnValueOnce(mockUpstreamChain)
        .mockReturnValueOnce(mockDownstreamChain);

      const result = await getDatasetLineage(mockDatasetId);

      expect(result.dataset_id).toBe(mockDatasetId);
      expect(result.upstream_datasets).toHaveLength(1);
      expect(result.downstream_datasets).toHaveLength(1);
    });

    it('should handle dataset with no columns', async () => {
      const mockDataset = createMockDataset({ dataset_id: mockDatasetId });

      const mockGetDatasetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      const mockGetColumnsChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockGetColumnsChain as any).mockResolvedValue(mockSupabaseSuccess([]));

      (supabase.from as any)
        .mockReturnValueOnce(mockGetDatasetChain)
        .mockReturnValueOnce(mockGetColumnsChain);

      const result = await getDatasetLineage(mockDatasetId);

      expect(result.upstream_datasets).toHaveLength(0);
      expect(result.downstream_datasets).toHaveLength(0);
    });
  });

  describe('getWorkspaceLineage', () => {
    it('should fetch all lineages in a workspace', async () => {
      const mockLineages = [
        {
          lineage_id: 'lin_1',
          downstream_dataset: { name: 'Target1', fqn: 'main.bronze.target1' },
          downstream_column: { name: 'col1' },
          upstream_dataset: { name: 'Source1', fqn: 'main.landing.source1' },
          upstream_column: { name: 'src1' },
        },
        {
          lineage_id: 'lin_2',
          downstream_dataset: { name: 'Target2', fqn: 'main.silver.target2' },
          downstream_column: { name: 'col2' },
          upstream_dataset: { name: 'Source2', fqn: 'main.bronze.source2' },
          upstream_column: { name: 'src2' },
        },
      ];

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockChain as any).mockResolvedValue(mockSupabaseSuccess(mockLineages));
      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getWorkspaceLineage(mockWorkspaceId);

      expect(result).toHaveLength(2);
      expect(result[0].downstream_dataset_name).toBe('Target1');
      expect(result[1].upstream_dataset_name).toBe('Source2');
    });
  });

  describe('batchDeleteLineages', () => {
    it('should delete multiple lineages successfully', async () => {
      const lineageIds = ['lin_1', 'lin_2', 'lin_3'];

      // Mock successful deletions
      lineageIds.forEach(() => {
        const mockGetChain = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(createMockLineage())),
        };

        const mockDeleteChain = {
          from: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };

        (mockDeleteChain as any).mockResolvedValue(mockSupabaseSuccess(null));
      });

      const result = await batchDeleteLineages(lineageIds, mockUserId);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('deleteColumnLineages', () => {
    it('should delete all lineages involving a column', async () => {
      const mockLineages = [
        { lineage_id: 'lin_1' },
        { lineage_id: 'lin_2' },
      ];

      const mockGetLineagesChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };

      (mockGetLineagesChain as any).mockResolvedValue(mockSupabaseSuccess(mockLineages));

      // Mock successful deletions
      mockLineages.forEach(() => {
        const mockGetChain = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(createMockLineage())),
        };

        const mockDeleteChain = {
          from: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };

        (mockDeleteChain as any).mockResolvedValue(mockSupabaseSuccess(null));
      });

      (supabase.from as any).mockReturnValueOnce(mockGetLineagesChain);

      await deleteColumnLineages(mockColumnId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('lineage');
    });

    it('should handle column with no lineages', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };

      (mockChain as any).mockResolvedValue(mockSupabaseSuccess([]));
      (supabase.from as any).mockReturnValue(mockChain);

      // Should not throw
      await deleteColumnLineages(mockColumnId, mockUserId);
    });
  });
});
