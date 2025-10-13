/**
 * Unit tests for column-service
 * Tests CRUD operations and references for columns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createColumn,
  getColumn,
  updateColumn,
  deleteColumn,
  getDatasetColumns,
  getDatasetColumnsWithReferences,
  reorderColumns,
  bulkUpdateColumns,
  batchDeleteColumns,
  getColumnsReferencingColumn,
  createColumnReference,
  removeColumnReference,
} from '../column-service';
import { supabase } from '../supabase';
import {
  createMockColumn,
  createMockDataset,
  mockSupabaseSuccess,
  mockSupabaseError,
} from '../../test/test-utils';
import type { CreateColumnPayload, UpdateColumnPayload } from '../../types/column';

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('column-service', () => {
  const mockUserId = 'user_test_123';
  const mockDatasetId = 'ds_test_123';
  const mockColumnId = 'col_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createColumn', () => {
    it('should create a new column successfully', async () => {
      const payload: CreateColumnPayload = {
        dataset_id: mockDatasetId,
        name: 'new_column',
        data_type: 'STRING',
        description: 'Test column',
      };

      const mockDataset = createMockDataset({
        dataset_id: mockDatasetId,
        fqn: 'main.bronze.test_dataset',
      });

      const mockColumn = createMockColumn({
        name: payload.name,
        fqn: 'main.bronze.test_dataset.new_column',
      });

      // Mock getting dataset for FQN
      const mockGetDatasetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      // Mock inserting column
      const mockInsertChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
      };

      // Mock marking dataset as uncommitted
      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockUpdateChain as any).mockResolvedValue(mockSupabaseSuccess(null));

      (supabase.from as any)
        .mockReturnValueOnce(mockGetDatasetChain)
        .mockReturnValueOnce(mockInsertChain)
        .mockReturnValueOnce(mockUpdateChain)
        .mockReturnValueOnce({ from: vi.fn().mockReturnThis() }); // Audit log

      const result = await createColumn(payload, mockUserId);

      expect(result).toEqual(mockColumn);
      expect(result.fqn).toBe('main.bronze.test_dataset.new_column');
    });

    it('should use provided FQN if specified', async () => {
      const payload: CreateColumnPayload = {
        dataset_id: mockDatasetId,
        name: 'new_column',
        fqn: 'custom.fqn.new_column',
        data_type: 'STRING',
      };

      const mockColumn = createMockColumn({
        name: payload.name,
        fqn: payload.fqn,
      });

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await createColumn(payload, mockUserId);

      expect(result.fqn).toBe('custom.fqn.new_column');
    });

    it('should throw error if dataset not found', async () => {
      const payload: CreateColumnPayload = {
        dataset_id: mockDatasetId,
        name: 'new_column',
        data_type: 'STRING',
      };

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Not found', 'PGRST116')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(createColumn(payload, mockUserId)).rejects.toThrow('Dataset not found');
    });

    it('should set default values for optional fields', async () => {
      const payload: CreateColumnPayload = {
        dataset_id: mockDatasetId,
        name: 'new_column',
        data_type: 'STRING',
      };

      const mockDataset = createMockDataset();
      const mockColumn = createMockColumn({
        is_nullable: true,
        is_primary_key: false,
        is_foreign_key: false,
      });

      const mockGetDatasetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      const mockInsertChain = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockGetDatasetChain)
        .mockReturnValueOnce(mockInsertChain);

      const result = await createColumn(payload, mockUserId);

      expect(result.is_nullable).toBe(true);
      expect(result.is_primary_key).toBe(false);
      expect(result.is_foreign_key).toBe(false);
    });
  });

  describe('getColumn', () => {
    it('should fetch column by ID successfully', async () => {
      const mockColumn = createMockColumn({ column_id: mockColumnId });

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getColumn(mockColumnId);

      expect(result).toEqual(mockColumn);
      expect(mockChain.eq).toHaveBeenCalledWith('column_id', mockColumnId);
    });

    it('should return null if column not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Not found', 'PGRST116')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getColumn(mockColumnId);

      expect(result).toBeNull();
    });
  });

  describe('updateColumn', () => {
    it('should update column successfully', async () => {
      const payload: UpdateColumnPayload = {
        description: 'Updated description',
        data_type: 'BIGINT',
      };

      const existingColumn = createMockColumn({ column_id: mockColumnId });
      const updatedColumn = createMockColumn({ ...existingColumn, ...payload });

      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(existingColumn)),
      };

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedColumn)),
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockGetChain)
        .mockReturnValueOnce(mockUpdateChain);

      const result = await updateColumn(mockColumnId, payload, mockUserId);

      expect(result.description).toBe(payload.description);
    });

    it('should update FQN when name changes', async () => {
      const payload: UpdateColumnPayload = {
        name: 'renamed_column',
      };

      const existingColumn = createMockColumn({
        column_id: mockColumnId,
        name: 'old_column',
        fqn: 'main.bronze.test.old_column',
      });

      const mockDataset = createMockDataset({
        fqn: 'main.bronze.test',
      });

      const updatedColumn = createMockColumn({
        ...existingColumn,
        name: 'renamed_column',
        fqn: 'main.bronze.test.renamed_column',
      });

      const mockGetColumnChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(existingColumn)),
      };

      const mockGetDatasetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockDataset)),
      };

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedColumn)),
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockGetColumnChain)
        .mockReturnValueOnce(mockGetDatasetChain)
        .mockReturnValueOnce(mockUpdateChain);

      const result = await updateColumn(mockColumnId, payload, mockUserId);

      expect(result.fqn).toBe('main.bronze.test.renamed_column');
    });

    it('should throw error if column not found', async () => {
      const payload: UpdateColumnPayload = {
        description: 'Updated',
      };

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseError('Not found', 'PGRST116')),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(updateColumn(mockColumnId, payload, mockUserId)).rejects.toThrow(
        'Column not found'
      );
    });
  });

  describe('deleteColumn', () => {
    it('should delete column successfully', async () => {
      const mockColumn = createMockColumn({ column_id: mockColumnId });

      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
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

      await deleteColumn(mockColumnId, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('columns');
    });
  });

  describe('getDatasetColumns', () => {
    it('should fetch all columns for a dataset', async () => {
      const mockColumns = [
        createMockColumn({ column_id: 'col_1', name: 'column_1', position: 0 }),
        createMockColumn({ column_id: 'col_2', name: 'column_2', position: 1 }),
      ];

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumns)),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getDatasetColumns(mockDatasetId);

      expect(result).toEqual(mockColumns);
      expect(mockChain.eq).toHaveBeenCalledWith('dataset_id', mockDatasetId);
    });

    it('should return empty array if no columns found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getDatasetColumns(mockDatasetId);

      expect(result).toEqual([]);
    });
  });

  describe('reorderColumns', () => {
    it('should reorder columns successfully', async () => {
      const orderedColumnIds = ['col_3', 'col_1', 'col_2'];

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockUpdateChain as any).mockResolvedValue(mockSupabaseSuccess(null));
      (supabase.from as any).mockReturnValue(mockUpdateChain);

      await reorderColumns(mockDatasetId, orderedColumnIds, mockUserId);

      // Verify update was called for each column with correct position
      expect(mockUpdateChain.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('bulkUpdateColumns', () => {
    it('should update multiple columns successfully', async () => {
      const updates = [
        { column_id: 'col_1', updates: { description: 'Updated 1' } },
        { column_id: 'col_2', updates: { description: 'Updated 2' } },
      ];

      const mockColumn = createMockColumn();

      // Mock getColumn and update for each
      updates.forEach(() => {
        const mockGetChain = {
          from: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
        };

        const mockUpdateChain = {
          from: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockColumn)),
        };
      });

      const result = await bulkUpdateColumns(updates, mockUserId);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('createColumnReference', () => {
    it('should create column reference successfully', async () => {
      const sourceColumnId = 'col_source_123';
      const targetColumnId = 'col_target_123';
      const referenceType = 'FK';

      const existingColumn = createMockColumn({ column_id: sourceColumnId });
      const updatedColumn = createMockColumn({
        ...existingColumn,
        reference_column_id: targetColumnId,
        reference_type: referenceType,
        is_foreign_key: true,
      });

      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(existingColumn)),
      };

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedColumn)),
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockGetChain)
        .mockReturnValueOnce(mockUpdateChain);

      const result = await createColumnReference(
        sourceColumnId,
        targetColumnId,
        referenceType,
        'Test reference',
        mockUserId
      );

      expect(result.reference_column_id).toBe(targetColumnId);
      expect(result.reference_type).toBe(referenceType);
      expect(result.is_foreign_key).toBe(true);
    });
  });

  describe('removeColumnReference', () => {
    it('should remove column reference successfully', async () => {
      const existingColumn = createMockColumn({
        column_id: mockColumnId,
        reference_column_id: 'col_ref_123',
        reference_type: 'FK',
      });

      const updatedColumn = createMockColumn({
        ...existingColumn,
        reference_column_id: null,
        reference_type: null,
        reference_description: null,
      });

      const mockGetChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(existingColumn)),
      };

      const mockUpdateChain = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedColumn)),
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockGetChain)
        .mockReturnValueOnce(mockUpdateChain);

      const result = await removeColumnReference(mockColumnId, mockUserId);

      expect(result.reference_column_id).toBeNull();
      expect(result.reference_type).toBeNull();
    });
  });

  describe('getColumnsReferencingColumn', () => {
    it('should fetch all columns referencing target column', async () => {
      const targetColumnId = 'col_target_123';
      const referencingColumns = [
        createMockColumn({
          column_id: 'col_1',
          reference_column_id: targetColumnId,
        }),
        createMockColumn({
          column_id: 'col_2',
          reference_column_id: targetColumnId,
        }),
      ];

      const mockChain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      (mockChain as any).mockResolvedValue(mockSupabaseSuccess(referencingColumns));
      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getColumnsReferencingColumn(targetColumnId);

      expect(result).toEqual(referencingColumns);
      expect(mockChain.eq).toHaveBeenCalledWith('reference_column_id', targetColumnId);
    });
  });
});
