/**
 * Unit tests for validation utilities
 */

import { describe, expect, test } from 'vitest';
import {
  validateDatasetName,
  validateColumnName,
  validateFQN,
  validateDataType,
  validateConfidenceScore,
  generateFQN,
  parseFQN,
  isParameterizedDataType,
  getBaseDataType,
  getConfidenceLevel,
  getConfidenceLevelColor,
  getDataTypesByCategory,
  validateBatchNames,
  ValidationErrorCodes,
} from '../validation';

// ============================================================================
// Dataset Name Validation Tests
// ============================================================================

describe('validateDatasetName', () => {
  test('should validate correct dataset name', () => {
    const result = validateDatasetName('valid_dataset_name_123');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject empty name', () => {
    const result = validateDatasetName('');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATASET_NAME_REQUIRED);
  });

  test('should reject whitespace-only name', () => {
    const result = validateDatasetName('   ');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATASET_NAME_REQUIRED);
  });

  test('should reject name starting with number', () => {
    const result = validateDatasetName('123dataset');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATASET_NAME_INVALID_FORMAT);
  });

  test('should accept name starting with underscore', () => {
    const result = validateDatasetName('_dataset');
    expect(result.isValid).toBe(true);
  });

  test('should reject name with special characters', () => {
    const result = validateDatasetName('dataset-name');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATASET_NAME_INVALID_FORMAT);
  });

  test('should reject name with spaces', () => {
    const result = validateDatasetName('dataset name');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATASET_NAME_INVALID_FORMAT);
  });

  test('should reject name exceeding 255 characters', () => {
    const longName = 'a'.repeat(256);
    const result = validateDatasetName(longName);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATASET_NAME_TOO_LONG);
  });

  test('should accept name with exactly 255 characters', () => {
    const longName = 'a'.repeat(255);
    const result = validateDatasetName(longName);
    expect(result.isValid).toBe(true);
  });

  test('should detect duplicate names', () => {
    const existingNames = ['dataset1', 'dataset2', 'dataset3'];
    const result = validateDatasetName('dataset2', existingNames);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATASET_NAME_DUPLICATE);
  });

  test('should trim whitespace before validation', () => {
    const result = validateDatasetName('  valid_name  ');
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// Column Name Validation Tests
// ============================================================================

describe('validateColumnName', () => {
  test('should validate correct column name', () => {
    const result = validateColumnName('customer_id');
    expect(result.isValid).toBe(true);
  });

  test('should reject empty name', () => {
    const result = validateColumnName('');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.COLUMN_NAME_REQUIRED);
  });

  test('should detect duplicate names (case-insensitive)', () => {
    const existingNames = ['customer_id', 'first_name', 'last_name'];
    const result = validateColumnName('CUSTOMER_ID', existingNames);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.COLUMN_NAME_DUPLICATE);
  });

  test('should detect duplicate with mixed case', () => {
    const existingNames = ['customer_id'];
    const result = validateColumnName('Customer_ID', existingNames);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.COLUMN_NAME_DUPLICATE);
  });

  test('should allow same name if not in existing names', () => {
    const existingNames = ['customer_id'];
    const result = validateColumnName('order_id', existingNames);
    expect(result.isValid).toBe(true);
  });

  test('should reject name starting with number', () => {
    const result = validateColumnName('1st_column');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.COLUMN_NAME_INVALID_FORMAT);
  });

  test('should accept name starting with underscore', () => {
    const result = validateColumnName('_private_field');
    expect(result.isValid).toBe(true);
  });

  test('should reject name exceeding 255 characters', () => {
    const longName = 'column_' + 'x'.repeat(250);
    const result = validateColumnName(longName);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.COLUMN_NAME_TOO_LONG);
  });
});

// ============================================================================
// FQN Validation Tests
// ============================================================================

describe('validateFQN', () => {
  test('should validate correct FQN', () => {
    const result = validateFQN('silver.sales.customers');
    expect(result.isValid).toBe(true);
  });

  test('should reject empty FQN', () => {
    const result = validateFQN('');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.FQN_REQUIRED);
  });

  test('should reject FQN with only 2 parts', () => {
    const result = validateFQN('silver.customers');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.FQN_MISSING_PARTS);
  });

  test('should reject FQN with 4 parts', () => {
    const result = validateFQN('silver.sales.dim.customers');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.FQN_MISSING_PARTS);
  });

  test('should accept valid medallion layers', () => {
    expect(validateFQN('raw.source.data').isValid).toBe(true);
    expect(validateFQN('bronze.staging.data').isValid).toBe(true);
    expect(validateFQN('silver.analytics.data').isValid).toBe(true);
    expect(validateFQN('gold.reporting.data').isValid).toBe(true);
  });

  test('should reject invalid medallion layer', () => {
    const result = validateFQN('platinum.sales.customers');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.FQN_INVALID_LAYER);
  });

  test('should accept case-insensitive layer names', () => {
    expect(validateFQN('Silver.sales.customers').isValid).toBe(true);
    expect(validateFQN('GOLD.reporting.metrics').isValid).toBe(true);
  });

  test('should reject FQN with empty parts', () => {
    const result = validateFQN('silver..customers');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.FQN_INVALID_FORMAT);
  });

  test('should reject FQN with invalid schema name', () => {
    const result = validateFQN('silver.sales-schema.customers');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.FQN_INVALID_FORMAT);
  });

  test('should reject FQN with invalid table name', () => {
    const result = validateFQN('silver.sales.customer-table');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.FQN_INVALID_FORMAT);
  });
});

// ============================================================================
// Data Type Validation Tests
// ============================================================================

describe('validateDataType', () => {
  test('should validate common data types', () => {
    expect(validateDataType('VARCHAR').isValid).toBe(true);
    expect(validateDataType('INT').isValid).toBe(true);
    expect(validateDataType('BIGINT').isValid).toBe(true);
    expect(validateDataType('DECIMAL').isValid).toBe(true);
    expect(validateDataType('DATE').isValid).toBe(true);
    expect(validateDataType('TIMESTAMP').isValid).toBe(true);
    expect(validateDataType('BOOLEAN').isValid).toBe(true);
    expect(validateDataType('JSON').isValid).toBe(true);
  });

  test('should accept case-insensitive data types', () => {
    expect(validateDataType('varchar').isValid).toBe(true);
    expect(validateDataType('Integer').isValid).toBe(true);
    expect(validateDataType('BOOLEAN').isValid).toBe(true);
  });

  test('should validate parameterized data types', () => {
    expect(validateDataType('VARCHAR(255)').isValid).toBe(true);
    expect(validateDataType('DECIMAL(10,2)').isValid).toBe(true);
    expect(validateDataType('CHAR(10)').isValid).toBe(true);
  });

  test('should reject invalid parameterized syntax', () => {
    expect(validateDataType('VARCHAR(abc)').isValid).toBe(false);
    expect(validateDataType('DECIMAL(10,)').isValid).toBe(false);
    expect(validateDataType('VARCHAR()').isValid).toBe(false);
  });

  test('should reject empty data type', () => {
    const result = validateDataType('');
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATA_TYPE_REQUIRED);
  });

  test('should reject data type exceeding 100 characters', () => {
    const longType = 'CUSTOM_TYPE_' + 'X'.repeat(90);
    const result = validateDataType(longType);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.DATA_TYPE_TOO_LONG);
  });

  test('should accept custom data types', () => {
    expect(validateDataType('CUSTOM_TYPE').isValid).toBe(true);
    expect(validateDataType('MY_SPECIAL_TYPE').isValid).toBe(true);
  });

  test('should reject custom types with invalid characters', () => {
    expect(validateDataType('TYPE-NAME').isValid).toBe(false);
    expect(validateDataType('TYPE@NAME').isValid).toBe(false);
  });

  test('should trim whitespace', () => {
    expect(validateDataType('  VARCHAR  ').isValid).toBe(true);
    expect(validateDataType('  INT  ').isValid).toBe(true);
  });
});

// ============================================================================
// Confidence Score Validation Tests
// ============================================================================

describe('validateConfidenceScore', () => {
  test('should validate scores in valid range', () => {
    expect(validateConfidenceScore(0).isValid).toBe(true);
    expect(validateConfidenceScore(50).isValid).toBe(true);
    expect(validateConfidenceScore(100).isValid).toBe(true);
  });

  test('should reject scores below 0', () => {
    const result = validateConfidenceScore(-1);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.CONFIDENCE_SCORE_OUT_OF_RANGE);
  });

  test('should reject scores above 100', () => {
    const result = validateConfidenceScore(101);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.CONFIDENCE_SCORE_OUT_OF_RANGE);
  });

  test('should reject non-numeric values', () => {
    const result = validateConfidenceScore(NaN);
    expect(result.isValid).toBe(false);
    expect(result.code).toBe(ValidationErrorCodes.CONFIDENCE_SCORE_INVALID);
  });

  test('should accept decimal values', () => {
    expect(validateConfidenceScore(85.5).isValid).toBe(true);
    expect(validateConfidenceScore(99.9).isValid).toBe(true);
  });

  test('should reject string values', () => {
    const result = validateConfidenceScore('85' as any);
    expect(result.isValid).toBe(false);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('generateFQN', () => {
  test('should generate FQN with lowercase layer', () => {
    const fqn = generateFQN('Silver', 'sales', 'customers');
    expect(fqn).toBe('silver.sales.customers');
  });

  test('should handle uppercase layer', () => {
    const fqn = generateFQN('GOLD', 'reporting', 'metrics');
    expect(fqn).toBe('gold.reporting.metrics');
  });
});

describe('parseFQN', () => {
  test('should parse valid FQN', () => {
    const result = parseFQN('silver.sales.customers');
    expect(result).toEqual({
      layer: 'silver',
      schema: 'sales',
      name: 'customers',
    });
  });

  test('should return null for invalid FQN', () => {
    const result = parseFQN('invalid-fqn');
    expect(result).toBeNull();
  });

  test('should return null for FQN with wrong number of parts', () => {
    const result = parseFQN('silver.customers');
    expect(result).toBeNull();
  });
});

describe('isParameterizedDataType', () => {
  test('should identify parameterized types', () => {
    expect(isParameterizedDataType('VARCHAR(255)')).toBe(true);
    expect(isParameterizedDataType('DECIMAL(10,2)')).toBe(true);
  });

  test('should identify non-parameterized types', () => {
    expect(isParameterizedDataType('INT')).toBe(false);
    expect(isParameterizedDataType('VARCHAR')).toBe(false);
  });
});

describe('getBaseDataType', () => {
  test('should extract base type from parameterized type', () => {
    expect(getBaseDataType('VARCHAR(255)')).toBe('VARCHAR');
    expect(getBaseDataType('DECIMAL(10,2)')).toBe('DECIMAL');
  });

  test('should return type as-is if not parameterized', () => {
    expect(getBaseDataType('INT')).toBe('INT');
    expect(getBaseDataType('BOOLEAN')).toBe('BOOLEAN');
  });

  test('should handle lowercase types', () => {
    expect(getBaseDataType('varchar(100)')).toBe('VARCHAR');
  });
});

describe('getConfidenceLevel', () => {
  test('should return high for scores >= 90', () => {
    expect(getConfidenceLevel(90)).toBe('high');
    expect(getConfidenceLevel(95)).toBe('high');
    expect(getConfidenceLevel(100)).toBe('high');
  });

  test('should return medium for scores 70-89', () => {
    expect(getConfidenceLevel(70)).toBe('medium');
    expect(getConfidenceLevel(80)).toBe('medium');
    expect(getConfidenceLevel(89)).toBe('medium');
  });

  test('should return low for scores < 70', () => {
    expect(getConfidenceLevel(0)).toBe('low');
    expect(getConfidenceLevel(50)).toBe('low');
    expect(getConfidenceLevel(69)).toBe('low');
  });

  test('should return invalid for invalid scores', () => {
    expect(getConfidenceLevel(-1)).toBe('invalid');
    expect(getConfidenceLevel(101)).toBe('invalid');
    expect(getConfidenceLevel(NaN)).toBe('invalid');
  });
});

describe('getConfidenceLevelColor', () => {
  test('should return green for high confidence', () => {
    const color = getConfidenceLevelColor(95);
    expect(color).toContain('green');
  });

  test('should return yellow for medium confidence', () => {
    const color = getConfidenceLevelColor(80);
    expect(color).toContain('yellow');
  });

  test('should return red for low confidence', () => {
    const color = getConfidenceLevelColor(50);
    expect(color).toContain('red');
  });

  test('should return gray for invalid scores', () => {
    const color = getConfidenceLevelColor(-1);
    expect(color).toContain('gray');
  });
});

describe('getDataTypesByCategory', () => {
  test('should return data types grouped by category', () => {
    const categories = getDataTypesByCategory();
    expect(categories).toHaveProperty('String');
    expect(categories).toHaveProperty('Numeric');
    expect(categories).toHaveProperty('DateTime');
    expect(categories).toHaveProperty('Boolean');
    expect(categories).toHaveProperty('Binary');
    expect(categories).toHaveProperty('Complex');
  });

  test('should have VARCHAR in String category', () => {
    const categories = getDataTypesByCategory();
    expect(categories.String).toContain('VARCHAR');
  });

  test('should have INT in Numeric category', () => {
    const categories = getDataTypesByCategory();
    expect(categories.Numeric).toContain('INT');
  });

  test('should have TIMESTAMP in DateTime category', () => {
    const categories = getDataTypesByCategory();
    expect(categories.DateTime).toContain('TIMESTAMP');
  });
});

describe('validateBatchNames', () => {
  test('should validate all names successfully', () => {
    const names = ['column1', 'column2', 'column3'];
    const results = validateBatchNames(names);
    expect(results).toHaveLength(3);
    expect(results.every(r => r.isValid)).toBe(true);
  });

  test('should detect duplicates within batch', () => {
    const names = ['column1', 'column2', 'column1'];
    const results = validateBatchNames(names);
    expect(results).toHaveLength(3);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(true);
    expect(results[2].isValid).toBe(false);
    expect(results[2].code).toBe(ValidationErrorCodes.COLUMN_NAME_DUPLICATE);
  });

  test('should detect duplicates against existing names', () => {
    const names = ['column1', 'column2'];
    const existing = ['column2', 'column3'];
    const results = validateBatchNames(names, existing);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(false);
    expect(results[1].code).toBe(ValidationErrorCodes.COLUMN_NAME_DUPLICATE);
  });

  test('should use case-insensitive comparison by default', () => {
    const names = ['column1', 'COLUMN1'];
    const results = validateBatchNames(names);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(false);
  });

  test('should use case-sensitive comparison when specified', () => {
    const names = ['dataset1', 'DATASET1'];
    const results = validateBatchNames(names, [], true);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(true); // Different case is allowed
  });

  test('should catch invalid format in batch', () => {
    const names = ['valid_name', '123invalid', 'another_valid'];
    const results = validateBatchNames(names);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(false);
    expect(results[1].code).toBe(ValidationErrorCodes.COLUMN_NAME_INVALID_FORMAT);
    expect(results[2].isValid).toBe(true);
  });
});
