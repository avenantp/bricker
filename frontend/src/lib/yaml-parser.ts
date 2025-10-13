/**
 * YAML Parser for importing datasets from YAML format
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

import * as yaml from 'js-yaml';
import type { Dataset } from '../types/dataset';
import type { Column } from '../types/column';
import type { Lineage } from '../types/lineage';

/**
 * Parsed dataset data structure
 */
export interface ParsedDatasetData {
  dataset: Partial<Dataset>;
  columns: Partial<Column>[];
  lineages: Partial<Lineage>[];
}

/**
 * Parse YAML content into dataset structure
 */
export async function parseDatasetYAML(
  yamlContent: string
): Promise<ParsedDatasetData> {
  try {
    const data = yaml.load(yamlContent) as any;

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid YAML format: expected object');
    }

    // Extract dataset
    if (!data.dataset || typeof data.dataset !== 'object') {
      throw new Error('Invalid YAML format: missing or invalid dataset section');
    }

    const dataset: Partial<Dataset> = {
      dataset_id: data.dataset.dataset_id || data.dataset.id,
      fqn: data.dataset.fqn,
      name: data.dataset.name,
      medallion_layer: data.dataset.medallion_layer || data.dataset.layer || undefined,
      entity_type: data.dataset.entity_type || data.dataset.type || undefined,
      entity_subtype: data.dataset.entity_subtype || undefined,
      materialization_type: data.dataset.materialization_type || undefined,
      description: data.dataset.description || data.dataset.desc || undefined,
      metadata: data.dataset.metadata || {},
      ai_confidence_score: data.dataset.ai_confidence_score || undefined,
    };

    // Validate required fields
    if (!dataset.fqn || !dataset.name) {
      throw new Error('Invalid YAML format: dataset must have fqn and name');
    }

    // Extract columns
    const columns: Partial<Column>[] = [];
    if (Array.isArray(data.columns)) {
      data.columns.forEach((col: any, index: number) => {
        if (!col.name || !col.data_type) {
          throw new Error(`Invalid column at index ${index}: missing name or data_type`);
        }

        columns.push({
          column_id: col.column_id || col.id,
          name: col.name,
          data_type: col.data_type || col.type,
          description: col.description || col.desc || undefined,
          business_name: col.business_name || undefined,
          is_primary_key: col.is_primary_key || col.pk || false,
          is_foreign_key: col.is_foreign_key || col.fk || false,
          is_nullable: col.is_nullable !== undefined ? col.is_nullable : true,
          default_value: col.default_value || undefined,
          reference_column_id: col.reference_column_id || col.ref || undefined,
          reference_type: col.reference_type || undefined,
          reference_description: col.reference_description || undefined,
          transformation_logic: col.transformation_logic || undefined,
          ai_confidence_score: col.ai_confidence_score || undefined,
          position: col.position !== undefined ? col.position : index,
        });
      });
    }

    // Extract lineage
    const lineages: Partial<Lineage>[] = [];
    if (Array.isArray(data.lineage)) {
      data.lineage.forEach((lin: any, index: number) => {
        // Support both full format and compact format
        let upstreamDatasetId: string | undefined;
        let upstreamColumnId: string | undefined;

        if (lin.from && typeof lin.from === 'string') {
          // Compact format: "dataset_id.column_id"
          const parts = lin.from.split('.');
          if (parts.length === 2) {
            upstreamDatasetId = parts[0];
            upstreamColumnId = parts[1];
          }
        } else {
          // Full format
          upstreamDatasetId = lin.upstream_dataset_id;
          upstreamColumnId = lin.upstream_column_id;
        }

        if (!upstreamDatasetId || !upstreamColumnId) {
          throw new Error(`Invalid lineage at index ${index}: missing upstream references`);
        }

        lineages.push({
          lineage_id: lin.lineage_id,
          downstream_column_id: lin.downstream_column_id || lin.to,
          upstream_dataset_id: upstreamDatasetId,
          upstream_column_id: upstreamColumnId,
          mapping_type: lin.mapping_type || lin.map || 'Direct',
          transformation_expression: lin.transformation_expression || undefined,
          lineage_type: lin.lineage_type || 'direct',
        });
      });
    }

    return {
      dataset,
      columns,
      lineages,
    };
  } catch (error: any) {
    throw new Error(`Failed to parse YAML: ${error.message}`);
  }
}

/**
 * Parse multiple YAML files (workspace import)
 */
export async function parseMultipleDatasetYAML(
  yamlFiles: Map<string, string>
): Promise<Map<string, ParsedDatasetData>> {
  const parsedData = new Map<string, ParsedDatasetData>();
  const errors: string[] = [];

  for (const [fileName, yamlContent] of yamlFiles.entries()) {
    try {
      const data = await parseDatasetYAML(yamlContent);
      parsedData.set(fileName, data);
    } catch (error: any) {
      errors.push(`${fileName}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Some files failed to parse:', errors);
  }

  return parsedData;
}

/**
 * Validate parsed dataset data
 */
export function validateParsedDataset(
  data: ParsedDatasetData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate dataset
  if (!data.dataset.fqn) {
    errors.push('Dataset FQN is required');
  }
  if (!data.dataset.name) {
    errors.push('Dataset name is required');
  }

  // Validate columns
  const columnNames = new Set<string>();
  const columnIds = new Set<string>();

  data.columns.forEach((col, index) => {
    if (!col.name) {
      errors.push(`Column at index ${index}: name is required`);
    } else {
      if (columnNames.has(col.name)) {
        errors.push(`Duplicate column name: ${col.name}`);
      }
      columnNames.add(col.name);
    }

    if (!col.data_type) {
      errors.push(`Column ${col.name || index}: data_type is required`);
    }

    if (col.column_id) {
      if (columnIds.has(col.column_id)) {
        errors.push(`Duplicate column ID: ${col.column_id}`);
      }
      columnIds.add(col.column_id);
    }

    // Validate reference
    if (col.reference_column_id && !col.reference_type) {
      errors.push(`Column ${col.name}: reference_type is required when reference_column_id is set`);
    }
  });

  // Validate lineages
  data.lineages.forEach((lin, index) => {
    if (!lin.downstream_column_id) {
      errors.push(`Lineage at index ${index}: downstream_column_id is required`);
    }

    if (!lin.upstream_dataset_id) {
      errors.push(`Lineage at index ${index}: upstream_dataset_id is required`);
    }

    if (!lin.upstream_column_id) {
      errors.push(`Lineage at index ${index}: upstream_column_id is required`);
    }

    if (!lin.mapping_type) {
      errors.push(`Lineage at index ${index}: mapping_type is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert parsed data to create payloads for services
 */
export function parsedDataToCreatePayloads(data: ParsedDatasetData) {
  return {
    dataset: data.dataset,
    columns: data.columns,
    lineages: data.lineages,
  };
}

/**
 * Parse DDL SQL into dataset structure (basic support)
 */
export function parseDDLToDataset(
  ddl: string,
  fqn: string,
  name: string
): ParsedDatasetData {
  const columns: Partial<Column>[] = [];

  // Extract CREATE TABLE statement
  const createTableMatch = ddl.match(
    /CREATE\s+TABLE\s+[\w.]+\s*\(([\s\S]+?)\);/i
  );

  if (!createTableMatch) {
    throw new Error('Invalid DDL: could not find CREATE TABLE statement');
  }

  const columnDefs = createTableMatch[1];

  // Parse column definitions (basic parsing)
  const columnLines = columnDefs.split(',').map((line) => line.trim());

  columnLines.forEach((line, index) => {
    // Skip constraint definitions
    if (
      line.match(/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|CONSTRAINT)/i)
    ) {
      return;
    }

    // Extract column name and type
    const match = line.match(/^(\w+)\s+([\w()]+)(?:\s+(.*))?/i);
    if (!match) {
      return;
    }

    const [, colName, dataType, modifiers] = match;

    const column: Partial<Column> = {
      name: colName,
      data_type: dataType,
      is_primary_key: /PRIMARY\s+KEY/i.test(modifiers || ''),
      is_foreign_key: false,
      is_nullable: !/NOT\s+NULL/i.test(modifiers || ''),
      position: index,
    };

    // Extract default value
    const defaultMatch = (modifiers || '').match(/DEFAULT\s+(.+?)(?:\s+|$)/i);
    if (defaultMatch) {
      column.default_value = defaultMatch[1];
    }

    // Extract comment
    const commentMatch = (modifiers || '').match(/--\s*(.+)$/);
    if (commentMatch) {
      column.description = commentMatch[1].trim();
    }

    columns.push(column);
  });

  return {
    dataset: {
      fqn,
      name,
      description: 'Imported from DDL',
    },
    columns,
    lineages: [],
  };
}

/**
 * Parse CSV column metadata into dataset structure
 */
export function parseCSVColumnsToDataset(
  csvContent: string,
  fqn: string,
  name: string
): ParsedDatasetData {
  const columns: Partial<Column>[] = [];
  const lines = csvContent.split('\n').map((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('Empty CSV content');
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim());

  // Expected columns: name, data_type, description, is_nullable, is_primary_key
  const nameIdx = headers.indexOf('name');
  const typeIdx = headers.indexOf('data_type');
  const descIdx = headers.indexOf('description');
  const nullableIdx = headers.indexOf('is_nullable');
  const pkIdx = headers.indexOf('is_primary_key');

  if (nameIdx === -1 || typeIdx === -1) {
    throw new Error('CSV must have at least "name" and "data_type" columns');
  }

  // Parse data rows
  lines.slice(1).forEach((line, index) => {
    if (!line) return;

    const values = line.split(',').map((v) => v.trim());

    if (values.length < 2) return;

    const column: Partial<Column> = {
      name: values[nameIdx],
      data_type: values[typeIdx],
      description: descIdx !== -1 ? values[descIdx] : undefined,
      is_nullable: nullableIdx !== -1 ? values[nullableIdx] === 'true' : true,
      is_primary_key: pkIdx !== -1 ? values[pkIdx] === 'true' : false,
      is_foreign_key: false,
      position: index,
    };

    columns.push(column);
  });

  return {
    dataset: {
      fqn,
      name,
      description: 'Imported from CSV',
    },
    columns,
    lineages: [],
  };
}

/**
 * Merge parsed datasets (for conflict resolution)
 */
export function mergeParsedDatasets(
  base: ParsedDatasetData,
  ours: ParsedDatasetData,
  theirs: ParsedDatasetData
): ParsedDatasetData {
  // Simple three-way merge: prefer changes over base
  // If both ours and theirs changed the same field, prefer ours

  const merged: ParsedDatasetData = {
    dataset: { ...base.dataset },
    columns: [...base.columns],
    lineages: [...base.lineages],
  };

  // Merge dataset properties
  Object.keys(ours.dataset).forEach((key) => {
    const k = key as keyof Dataset;
    if ((ours.dataset as any)[k] !== (base.dataset as any)[k]) {
      (merged.dataset as any)[k] = (ours.dataset as any)[k];
    }
  });

  Object.keys(theirs.dataset).forEach((key) => {
    const k = key as keyof Dataset;
    if (
      (theirs.dataset as any)[k] !== (base.dataset as any)[k] &&
      (ours.dataset as any)[k] === (base.dataset as any)[k]
    ) {
      // Their change, our didn't change - take theirs
      (merged.dataset as any)[k] = (theirs.dataset as any)[k];
    }
  });

  // Merge columns (by column_id)
  const columnMap = new Map<string, Partial<Column>>();

  base.columns.forEach((col) => {
    if (col.column_id) {
      columnMap.set(col.column_id, { ...col });
    }
  });

  ours.columns.forEach((col) => {
    if (col.column_id) {
      columnMap.set(col.column_id, { ...col });
    }
  });

  theirs.columns.forEach((col) => {
    if (col.column_id) {
      const existing = columnMap.get(col.column_id);
      if (!existing || JSON.stringify(existing) === JSON.stringify(base.columns.find((c) => c.column_id === col.column_id))) {
        // New or unchanged in ours - take theirs
        columnMap.set(col.column_id, { ...col });
      }
    }
  });

  merged.columns = Array.from(columnMap.values());

  // Merge lineages (by lineage_id)
  const lineageMap = new Map<string, Partial<Lineage>>();

  base.lineages.forEach((lin) => {
    if (lin.lineage_id) {
      lineageMap.set(lin.lineage_id, { ...lin });
    }
  });

  ours.lineages.forEach((lin) => {
    if (lin.lineage_id) {
      lineageMap.set(lin.lineage_id, { ...lin });
    }
  });

  theirs.lineages.forEach((lin) => {
    if (lin.lineage_id) {
      const existing = lineageMap.get(lin.lineage_id);
      if (!existing || JSON.stringify(existing) === JSON.stringify(base.lineages.find((l) => l.lineage_id === lin.lineage_id))) {
        lineageMap.set(lin.lineage_id, { ...lin });
      }
    }
  });

  merged.lineages = Array.from(lineageMap.values());

  return merged;
}
