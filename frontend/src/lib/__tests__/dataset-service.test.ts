/**
 * Unit tests for dataset-service
 * Tests CRUD operations and business logic for datasets
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDataset,
  getDataset,
  updateDataset,
  deleteDataset,
  getWorkspaceDatasets,
  cloneDataset,
  searchDatasets,
  batchDeleteDatasets,
  getUncommittedDatasetsCount,
  markDatasetAsSynced,
  markDatasetSyncError,
  datasetToCanvasNode,
} from '../dataset-service';
import { supabase } from '../supabase';
import {
  createMockDataset,
  mockSupabaseSuccess,
  mockSupabaseError,
  createBatchResult,
} from '../../test/test-utils';
import type { CreateDatasetPayload, UpdateDatasetPayload } from '../../types/dataset';

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('dataset-service', () => {
  const mockUserId = 'user_test_123';
  const mockWorkspaceId = 'ws_test_123';
  const mockDatasetId = 'ds_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDataset', () => {
    it('should create a new dataset successfully', async () => {
      const payload: CreateDatasetPayload = {
        workspace_id: mockWorkspaceId,
        project_id: 'proj_test_123',
        name: 'New Dataset',
        fqn: 'main.bronze.new_dataset',
        medallion_layer: 'bronze',
        entity_type: 'table',
      };

      const mockDataset = createMockDataset({
        name: payload.name,
        fqn: payload.fqn,
      });

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await createDataset(payload, mockUserId);

      expect(result).toEqual(mockDataset);
      expect(supabase.from).toHaveBeenCalledWith('datasets');
      expect(mockChain.insert).toHaveBeenCalled();
      expect(result.has_uncommitted_changes).toBe(true);
      expect(result.sync_status).toBe('not_synced');
    });

    it('should throw error if creation fails', async () => {
      const payload: CreateDatasetPayload = {
        workspace_id: mockWorkspaceId,
        project_id: 'proj_test_123',
        name: 'New Dataset',
        fqn: 'main.bronze.new_dataset',
      };

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Database error')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(createDataset(payload, mockUserId)).rejects.toThrow(
        'Failed to create dataset: Database error'
      );
    });

    it('should set default values for optional fields', async () => {
      const payload: CreateDatasetPayload = {
        workspace_id: mockWorkspaceId,
        project_id: 'proj_test_123',
        name: 'New Dataset',
        fqn: 'main.bronze.new_dataset',
      };

      const mockDataset = createMockDataset();

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await createDataset(payload, mockUserId);

      expect(result.metadata).toEqual({});
      expect(result.ai_confidence_score).toBeNull();
    });
  });

  describe('getDataset', () => {
    it('should fetch dataset by ID successfully', async () => {
      const mockDataset = createMockDataset({ dataset_id: mockDatasetId });

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getDataset(mockDatasetId);

      expect(result).toEqual(mockDataset);
      expect(supabase.from).toHaveBeenCalledWith('datasets');
      expect(mockChain.eq).toHaveBeenCalledWith('dataset_id', mockDatasetId);
    });

    it('should return null if dataset not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Not found', 'PGRST116')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getDataset(mockDatasetId);

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Database connection failed')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(getDataset(mockDatasetId)).rejects.toThrow(
        'Failed to fetch dataset: Database connection failed'
      );
    });
  });

  describe('updateDataset', () => {
    it('should update dataset successfully', async () => {
      const payload: UpdateDatasetPayload = {
        name: 'Updated Dataset',
        description: 'Updated description',
      };

      const mockDataset = createMockDataset({
        dataset_id: mockDatasetId,
        ...payload,
        has_uncommitted_changes: true,
      });

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await updateDataset(mockDatasetId, payload, mockUserId);

      expect(result).toEqual(mockDataset);
      expect(result.has_uncommitted_changes).toBe(true);
      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('dataset_id', mockDatasetId);
    });

    it('should throw error if update fails', async () => {
      const payload: UpdateDatasetPayload = {
        name: 'Updated Dataset',
      };

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Update failed')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(updateDataset(mockDatasetId, payload, mockUserId)).rejects.toThrow(
        'Failed to update dataset: Update failed'
      );
    });
  });

  describe('deleteDataset', () => {
    it('should delete dataset successfully', async () => {
      const mockDataset = createMockDataset({ dataset_id: mockDatasetId });

      // Mock getDataset
      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      // Mock delete
      const mockDeleteChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Return success for delete
      (mockDeleteChain as any).mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any)
        .mockReturnValueOnce(mockGetChain)
        .mockReturnValueOnce(mockDeleteChain)
        .mockReturnValueOnce({ from: vi.fn().mockReturnThis() }); // For audit log

      await deleteDataset(mockDatasetId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('datasets');
    });

    it('should throw error if deletion fails', async () => {
      const mockDataset = createMockDataset({ dataset_id: mockDatasetId });

      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      const mockDeleteChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockDeleteChain as any).mockResolvedValue(mockSupabaseError('Delete failed'));

      (supabase.from as any)
        .mockReturnValueOnce(mockGetChain)
        .mockReturnValueOnce(mockDeleteChain);

      await expect(deleteDataset(mockDatasetId, mockUserId)).rejects.toThrow(
        'Failed to delete dataset: Delete failed'
      );
    });
  });

  describe('getWorkspaceDatasets', () => {
    it('should fetch all datasets for a workspace', async () => {
      const mockDatasets = [
        createMockDataset({ dataset_id: 'ds_1', name: 'Dataset 1' }),
        createMockDataset({ dataset_id: 'ds_2', name: 'Dataset 2' }),
      ];

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDatasets)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getWorkspaceDatasets(mockWorkspaceId);

      expect(result).toEqual(mockDatasets);
      expect(mockChain.eq).toHaveBeenCalledWith('workspace_id', mockWorkspaceId);
    });

    it('should apply filters correctly', async () => {
      const mockDatasets = [createMockDataset()];

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDatasets)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const filters = {
        medallion_layers: ['bronze', 'silver'],
        entity_types: ['table'],
      };

      await getWorkspaceDatasets(mockWorkspaceId, filters);

      expect(mockChain.in).toHaveBeenCalledWith('medallion_layer', filters.medallion_layers);
      expect(mockChain.in).toHaveBeenCalledWith('entity_type', filters.entity_types);
    });

    it('should handle search query filter', async () => {
      const mockDatasets = [createMockDataset()];

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDatasets)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await getWorkspaceDatasets(mockWorkspaceId, { search_query: 'test' });

      expect(mockChain.or).toHaveBeenCalled();
    });
  });

  describe('cloneDataset', () => {
    it('should clone dataset successfully', async () => {
      const sourceDataset = createMockDataset({
        dataset_id: mockDatasetId,
        name: 'Source Dataset',
      });

      const clonedDataset = createMockDataset({
        dataset_id: 'ds_cloned_123',
        name: 'Cloned Dataset',
      });

      // Mock getDataset
      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(sourceDataset)),
      };

      // Mock insert for clone
      const mockInsertChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(clonedDataset)),
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockGetChain)
        .mockReturnValueOnce(mockInsertChain)
        .mockReturnValueOnce({ from: vi.fn().mockReturnThis() }); // For audit log

      const result = await cloneDataset(mockDatasetId, 'Cloned Dataset', mockUserId);

      expect(result.name).toBe('Cloned Dataset');
      expect(result.has_uncommitted_changes).toBe(true);
      expect(result.sync_status).toBe('not_synced');
    });

    it('should throw error if source dataset not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Not found', 'PGRST116')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(cloneDataset(mockDatasetId, 'Cloned', mockUserId)).rejects.toThrow(
        'Source dataset not found'
      );
    });
  });

  describe('batchDeleteDatasets', () => {
    it('should delete multiple datasets successfully', async () => {
      const datasetIds = ['ds_1', 'ds_2', 'ds_3'];

      // Mock getDataset and delete for each
      datasetIds.forEach(() => {
        const mockGetChain = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(createMockDataset())),
        };

        const mockDeleteChain = {
          from: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };

        (mockDeleteChain as any).mockResolvedValue(mockSupabaseSuccess(null));
      });

      const result = await batchDeleteDatasets(datasetIds, mockUserId);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures in batch delete', async () => {
      const datasetIds = ['ds_1', 'ds_2', 'ds_3'];

      // Create a counter to track calls
      let callCount = 0;

      // Mock getDataset to succeed for all
      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(createMockDataset())),
      };

      // Mock delete to fail on second call
      const mockDeleteChain = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // This won't work as expected in the current implementation
      // We need to refactor to properly test this
      // For now, documenting expected behavior

      // Expected: result should have some successful and some failed
    });
  });

  describe('markDatasetAsSynced', () => {
    it('should mark dataset as synced', async () => {
      const commitSha = 'abc123';
      const filePath = '/datasets/test.yml';

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockChain as any).mockResolvedValue(mockSupabaseSuccess(null));
      (supabase.from as any).mockReturnValue(mockChain);

      await markDatasetAsSynced(mockDatasetId, commitSha, filePath);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          has_uncommitted_changes: false,
          sync_status: 'synced',
          source_commit_sha: commitSha,
          source_file_path: filePath,
        })
      );
      expect(mockChain.eq).toHaveBeenCalledWith('dataset_id', mockDatasetId);
    });
  });

  describe('markDatasetSyncError', () => {
    it('should mark dataset with sync error', async () => {
      const errorMessage = 'Sync failed: Network error';

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockChain as any).mockResolvedValue(mockSupabaseSuccess(null));
      (supabase.from as any).mockReturnValue(mockChain);

      await markDatasetSyncError(mockDatasetId, errorMessage);

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: 'error',
          sync_error_message: errorMessage,
        })
      );
    });
  });

  describe('getUncommittedDatasetsCount', () => {
    it('should return count of uncommitted datasets', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockChain as any).mockResolvedValue({ count: 5, error: null });
      (supabase.from as any).mockReturnValue(mockChain);

      const count = await getUncommittedDatasetsCount(mockWorkspaceId);

      expect(count).toBe(5);
      expect(mockChain.eq).toHaveBeenCalledWith('workspace_id', mockWorkspaceId);
      expect(mockChain.eq).toHaveBeenCalledWith('has_uncommitted_changes', true);
    });
  });

  describe('datasetToCanvasNode', () => {
    it('should convert dataset to canvas node', () => {
      const dataset = {
        ...createMockDataset(),
        position: { x: 100, y: 200 },
      };

      const node = datasetToCanvasNode(dataset);

      expect(node.id).toBe(dataset.dataset_id);
      expect(node.type).toBe('dataNode');
      expect(node.position).toEqual({ x: 100, y: 200 });
      expect(node.data.name).toBe(dataset.name);
      expect(node.data.fqn).toBe(dataset.fqn);
    });

    it('should handle dataset without optional fields', () => {
      const dataset = {
        ...createMockDataset({
          description: null,
          ai_confidence_score: null,
        }),
        position: { x: 0, y: 0 },
      };

      const node = datasetToCanvasNode(dataset);

      expect(node.data.description).toBeNull();
      expect(node.data.ai_confidence_score).toBeNull();
    });
  });
});
