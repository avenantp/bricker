/**
 * Test utilities for backend tests
 * Provides mocks, fixtures, and helpers for testing
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client for backend tests
export const createMockSupabaseClient = (): Partial<SupabaseClient> => {
  const mockFrom = jest.fn().mockReturnThis();
  const mockSelect = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockIn = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();
  const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: mockFrom,
    select: mockSelect as any,
    insert: mockInsert as any,
    update: mockUpdate as any,
    delete: mockDelete as any,
    eq: mockEq as any,
    in: mockIn as any,
    order: mockOrder as any,
    single: mockSingle as any,
  } as any;
};

// Test fixtures
export const testFixtures = {
  workspace: {
    id: 'ws_test_123',
    name: 'Test Workspace',
    description: 'Test workspace',
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
  },
  dataset: {
    dataset_id: 'ds_test_123',
    workspace_id: 'ws_test_123',
    project_id: 'proj_test_123',
    name: 'test_dataset',
    fqn: 'main.bronze.test_dataset',
    medallion_layer: 'bronze',
    entity_type: 'table',
    entity_subtype: 'fact',
    materialization_type: 'table',
    description: 'Test dataset',
    metadata: {},
    ai_confidence_score: null,
    has_uncommitted_changes: false,
    sync_status: 'synced',
    source_file_path: '/datasets/test.yml',
    source_commit_sha: 'abc123',
    last_synced_at: '2024-01-01T00:00:00Z',
    sync_error_message: null,
    created_by: 'user_test_123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  column: {
    column_id: 'col_test_123',
    dataset_id: 'ds_test_123',
    name: 'test_column',
    fqn: 'main.bronze.test_dataset.test_column',
    data_type: 'STRING',
    description: 'Test column',
    business_name: 'Test Column',
    is_primary_key: false,
    is_foreign_key: false,
    is_nullable: true,
    default_value: null,
    reference_column_id: null,
    reference_type: null,
    transformation_logic: null,
    ai_confidence_score: null,
    ordinal_position: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  user: {
    id: 'user_test_123',
    email: 'test@example.com',
    company_id: 'comp_test_123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  sourceControlCommit: {
    id: 'commit_test_123',
    workspace_id: 'ws_test_123',
    dataset_id: 'ds_test_123',
    commit_sha: 'abc123def456',
    commit_message: 'Test commit',
    commit_author: 'test@example.com',
    committed_at: '2024-01-01T00:00:00Z',
    file_path: '/datasets/test.yml',
    created_at: '2024-01-01T00:00:00Z',
  },
};

// Helper to create Supabase error
export const createSupabaseError = (message: string, code?: string) => ({
  message,
  code: code || 'ERROR',
  details: null,
  hint: null,
});

// Helper to mock Express request
export const mockRequest = (overrides: any = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  user: testFixtures.user,
  ...overrides,
});

// Helper to mock Express response
export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to mock Express next function
export const mockNext = () => jest.fn();

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock GitHub API client
export const createMockGitHubClient = () => ({
  repos: {
    getContent: jest.fn(),
    createOrUpdateFileContents: jest.fn(),
    getBranch: jest.fn(),
  },
  git: {
    getCommit: jest.fn(),
  },
});

// Helper to create mock YAML content
export const createMockYAML = (type: 'dataset' | 'workspace') => {
  if (type === 'dataset') {
    return `
metadata:
  id: ds_test_123
  name: test_dataset
  fqn: main.bronze.test_dataset
  medallion_layer: bronze
  entity_type: table
columns:
  - name: id
    data_type: BIGINT
    is_primary_key: true
  - name: name
    data_type: STRING
`;
  } else {
    return `
workspace:
  id: ws_test_123
  name: Test Workspace
  source_control_repo_url: https://github.com/test/repo
`;
  }
};
