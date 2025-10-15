/**
 * Validation Utilities for Dataset and Column Metadata Management
 * Provides validation functions for names, FQNs, data types, and confidence scores
 */

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

// ============================================================================
// Validation Error Codes
// ============================================================================

export const ValidationErrorCodes = {
  // Dataset errors
  DATASET_NAME_REQUIRED: 'DATASET_NAME_REQUIRED',
  DATASET_NAME_INVALID_FORMAT: 'DATASET_NAME_INVALID_FORMAT',
  DATASET_NAME_TOO_SHORT: 'DATASET_NAME_TOO_SHORT',
  DATASET_NAME_TOO_LONG: 'DATASET_NAME_TOO_LONG',
  DATASET_NAME_DUPLICATE: 'DATASET_NAME_DUPLICATE',

  // Column errors
  COLUMN_NAME_REQUIRED: 'COLUMN_NAME_REQUIRED',
  COLUMN_NAME_INVALID_FORMAT: 'COLUMN_NAME_INVALID_FORMAT',
  COLUMN_NAME_TOO_SHORT: 'COLUMN_NAME_TOO_SHORT',
  COLUMN_NAME_TOO_LONG: 'COLUMN_NAME_TOO_LONG',
  COLUMN_NAME_DUPLICATE: 'COLUMN_NAME_DUPLICATE',

  // FQN errors
  FQN_REQUIRED: 'FQN_REQUIRED',
  FQN_INVALID_FORMAT: 'FQN_INVALID_FORMAT',
  FQN_INVALID_LAYER: 'FQN_INVALID_LAYER',
  FQN_MISSING_PARTS: 'FQN_MISSING_PARTS',

  // Data type errors
  DATA_TYPE_REQUIRED: 'DATA_TYPE_REQUIRED',
  DATA_TYPE_INVALID: 'DATA_TYPE_INVALID',
  DATA_TYPE_TOO_LONG: 'DATA_TYPE_TOO_LONG',

  // Confidence score errors
  CONFIDENCE_SCORE_INVALID: 'CONFIDENCE_SCORE_INVALID',
  CONFIDENCE_SCORE_OUT_OF_RANGE: 'CONFIDENCE_SCORE_OUT_OF_RANGE',
} as const;

// ============================================================================
// Validation Error Messages
// ============================================================================

export const ValidationErrorMessages = {
  // Dataset messages
  [ValidationErrorCodes.DATASET_NAME_REQUIRED]: 'Dataset name is required',
  [ValidationErrorCodes.DATASET_NAME_INVALID_FORMAT]: 'Dataset name must start with a letter or underscore and contain only letters, numbers, and underscores',
  [ValidationErrorCodes.DATASET_NAME_TOO_SHORT]: 'Dataset name must be at least 1 character long',
  [ValidationErrorCodes.DATASET_NAME_TOO_LONG]: 'Dataset name must not exceed 255 characters',
  [ValidationErrorCodes.DATASET_NAME_DUPLICATE]: 'A dataset with this name already exists. Please choose a different name',

  // Column messages
  [ValidationErrorCodes.COLUMN_NAME_REQUIRED]: 'Column name is required',
  [ValidationErrorCodes.COLUMN_NAME_INVALID_FORMAT]: 'Column name must start with a letter or underscore and contain only letters, numbers, and underscores',
  [ValidationErrorCodes.COLUMN_NAME_TOO_SHORT]: 'Column name must be at least 1 character long',
  [ValidationErrorCodes.COLUMN_NAME_TOO_LONG]: 'Column name must not exceed 255 characters',
  [ValidationErrorCodes.COLUMN_NAME_DUPLICATE]: 'A column with this name already exists in this dataset',

  // FQN messages
  [ValidationErrorCodes.FQN_REQUIRED]: 'Fully qualified name (FQN) is required',
  [ValidationErrorCodes.FQN_INVALID_FORMAT]: 'FQN must be in format: layer.schema.name (e.g., silver.sales.customers)',
  [ValidationErrorCodes.FQN_INVALID_LAYER]: 'FQN layer must be one of: raw, bronze, silver, gold',
  [ValidationErrorCodes.FQN_MISSING_PARTS]: 'FQN must contain exactly 3 parts: layer.schema.name',

  // Data type messages
  [ValidationErrorCodes.DATA_TYPE_REQUIRED]: 'Data type is required',
  [ValidationErrorCodes.DATA_TYPE_INVALID]: 'Invalid data type. Please select a valid data type or enter a custom type',
  [ValidationErrorCodes.DATA_TYPE_TOO_LONG]: 'Data type must not exceed 100 characters',

  // Confidence score messages
  [ValidationErrorCodes.CONFIDENCE_SCORE_INVALID]: 'Confidence score must be a valid number',
  [ValidationErrorCodes.CONFIDENCE_SCORE_OUT_OF_RANGE]: 'Confidence score must be between 0 and 100',
} as const;

// ============================================================================
// Constants
// ============================================================================

const NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;
const MAX_DATA_TYPE_LENGTH = 100;
const VALID_MEDALLION_LAYERS = ['raw', 'bronze', 'silver', 'gold'];

// Common data types for validation
const COMMON_DATA_TYPES = [
  // String types
  'VARCHAR', 'CHAR', 'TEXT', 'STRING', 'NVARCHAR',
  // Numeric types
  'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
  'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL',
  // Date/Time types
  'DATE', 'TIMESTAMP', 'DATETIME', 'TIME', 'TIMESTAMP_NTZ',
  // Boolean types
  'BOOLEAN', 'BOOL',
  // Binary types
  'BINARY', 'VARBINARY', 'BLOB',
  // Complex types
  'ARRAY', 'STRUCT', 'MAP', 'JSON', 'JSONB',
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a dataset name
 * @param name - Dataset name to validate
 * @param existingNames - Array of existing dataset names for uniqueness check
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validateDatasetName(
  name: string,
  existingNames: string[] = []
): ValidationResult {
  // Check if name is provided
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATASET_NAME_REQUIRED],
      code: ValidationErrorCodes.DATASET_NAME_REQUIRED,
    };
  }

  const trimmedName = name.trim();

  // Check minimum length
  if (trimmedName.length < MIN_NAME_LENGTH) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATASET_NAME_TOO_SHORT],
      code: ValidationErrorCodes.DATASET_NAME_TOO_SHORT,
    };
  }

  // Check maximum length
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATASET_NAME_TOO_LONG],
      code: ValidationErrorCodes.DATASET_NAME_TOO_LONG,
    };
  }

  // Check format (must start with letter or underscore, contain only alphanumeric and underscore)
  if (!NAME_PATTERN.test(trimmedName)) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATASET_NAME_INVALID_FORMAT],
      code: ValidationErrorCodes.DATASET_NAME_INVALID_FORMAT,
    };
  }

  // Check uniqueness (case-sensitive)
  if (existingNames.includes(trimmedName)) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATASET_NAME_DUPLICATE],
      code: ValidationErrorCodes.DATASET_NAME_DUPLICATE,
    };
  }

  return { isValid: true };
}

/**
 * Validate a column name
 * @param name - Column name to validate
 * @param existingNames - Array of existing column names for uniqueness check (case-insensitive)
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validateColumnName(
  name: string,
  existingNames: string[] = []
): ValidationResult {
  // Check if name is provided
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.COLUMN_NAME_REQUIRED],
      code: ValidationErrorCodes.COLUMN_NAME_REQUIRED,
    };
  }

  const trimmedName = name.trim();

  // Check minimum length
  if (trimmedName.length < MIN_NAME_LENGTH) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.COLUMN_NAME_TOO_SHORT],
      code: ValidationErrorCodes.COLUMN_NAME_TOO_SHORT,
    };
  }

  // Check maximum length
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.COLUMN_NAME_TOO_LONG],
      code: ValidationErrorCodes.COLUMN_NAME_TOO_LONG,
    };
  }

  // Check format
  if (!NAME_PATTERN.test(trimmedName)) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.COLUMN_NAME_INVALID_FORMAT],
      code: ValidationErrorCodes.COLUMN_NAME_INVALID_FORMAT,
    };
  }

  // Check uniqueness (case-insensitive)
  const lowerName = trimmedName.toLowerCase();
  if (existingNames.some(n => n.toLowerCase() === lowerName)) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.COLUMN_NAME_DUPLICATE],
      code: ValidationErrorCodes.COLUMN_NAME_DUPLICATE,
    };
  }

  return { isValid: true };
}

/**
 * Validate a fully qualified name (FQN)
 * FQN format: layer.schema.name (e.g., silver.sales.customers)
 * @param fqn - FQN to validate
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validateFQN(fqn: string): ValidationResult {
  // Check if FQN is provided
  if (!fqn || fqn.trim().length === 0) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.FQN_REQUIRED],
      code: ValidationErrorCodes.FQN_REQUIRED,
    };
  }

  const trimmedFqn = fqn.trim();

  // Split FQN into parts
  const parts = trimmedFqn.split('.');

  // Check if FQN has exactly 3 parts
  if (parts.length !== 3) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.FQN_MISSING_PARTS],
      code: ValidationErrorCodes.FQN_MISSING_PARTS,
    };
  }

  const [layer, schema, name] = parts;

  // Validate each part is not empty
  if (!layer || !schema || !name) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.FQN_INVALID_FORMAT],
      code: ValidationErrorCodes.FQN_INVALID_FORMAT,
    };
  }

  // Validate layer is a valid medallion layer
  if (!VALID_MEDALLION_LAYERS.includes(layer.toLowerCase())) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.FQN_INVALID_LAYER],
      code: ValidationErrorCodes.FQN_INVALID_LAYER,
    };
  }

  // Validate schema and name follow naming pattern
  if (!NAME_PATTERN.test(schema) || !NAME_PATTERN.test(name)) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.FQN_INVALID_FORMAT],
      code: ValidationErrorCodes.FQN_INVALID_FORMAT,
    };
  }

  return { isValid: true };
}

/**
 * Validate a data type
 * Accepts common data types and custom types (e.g., VARCHAR(255))
 * @param dataType - Data type to validate
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validateDataType(dataType: string): ValidationResult {
  // Check if data type is provided
  if (!dataType || dataType.trim().length === 0) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATA_TYPE_REQUIRED],
      code: ValidationErrorCodes.DATA_TYPE_REQUIRED,
    };
  }

  const trimmedType = dataType.trim();

  // Check maximum length
  if (trimmedType.length > MAX_DATA_TYPE_LENGTH) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATA_TYPE_TOO_LONG],
      code: ValidationErrorCodes.DATA_TYPE_TOO_LONG,
    };
  }

  // Extract base type (before parentheses for parameterized types like VARCHAR(255))
  const baseType = trimmedType.split('(')[0].trim().toUpperCase();

  // Check if base type is in common data types
  if (COMMON_DATA_TYPES.includes(baseType)) {
    // Validate parameterized types (e.g., VARCHAR(255), DECIMAL(10,2))
    if (trimmedType.includes('(')) {
      const paramPattern = /^[A-Z]+\(\d+(?:,\s*\d+)?\)$/i;
      if (!paramPattern.test(trimmedType)) {
        return {
          isValid: false,
          error: ValidationErrorMessages[ValidationErrorCodes.DATA_TYPE_INVALID],
          code: ValidationErrorCodes.DATA_TYPE_INVALID,
        };
      }
    }
    return { isValid: true };
  }

  // For custom types, just check that it contains valid characters
  // Allow letters, numbers, underscores, parentheses, commas, and spaces
  const customTypePattern = /^[a-zA-Z_][a-zA-Z0-9_\s(),]*$/;
  if (!customTypePattern.test(trimmedType)) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.DATA_TYPE_INVALID],
      code: ValidationErrorCodes.DATA_TYPE_INVALID,
    };
  }

  return { isValid: true };
}

/**
 * Validate an AI confidence score
 * Score must be a number between 0 and 100 (inclusive)
 * @param score - Confidence score to validate
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validateConfidenceScore(score: number): ValidationResult {
  // Check if score is a valid number
  if (typeof score !== 'number' || isNaN(score)) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.CONFIDENCE_SCORE_INVALID],
      code: ValidationErrorCodes.CONFIDENCE_SCORE_INVALID,
    };
  }

  // Check if score is in valid range (0-100)
  if (score < 0 || score > 100) {
    return {
      isValid: false,
      error: ValidationErrorMessages[ValidationErrorCodes.CONFIDENCE_SCORE_OUT_OF_RANGE],
      code: ValidationErrorCodes.CONFIDENCE_SCORE_OUT_OF_RANGE,
    };
  }

  return { isValid: true };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate FQN from dataset properties
 * @param layer - Medallion layer
 * @param schema - Schema name
 * @param name - Dataset name
 * @returns Generated FQN
 */
export function generateFQN(
  layer: string,
  schema: string,
  name: string
): string {
  return `${layer.toLowerCase()}.${schema}.${name}`;
}

/**
 * Parse FQN into components
 * @param fqn - Fully qualified name
 * @returns Object with layer, schema, and name or null if invalid
 */
export function parseFQN(fqn: string): { layer: string; schema: string; name: string } | null {
  const validation = validateFQN(fqn);
  if (!validation.isValid) {
    return null;
  }

  const [layer, schema, name] = fqn.split('.');
  return { layer, schema, name };
}

/**
 * Check if a data type is parameterized (e.g., VARCHAR(255))
 * @param dataType - Data type to check
 * @returns True if parameterized, false otherwise
 */
export function isParameterizedDataType(dataType: string): boolean {
  return dataType.includes('(') && dataType.includes(')');
}

/**
 * Extract base type from parameterized type
 * @param dataType - Data type (e.g., "VARCHAR(255)")
 * @returns Base type (e.g., "VARCHAR")
 */
export function getBaseDataType(dataType: string): string {
  return dataType.split('(')[0].trim().toUpperCase();
}

/**
 * Get confidence level category based on score
 * @param score - Confidence score (0-100)
 * @returns Confidence level: 'high', 'medium', 'low', or 'invalid'
 */
export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' | 'invalid' {
  const validation = validateConfidenceScore(score);
  if (!validation.isValid) {
    return 'invalid';
  }

  if (score >= 90) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

/**
 * Get confidence level color for UI display
 * @param score - Confidence score (0-100)
 * @returns Tailwind color class
 */
export function getConfidenceLevelColor(score: number): string {
  const level = getConfidenceLevel(score);
  switch (level) {
    case 'high':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'low':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get list of common data types grouped by category
 * @returns Object with data types grouped by category
 */
export function getDataTypesByCategory(): Record<string, string[]> {
  return {
    String: ['VARCHAR', 'CHAR', 'TEXT', 'STRING', 'NVARCHAR'],
    Numeric: ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL'],
    DateTime: ['DATE', 'TIMESTAMP', 'DATETIME', 'TIME', 'TIMESTAMP_NTZ'],
    Boolean: ['BOOLEAN', 'BOOL'],
    Binary: ['BINARY', 'VARBINARY', 'BLOB'],
    Complex: ['ARRAY', 'STRUCT', 'MAP', 'JSON', 'JSONB'],
  };
}

/**
 * Validate multiple names for batch operations
 * @param names - Array of names to validate
 * @param existingNames - Array of existing names
 * @param isCaseSensitive - Whether to use case-sensitive uniqueness check
 * @returns Array of validation results
 */
export function validateBatchNames(
  names: string[],
  existingNames: string[] = [],
  isCaseSensitive: boolean = false
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const seenNames = new Set<string>();

  for (const name of names) {
    const trimmedName = name.trim();
    const comparisonName = isCaseSensitive ? trimmedName : trimmedName.toLowerCase();

    // Check format and length
    const formatResult = isCaseSensitive
      ? validateDatasetName(trimmedName, [])
      : validateColumnName(trimmedName, []);

    if (!formatResult.isValid) {
      results.push(formatResult);
      continue;
    }

    // Check for duplicates within the batch
    if (seenNames.has(comparisonName)) {
      results.push({
        isValid: false,
        error: 'Duplicate name in batch',
        code: isCaseSensitive
          ? ValidationErrorCodes.DATASET_NAME_DUPLICATE
          : ValidationErrorCodes.COLUMN_NAME_DUPLICATE,
      });
      continue;
    }

    // Check against existing names
    const existingCheck = isCaseSensitive
      ? existingNames.includes(trimmedName)
      : existingNames.some(n => n.toLowerCase() === comparisonName);

    if (existingCheck) {
      results.push({
        isValid: false,
        error: isCaseSensitive
          ? ValidationErrorMessages[ValidationErrorCodes.DATASET_NAME_DUPLICATE]
          : ValidationErrorMessages[ValidationErrorCodes.COLUMN_NAME_DUPLICATE],
        code: isCaseSensitive
          ? ValidationErrorCodes.DATASET_NAME_DUPLICATE
          : ValidationErrorCodes.COLUMN_NAME_DUPLICATE,
      });
      continue;
    }

    seenNames.add(comparisonName);
    results.push({ isValid: true });
  }

  return results;
}
