/**
 * API-related TypeScript types and interfaces
 * Common types for API responses, pagination, errors, etc.
 */

// =====================================================
// Pagination Types
// =====================================================

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Pagination parameters for requests
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// =====================================================
// API Response Types
// =====================================================

/**
 * Standard API success response
 */
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =====================================================
// Health Check Types
// =====================================================

/**
 * Service health status
 */
export enum ServiceHealth {
  Healthy = 'healthy',
  Degraded = 'degraded',
  Unhealthy = 'unhealthy'
}

/**
 * Individual health check
 */
export interface HealthCheck {
  status: ServiceHealth;
  message: string;
  response_time_ms?: number;
  last_checked?: string;
}

/**
 * System health check response
 */
export interface SystemHealthCheck {
  status: ServiceHealth;
  timestamp: string;
  checks: {
    database: HealthCheck;
    sourceControl?: HealthCheck;
    [key: string]: HealthCheck | undefined;
  };
}

// =====================================================
// Validation Types
// =====================================================

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =====================================================
// Query Types
// =====================================================

/**
 * Sort parameters
 */
export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Filter parameters base
 */
export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Search parameters
 */
export interface SearchParams {
  search?: string;
  search_fields?: string[];
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationParams, SortParams, SearchParams {
  [key: string]: any;
}

// =====================================================
// Batch Operation Types
// =====================================================

/**
 * Batch operation result for a single item
 */
export interface BatchOperationResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Batch operation response
 */
export interface BatchOperationResponse<T = any> {
  total: number;
  successful: number;
  failed: number;
  results: BatchOperationResult<T>[];
}

// =====================================================
// File Upload Types
// =====================================================

/**
 * File upload result
 */
export interface FileUploadResult {
  file_name: string;
  file_size: number;
  file_type: string;
  url: string;
  uploaded_at: string;
}

/**
 * File upload error
 */
export interface FileUploadError {
  file_name: string;
  error: string;
}

/**
 * Batch file upload response
 */
export interface BatchFileUploadResponse {
  successful: FileUploadResult[];
  failed: FileUploadError[];
}

// =====================================================
// Async Operation Types
// =====================================================

/**
 * Async operation status
 */
export enum AsyncOperationStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

/**
 * Async operation progress
 */
export interface AsyncOperationProgress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}

/**
 * Async operation result
 */
export interface AsyncOperationResult<T = any> {
  id: string;
  status: AsyncOperationStatus;
  progress?: AsyncOperationProgress;
  result?: T;
  error?: string;
  started_at: string;
  completed_at?: string;
}

// =====================================================
// Export/Import Types
// =====================================================

/**
 * Export format
 */
export enum ExportFormat {
  JSON = 'json',
  YAML = 'yaml',
  CSV = 'csv',
  Excel = 'xlsx'
}

/**
 * Export request
 */
export interface ExportRequest {
  format: ExportFormat;
  filters?: FilterParams;
  fields?: string[];
}

/**
 * Export result
 */
export interface ExportResult {
  file_url: string;
  file_name: string;
  file_size: number;
  format: ExportFormat;
  record_count: number;
  exported_at: string;
  expires_at?: string;
}

/**
 * Import result
 */
export interface ImportResult {
  total_records: number;
  imported_records: number;
  skipped_records: number;
  failed_records: number;
  errors?: ValidationError[];
  warnings?: string[];
}

// =====================================================
// Type Guards
// =====================================================

/**
 * Check if response is an error
 */
export function isApiErrorResponse(response: any): response is ApiErrorResponse {
  return response && response.success === false && 'error' in response;
}

/**
 * Check if response is successful
 */
export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return response && response.success === true && 'data' in response;
}

/**
 * Check if response is paginated
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return response && Array.isArray(response.data) && 'pagination' in response;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Create a successful API response
 */
export function createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * Create an error API response
 */
export function createApiErrorResponse(
  error: string,
  message: string,
  code?: string,
  details?: Record<string, any>
): ApiErrorResponse {
  return {
    success: false,
    error,
    message,
    code,
    details
  };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit)
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(page, limit, total)
  };
}

/**
 * Calculate pagination offset
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  return { page, limit };
}
