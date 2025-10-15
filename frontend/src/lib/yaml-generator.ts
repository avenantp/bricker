/**
 * YAML Generator for exporting datasets to YAML format
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

import * as yaml from 'js-yaml';
import type { Dataset } from '../types/dataset';
import type { Column } from '../types/column';
import type { Lineage } from '../types/lineage';

/**
 * YAML Dataset structure for export
 */
interface YAMLDataset {
  dataset: {
    dataset_id: string;
    fqn: string;
    name: string;
    medallion_layer?: string;
    entity_type?: string;
    entity_subtype?: string;
    materialization_type?: string;
    description?: string;
    metadata?: Record<string, any>;
    ai_confidence_score?: number;
  };
  columns: Array<{
    column_id: string;
    name: string;
    data_type: string;
    description?: string;
    business_name?: string;
    is_primary_key: boolean;
    is_foreign_key: boolean;
    is_nullable: boolean;
    default_value?: string;
    reference_column_id?: string;
    reference_type?: string;
    reference_description?: string;
    transformation_logic?: string;
    ai_confidence_score?: number;
    position?: number;
  }>;
  lineage: Array<{
    lineage_id: string;
    downstream_column_id: string;
    upstream_dataset_id: string;
    upstream_column_id: string;
    mapping_type: string;
    transformation_expression?: string;
    lineage_type: string;
  }>;
  metadata: {
    version: string;
    generated_at: string;
    generator: string;
  };
}

/**
 * Generate YAML content for a dataset
 */
export async function generateDatasetYAML(
  dataset: Dataset,
  columns: Column[],
  lineages: Lineage[]
): Promise<string> {
  const yamlData: YAMLDataset = {
    dataset: {
      dataset_id: dataset.dataset_id,
      fqn: dataset.fqn,
      name: dataset.name,
      medallion_layer: dataset.medallion_layer || undefined,
      entity_type: dataset.entity_type || undefined,
      entity_subtype: dataset.entity_subtype || undefined,
      materialization_type: dataset.materialization_type || undefined,
      description: dataset.description || undefined,
      metadata: dataset.metadata || undefined,
      ai_confidence_score: dataset.ai_confidence_score || undefined,
    },
    columns: columns.map((col) => ({
      column_id: col.column_id,
      name: col.name,
      data_type: col.data_type,
      description: col.description || undefined,
      business_name: col.business_name || undefined,
      is_primary_key: col.is_primary_key,
      is_foreign_key: col.is_foreign_key,
      is_nullable: col.is_nullable,
      default_value: col.default_value || undefined,
      reference_column_id: col.reference_column_id || undefined,
      reference_type: col.reference_type || undefined,
      reference_description: col.reference_description || undefined,
      transformation_logic: col.transformation_logic || undefined,
      ai_confidence_score: col.ai_confidence_score || undefined,
      position: col.position || undefined,
    })),
    lineage: lineages.map((lin) => ({
      lineage_id: lin.lineage_id,
      downstream_column_id: lin.downstream_column_id,
      upstream_dataset_id: lin.upstream_dataset_id,
      upstream_column_id: lin.upstream_column_id,
      mapping_type: lin.mapping_type,
      transformation_expression: lin.transformation_expression || undefined,
      lineage_type: lin.lineage_type,
    })),
    metadata: {
      version: '1.0',
      generated_at: new Date().toISOString(),
      generator: 'uroq-yaml-generator',
    },
  };

  return yaml.dump(yamlData, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
    skipInvalid: true,
  });
}

/**
 * Generate YAML for multiple datasets (workspace export)
 */
export async function generateWorkspaceYAML(
  datasets: Dataset[],
  columnsMap: Map<string, Column[]>,
  lineagesMap: Map<string, Lineage[]>
): Promise<Map<string, string>> {
  const yamlFiles = new Map<string, string>();

  for (const dataset of datasets) {
    const columns = columnsMap.get(dataset.dataset_id) || [];
    const lineages = lineagesMap.get(dataset.dataset_id) || [];

    const yamlContent = await generateDatasetYAML(dataset, columns, lineages);
    const fileName = `${dataset.dataset_id}.yml`;

    yamlFiles.set(fileName, yamlContent);
  }

  return yamlFiles;
}

/**
 * Generate compact YAML (minimal metadata for smaller files)
 */
export async function generateCompactDatasetYAML(
  dataset: Dataset,
  columns: Column[],
  lineages: Lineage[]
): Promise<string> {
  const compactData = {
    dataset: {
      id: dataset.dataset_id,
      fqn: dataset.fqn,
      name: dataset.name,
      ...(dataset.medallion_layer && { layer: dataset.medallion_layer }),
      ...(dataset.entity_type && { type: dataset.entity_type }),
      ...(dataset.description && { desc: dataset.description }),
    },
    columns: columns.map((col) => ({
      id: col.column_id,
      name: col.name,
      type: col.data_type,
      ...(col.description && { desc: col.description }),
      ...(col.is_primary_key && { pk: true }),
      ...(col.is_foreign_key && { fk: true }),
      ...(col.reference_column_id && { ref: col.reference_column_id }),
    })),
    ...(lineages.length > 0 && {
      lineage: lineages.map((lin) => ({
        to: lin.downstream_column_id,
        from: `${lin.upstream_dataset_id}.${lin.upstream_column_id}`,
        map: lin.mapping_type,
      })),
    }),
  };

  return yaml.dump(compactData, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Generate human-readable YAML with comments
 */
export async function generateDocumentedDatasetYAML(
  dataset: Dataset,
  columns: Column[],
  lineages: Lineage[]
): Promise<string> {
  const yamlContent = await generateDatasetYAML(dataset, columns, lineages);

  // Add header comments
  const header = `# Dataset: ${dataset.name}
# FQN: ${dataset.fqn}
# Generated: ${new Date().toISOString()}
#
# This file defines the dataset structure, columns, and data lineage.
# Do not edit the IDs manually - they are managed by the system.
#
---
`;

  return header + yamlContent;
}

/**
 * Generate SQL DDL from dataset YAML structure
 */
export function generateDDLFromDataset(
  dataset: Dataset,
  columns: Column[]
): string {
  const tableName = dataset.fqn;
  const columnDefs = columns
    .map((col) => {
      let def = `  ${col.name} ${col.data_type}`;

      if (col.is_primary_key) {
        def += ' PRIMARY KEY';
      }

      if (!col.is_nullable && !col.is_primary_key) {
        def += ' NOT NULL';
      }

      if (col.default_value) {
        def += ` DEFAULT ${col.default_value}`;
      }

      if (col.description) {
        def += ` -- ${col.description}`;
      }

      return def;
    })
    .join(',\n');

  let ddl = `CREATE TABLE ${tableName} (\n${columnDefs}\n);\n`;

  // Add table comment
  if (dataset.description) {
    ddl += `\nCOMMENT ON TABLE ${tableName} IS '${dataset.description.replace(/'/g, "''")}';\n`;
  }

  // Add column comments
  columns.forEach((col) => {
    if (col.description) {
      ddl += `COMMENT ON COLUMN ${tableName}.${col.name} IS '${col.description.replace(/'/g, "''")}';\n`;
    }
  });

  return ddl;
}

/**
 * Generate Markdown documentation from dataset
 */
export function generateMarkdownDocumentation(
  dataset: Dataset,
  columns: Column[],
  lineages: Lineage[]
): string {
  let markdown = `# ${dataset.name}\n\n`;

  // Dataset info
  markdown += `**FQN:** \`${dataset.fqn}\`\n\n`;
  if (dataset.description) {
    markdown += `${dataset.description}\n\n`;
  }

  // Metadata
  if (dataset.medallion_layer || dataset.entity_type) {
    markdown += `## Classification\n\n`;
    if (dataset.medallion_layer) {
      markdown += `- **Medallion Layer:** ${dataset.medallion_layer}\n`;
    }
    if (dataset.entity_type) {
      markdown += `- **Entity Type:** ${dataset.entity_type}\n`;
    }
    if (dataset.entity_subtype) {
      markdown += `- **Entity Subtype:** ${dataset.entity_subtype}\n`;
    }
    if (dataset.materialization_type) {
      markdown += `- **Materialization:** ${dataset.materialization_type}\n`;
    }
    markdown += `\n`;
  }

  // Columns table
  markdown += `## Columns\n\n`;
  markdown += `| Column | Type | Description | Flags |\n`;
  markdown += `|--------|------|-------------|-------|\n`;

  columns.forEach((col) => {
    const flags: string[] = [];
    if (col.is_primary_key) flags.push('PK');
    if (col.is_foreign_key) flags.push('FK');
    if (!col.is_nullable) flags.push('NOT NULL');

    markdown += `| ${col.name} | ${col.data_type} | ${col.description || '-'} | ${flags.join(', ') || '-'} |\n`;
  });

  markdown += `\n`;

  // Lineage
  if (lineages.length > 0) {
    markdown += `## Data Lineage\n\n`;
    markdown += `| Downstream Column | Upstream | Mapping Type | Transformation |\n`;
    markdown += `|-------------------|----------|--------------|----------------|\n`;

    lineages.forEach((lin) => {
      const downstreamCol = columns.find((c) => c.column_id === lin.downstream_column_id);
      markdown += `| ${downstreamCol?.name || 'Unknown'} | ${lin.upstream_dataset_id}.${lin.upstream_column_id} | ${lin.mapping_type} | ${lin.transformation_expression || '-'} |\n`;
    });

    markdown += `\n`;
  }

  // Metadata
  markdown += `---\n\n`;
  markdown += `*Generated: ${new Date().toISOString()}*\n`;

  return markdown;
}
