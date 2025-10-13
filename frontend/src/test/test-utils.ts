/**
 * Test utilities for frontend tests
 * Provides mocks, fixtures, and helpers for testing
 */

import { vi } from 'vitest';
import type { Dataset } from '../types/dataset';
import type { Column } from '../types/column';
import type { Lineage } from '../types/lineage';
import type { Workspace } from '../types/workspace';

// Mock Supabase client - Creates a chainable mock
export const createMockSupabaseClient = () => {
  const mockClient: any = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    not: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Make all methods return the mock client for chaining
  Object.keys(mockClient).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle') {
      mockClient[key].mockReturnValue(mockClient);
    }
  });

  // Terminal methods return promises
  mockClient.single.mockResolvedValue({ data: null, error: null });
  mockClient.maybeSingle.mockResolvedValue({ data: null, error: null });

  return mockClient;
};

// Create a mock chain for testing
export const createMockChain = (finalResult: any = { data: null, error: null }) => {
  const chain: any = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    not: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Make all methods chainable
  Object.keys(chain).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle') {
      chain[key].mockReturnValue(chain);
    }
  });

  // Terminal methods return the final result
  chain.single.mockResolvedValue(finalResult);
  chain.maybeSingle.mockResolvedValue(finalResult);

  // Also allow order, eq, etc to be terminal (return promise)
  chain.mockResolvedValue = (value: any) => {
    Object.assign(finalResult, value);
    return chain;
  };

  return chain;
};

// Test fixtures
export const createMockDataset = (overrides?: Partial<Dataset>): Dataset => ({
  dataset_id: 'ds_test_123',
  workspace_id: 'ws_test_123',
  project_id: 'proj_test_123',
  name: 'Test Dataset',
  fqn: 'main.bronze.test_dataset',
  medallion_layer: 'bronze',
  entity_type: 'table',
  entity_subtype: 'fact',
  materialization_type: 'table',
  description: 'Test dataset description',
  metadata: {},
  ai_confidence_score: null,
  has_uncommitted_changes: false,
  sync_status: 'synced',
  source_file_path: '/path/to/file.yml',
  source_commit_sha: 'abc123',
  last_synced_at: '2024-01-01T00:00:00Z',
  sync_error_message: null,
  created_by: 'user_test_123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockColumn = (overrides?: Partial<Column>): Column => ({
  column_id: 'col_test_123',
  dataset_id: 'ds_test_123',
  name: 'test_column',
  fqn: 'main.bronze.test_dataset.test_column',
  data_type: 'STRING',
  description: 'Test column description',
  business_name: 'Test Column',
  is_primary_key: false,
  is_foreign_key: false,
  is_nullable: true,
  default_value: null,
  reference_column_id: null,
  reference_type: null,
  reference_description: null,
  transformation_logic: null,
  ai_confidence_score: null,
  position: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockLineage = (overrides?: Partial<Lineage>): Lineage => ({
  lineage_id: 'lin_test_123',
  source_dataset_id: 'ds_source_123',
  target_dataset_id: 'ds_target_123',
  source_column_id: null,
  target_column_id: null,
  transformation_logic: null,
  transformation_type: null,
  description: 'Test lineage',
  metadata: {},
  workspace_id: 'ws_test_123',
  created_by: 'user_test_123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockWorkspace = (overrides?: Partial<Workspace>): Workspace => ({
  id: 'ws_test_123',
  name: 'Test Workspace',
  description: 'Test workspace description',
  company_id: 'comp_test_123',
  owner_id: 'user_test_123',
  source_control_repo_url: 'https://github.com/test/repo',
  source_control_branch: 'main',
  source_control_commit_sha: null,
  source_control_provider: 'github',
  source_control_connection_status: 'connected',
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to create Supabase error
export const createSupabaseError = (message: string, code?: string) => ({
  message,
  code: code || 'ERROR',
  details: null,
  hint: null,
});

// Helper to mock successful Supabase response
export const mockSupabaseSuccess = (data: any) => ({
  data,
  error: null,
});

// Helper to mock failed Supabase response
export const mockSupabaseError = (message: string, code?: string) => ({
  data: null,
  error: createSupabaseError(message, code),
});

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create mock user
export const createMockUser = () => ({
  id: 'user_test_123',
  email: 'test@example.com',
  company_id: 'comp_test_123',
  created_at: '2024-01-01T00:00:00Z',
});

// Helper to create batch operation result
export const createBatchResult = (
  successful: string[],
  failed: Array<{ dataset_id?: string; column_id?: string; error: string }>
) => ({
  successful,
  failed,
});
