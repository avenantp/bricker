# Technical Specification: Data Vault Modeling and Acceleration

## 6. Data Vault Modeling and Acceleration

### 6.1 Overview

**Purpose**: Automatically generate Data Vault 2.0 models (Hubs, Links, Satellites, Link Satellites, PIT, Bridge tables) from source datasets with intelligent analysis of business keys, relationships, and attribute grouping.

**Key Features**:
- Automated Hub generation from business keys
- Satellite generation with attribute grouping by change rate
- Link generation from relationships
- Link Satellite generation for relationship attributes
- PIT (Point-in-Time) and Bridge table suggestions
- Configurable naming conventions and hash strategies
- Preview and edit capabilities before applying
- Databricks optimizations (Liquid Clustering, partitioning, CDF)

---

### 6.2 Data Model Extensions

#### 6.2.1 Accelerator Configuration (Project Settings)

Extend the `projects` table configuration JSONB:

```typescript
interface DataVaultConfiguration {
  // Naming patterns
  hub_naming_pattern: string; // "HUB_{entity_name}"
  satellite_naming_pattern: string; // "SAT_{hub}_{descriptor}"
  link_naming_pattern: string; // "LNK_{entity1}_{entity2}"
  same_as_link_naming_pattern: string; // "SAL_{entity}"
  hierarchy_link_naming_pattern: string; // "HAL_{entity}"
  link_satellite_naming_pattern: string; // "LSAT_{link}_{descriptor}"
  
  // Key strategies
  hash_algorithm: string; // "SHA-256" | "MD5" | "SHA-1"
  use_hash_keys: boolean;
  use_sequence_keys: boolean;
  hash_key_datatype: string; // "BINARY" | "STRING"
  
  // Structural options
  include_load_date: boolean;
  include_record_source: boolean;
  include_hash_diff: boolean; // For satellites
  multi_active_satellites: boolean;
  
  // Schemas
  hub_schema: string; // default: "rdv"
  link_schema: string; // default: "rdv"
  satellite_schema: string; // default: "rdv"
  link_satellite_schema: string; // default: "rdv"
  
  // Accelerator behavior
  accelerate_hub_keys: boolean; // Include business keys in hub
  accelerate_link_keys: boolean; // Include relationship keys in link
  accelerate_link_satellites: boolean; // Auto-generate link satellites
  accelerate_correct_key_names: boolean; // Standardize key naming
  
  // Databricks optimizations
  enable_liquid_clustering: boolean;
  enable_change_data_feed: boolean;
  enable_deletion_vectors: boolean;
  partition_by_load_date: boolean;
}
```

#### 6.2.2 Dataset Type Extensions

```typescript
// Extend entity_type enum
enum EntityType {
  // ... existing
  DataVault = 'DataVault'
}

// Extend entity_subtype enum for DataVault
enum DataVaultSubtype {
  Hub = 'Hub',
  Link = 'Link',
  Satellite = 'Satellite',
  LinkSatellite = 'LinkSatellite',
  PIT = 'PIT',
  Bridge = 'Bridge',
  SameAsLink = 'SameAsLink', // SAL
  HierarchyLink = 'HierarchyLink' // HAL
}
```

#### 6.2.3 Column Change Types

```typescript
enum ColumnChangeType {
  // Existing
  Key = 'Key',
  Update = 'Update',
  
  // Data Vault specific
  IntegrationKey = 'IntegrationKey', // Business key
  HashKey = 'HashKey', // Surrogate hash key
  DrivingKey = 'DrivingKey', // Primary driving key in link
  LinkReference = 'LinkReference', // FK to hub in link
  HubReference = 'HubReference', // FK to hub in satellite
  LinkSatelliteReference = 'LinkSatelliteReference', // FK to link in link satellite
  HashDiff = 'HashDiff', // Hash of all attributes for change detection
  MultiActiveKey = 'MultiActiveKey', // Multi-active satellite key
  LoadDate = 'LoadDate',
  RecordSource = 'RecordSource'
}
```

---

### 6.3 Accelerator Analysis Engine

#### 6.3.1 Business Key Detection

```typescript
interface BusinessKeyAnalysis {
  dataset_id: string;
  detected_keys: DetectedKey[];
  confidence_score: number;
}

interface DetectedKey {
  column_ids: string[]; // Can be composite
  key_type: 'primary' | 'natural' | 'alternate';
  confidence: number;
  reasoning: string;
}

// Algorithm
class BusinessKeyDetector {
  detectBusinessKeys(dataset: Dataset, columns: Column[]): BusinessKeyAnalysis {
    const keys: DetectedKey[] = [];
    
    // 1. Look for primary keys
    const pkColumns = columns.filter(c => c.is_primary_key);
    if (pkColumns.length > 0) {
      keys.push({
        column_ids: pkColumns.map(c => c.id),
        key_type: 'primary',
        confidence: 100,
        reasoning: 'Marked as primary key'
      });
    }
    
    // 2. Look for natural keys (common patterns)
    const naturalKeyPatterns = [
      /^.*_id$/i,
      /^.*_key$/i,
      /^.*_code$/i,
      /^.*_number$/i
    ];
    
    for (const column of columns) {
      if (naturalKeyPatterns.some(pattern => pattern.test(column.name))) {
        keys.push({
          column_ids: [column.id],
          key_type: 'natural',
          confidence: 80,
          reasoning: `Column name matches natural key pattern: ${column.name}`
        });
      }
    }
    
    // 3. Analyze column properties
    for (const column of columns) {
      // Low nullability + low cardinality = likely key
      if (!column.is_nullable && column.data_type === 'STRING') {
        keys.push({
          column_ids: [column.id],
          key_type: 'natural',
          confidence: 60,
          reasoning: 'Non-nullable string column'
        });
      }
    }
    
    // 4. Composite keys from multiple columns
    const compositeKeyGroups = this.findCompositeKeys(columns);
    keys.push(...compositeKeyGroups);
    
    return {
      dataset_id: dataset.id,
      detected_keys: keys,
      confidence_score: keys.length > 0 ? Math.max(...keys.map(k => k.confidence)) : 0
    };
  }
  
  private findCompositeKeys(columns: Column[]): DetectedKey[] {
    // Logic to detect composite keys
    // Look for groups of non-nullable columns that together form a unique constraint
    return [];
  }
}
```

#### 6.3.2 Relationship Analysis

```typescript
interface RelationshipAnalysis {
  source_dataset_id: string;
  relationships: DetectedRelationship[];
}

interface DetectedRelationship {
  target_dataset_id: string;
  source_column_ids: string[];
  target_column_ids: string[];
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  confidence: number;
  reasoning: string;
}

class RelationshipAnalyzer {
  analyzeRelationships(dataset: Dataset, allDatasets: Dataset[]): RelationshipAnalysis {
    const relationships: DetectedRelationship[] = [];
    
    // 1. Explicit foreign keys (from references)
    const columns = getColumns(dataset.id);
    for (const column of columns) {
      if (column.reference_column_id) {
        const targetColumn = getColumn(column.reference_column_id);
        relationships.push({
          target_dataset_id: targetColumn.dataset_id,
          source_column_ids: [column.id],
          target_column_ids: [targetColumn.id],
          relationship_type: 'many_to_one',
          confidence: 100,
          reasoning: 'Explicit foreign key reference'
        });
      }
    }
    
    // 2. Implicit relationships (naming conventions)
    for (const otherDataset of allDatasets) {
      if (otherDataset.id === dataset.id) continue;
      
      const matches = this.findImplicitRelationships(dataset, otherDataset);
      relationships.push(...matches);
    }
    
    return {
      source_dataset_id: dataset.id,
      relationships
    };
  }
  
  private findImplicitRelationships(
    dataset: Dataset, 
    otherDataset: Dataset
  ): DetectedRelationship[] {
    const relationships: DetectedRelationship[] = [];
    const sourceColumns = getColumns(dataset.id);
    const targetColumns = getColumns(otherDataset.id);
    
    // Look for naming patterns: customer_id in orders table
    for (const sourceCol of sourceColumns) {
      for (const targetCol of targetColumns) {
        // Match: orders.customer_id -> customers.customer_id
        if (sourceCol.name === targetCol.name && targetCol.is_primary_key) {
          relationships.push({
            target_dataset_id: otherDataset.id,
            source_column_ids: [sourceCol.id],
            target_column_ids: [targetCol.id],
            relationship_type: 'many_to_one',
            confidence: 75,
            reasoning: `Column name match: ${sourceCol.name}`
          });
        }
        
        // Match: orders.customer_id -> customers.id
        const datasetNameSingular = this.singularize(otherDataset.name);
        if (sourceCol.name === `${datasetNameSingular}_id` && targetCol.is_primary_key) {
          relationships.push({
            target_dataset_id: otherDataset.id,
            source_column_ids: [sourceCol.id],
            target_column_ids: [targetCol.id],
            relationship_type: 'many_to_one',
            confidence: 70,
            reasoning: `Naming convention: ${sourceCol.name} -> ${otherDataset.name}.${targetCol.name}`
          });
        }
      }
    }
    
    return relationships;
  }
  
  private singularize(word: string): string {
    // Simple singularization (can use library like pluralize)
    if (word.endsWith('s')) return word.slice(0, -1);
    return word;
  }
}
```

#### 6.3.3 Attribute Grouping (for Satellites)

```typescript
interface AttributeGroup {
  group_name: string;
  column_ids: string[];
  change_rate: 'high' | 'medium' | 'low';
  reasoning: string;
}

class AttributeGrouper {
  groupAttributes(dataset: Dataset, columns: Column[]): AttributeGroup[] {
    const groups: AttributeGroup[] = [];
    
    // Exclude keys and system columns
    const descriptiveColumns = columns.filter(c => 
      !c.is_primary_key && 
      !c.is_foreign_key &&
      !this.isSystemColumn(c)
    );
    
    // Group by business subject (if available)
    const byBusinessSubject = this.groupByBusinessSubject(descriptiveColumns);
    
    // If no business subjects, group by naming patterns
    if (byBusinessSubject.size === 0) {
      return this.groupByNamingPatterns(descriptiveColumns);
    }
    
    // Convert business subject groups to attribute groups
    for (const [subject, cols] of byBusinessSubject.entries()) {
      groups.push({
        group_name: subject,
        column_ids: cols.map(c => c.id),
        change_rate: this.estimateChangeRate(cols),
        reasoning: `Grouped by business subject: ${subject}`
      });
    }
    
    return groups;
  }
  
  private isSystemColumn(column: Column): boolean {
    const systemPatterns = [
      /^created_/i,
      /^updated_/i,
      /^modified_/i,
      /^deleted_/i,
      /^load_date$/i,
      /^record_source$/i
    ];
    return systemPatterns.some(p => p.test(column.name));
  }
  
  private groupByBusinessSubject(columns: Column[]): Map<string, Column[]> {
    // Group by business_name prefix or custom attribute
    const groups = new Map<string, Column[]>();
    
    for (const column of columns) {
      const subject = this.extractBusinessSubject(column);
      if (!groups.has(subject)) {
        groups.set(subject, []);
      }
      groups.get(subject).push(column);
    }
    
    return groups;
  }
  
  private extractBusinessSubject(column: Column): string {
    // Extract from business_name: "customer_first_name" -> "customer"
    if (column.business_name) {
      const parts = column.business_name.split('_');
      if (parts.length > 1) {
        return parts[0];
      }
    }
    
    // Extract from column name patterns
    const nameParts = column.name.split('_');
    if (nameParts.length > 1) {
      return nameParts[0];
    }
    
    return 'general';
  }
  
  private groupByNamingPatterns(columns: Column[]): AttributeGroup[] {
    // Group columns with similar prefixes
    const prefixGroups = new Map<string, Column[]>();
    
    for (const column of columns) {
      const prefix = column.name.split('_')[0];
      if (!prefixGroups.has(prefix)) {
        prefixGroups.set(prefix, []);
      }
      prefixGroups.get(prefix).push(column);
    }
    
    return Array.from(prefixGroups.entries()).map(([prefix, cols]) => ({
      group_name: prefix,
      column_ids: cols.map(c => c.id),
      change_rate: this.estimateChangeRate(cols),
      reasoning: `Grouped by naming prefix: ${prefix}`
    }));
  }
  
  private estimateChangeRate(columns: Column[]): 'high' | 'medium' | 'low' {
    // Heuristic: date/timestamp columns = high change
    const hasDateColumns = columns.some(c => 
      c.data_type === 'DATE' || c.data_type === 'TIMESTAMP'
    );
    
    if (hasDateColumns) return 'high';
    
    // Status/flag columns = medium change
    const hasStatusColumns = columns.some(c =>
      c.name.includes('status') || c.name.includes('flag') || c.data_type === 'BOOLEAN'
    );
    
    if (hasStatusColumns) return 'medium';
    
    return 'low'; // Names, descriptions = low change
  }
}
```

---

### 6.4 Data Vault Generation Logic

#### 6.4.1 Hub Generation

```typescript
interface GeneratedHub {
  dataset: Dataset;
  columns: Column[];
  source_mappings: SourceMapping[];
}

interface SourceMapping {
  source_dataset_id: string;
  source_column_id: string;
  target_column_id: string;
  transformation?: string;
}

class HubGenerator {
  generateHub(
    sourceDataset: Dataset,
    businessKeys: DetectedKey,
    config: DataVaultConfiguration
  ): GeneratedHub {
    const hubName = this.generateHubName(sourceDataset, config);
    const hubSchema = config.hub_schema || 'rdv';
    
    // Create hub dataset
    const hub: Dataset = {
      id: generateUUID(),
      account_id: sourceDataset.account_id,
      fqn: `${hubSchema}.${hubName}`,
      name: hubName,
      medallion_layer: 'Gold',
      entity_type: 'DataVault',
      entity_subtype: 'Hub',
      materialization_type: 'Table',
      description: `Hub for ${sourceDataset.name}`,
      metadata: {
        source_dataset: sourceDataset.name,
        generated_at: new Date().toISOString()
      },
      visibility: 'public',
      has_uncommitted_changes: true,
      sync_status: 'pending'
    };
    
    // Generate columns
    const columns: Column[] = [];
    const mappings: SourceMapping[] = [];
    
    // 1. Surrogate key
    const surrogateKey = this.generateSurrogateKey(hubName, config);
    columns.push(surrogateKey);
    
    // 2. Integration key (business key)
    const integrationKey = this.generateIntegrationKey(
      hubName,
      businessKeys,
      sourceDataset,
      config
    );
    columns.push(integrationKey);
    
    // Add mapping for business key
    for (const keyColId of businessKeys.column_ids) {
      mappings.push({
        source_dataset_id: sourceDataset.id,
        source_column_id: keyColId,
        target_column_id: integrationKey.id,
        transformation: config.use_hash_keys ? 
          `HASH(${this.getColumnNames(businessKeys.column_ids).join(', ')})` : 
          undefined
      });
    }
    
    // 3. If accelerate_hub_keys = true, include business key columns
    if (config.accelerate_hub_keys) {
      const sourceColumns = getColumns(sourceDataset.id);
      for (const keyColId of businessKeys.column_ids) {
        const sourceCol = sourceColumns.find(c => c.id === keyColId);
        const hubKeyCol = this.cloneColumnForHub(sourceCol, hub.id);
        columns.push(hubKeyCol);
        
        mappings.push({
          source_dataset_id: sourceDataset.id,
          source_column_id: sourceCol.id,
          target_column_id: hubKeyCol.id
        });
      }
    }
    
    // 4. System columns
    if (config.include_load_date) {
      columns.push(this.createLoadDateColumn(hub.id));
    }
    
    if (config.include_record_source) {
      columns.push(this.createRecordSourceColumn(hub.id));
      mappings.push({
        source_dataset_id: sourceDataset.id,
        source_column_id: null, // Constant
        target_column_id: columns[columns.length - 1].id,
        transformation: `'${sourceDataset.metadata?.source_system || 'UNKNOWN'}'`
      });
    }
    
    return {
      dataset: hub,
      columns,
      source_mappings: mappings
    };
  }
  
  private generateHubName(dataset: Dataset, config: DataVaultConfiguration): string {
    const entityName = this.extractEntityName(dataset.name);
    return this.applyNamingPattern(
      entityName,
      config.hub_naming_pattern,
      { entity_name: entityName }
    );
  }
  
  private extractEntityName(datasetName: string): string {
    // Remove common prefixes: stg_, src_, raw_
    return datasetName
      .replace(/^(stg_|src_|raw_)/i, '')
      .replace(/_/g, '_'); // Keep underscores
  }
  
  private applyNamingPattern(
    baseName: string,
    pattern: string,
    variables: Record<string, string>
  ): string {
    let result = pattern;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  }
  
  private generateSurrogateKey(
    hubName: string,
    config: DataVaultConfiguration
  ): Column {
    const keyName = config.use_sequence_keys ? 
      `${hubName}_seq_key` : 
      `${hubName}_hash_key`;
    
    const dataType = config.use_sequence_keys ? 
      'BIGINT' : 
      (config.hash_key_datatype === 'BINARY' ? 'BINARY' : 'STRING');
    
    const length = config.use_sequence_keys ? 
      null : 
      this.getHashLength(config.hash_algorithm, config.hash_key_datatype === 'BINARY');
    
    return {
      id: generateUUID(),
      dataset_id: null, // Set later
      fqn: `${hubName}.${keyName}`,
      name: keyName,
      data_type: dataType,
      length: length,
      is_primary_key: true,
      is_nullable: false,
      description: 'Surrogate key for the hub',
      position: 1
    };
  }
  
  private generateIntegrationKey(
    hubName: string,
    businessKeys: DetectedKey,
    sourceDataset: Dataset,
    config: DataVaultConfiguration
  ): Column {
    const keyName = `${hubName}_bk`;
    
    return {
      id: generateUUID(),
      dataset_id: null,
      fqn: `${hubName}.${keyName}`,
      name: keyName,
      data_type: 'STRING',
      length: 500, // Adjust based on business key length
      is_primary_key: false,
      is_nullable: false,
      description: 'Business key from source system',
      transformation_logic: config.use_hash_keys ? 
        `HASH(${this.getColumnNames(businessKeys.column_ids).join(' || ')})` : 
        this.getColumnNames(businessKeys.column_ids).join(' || '),
      position: 2
    };
  }
  
  private createLoadDateColumn(dataset_id: string): Column {
    return {
      id: generateUUID(),
      dataset_id,
      fqn: null,
      name: 'load_date',
      data_type: 'TIMESTAMP',
      is_nullable: false,
      default_value: 'CURRENT_TIMESTAMP()',
      description: 'Timestamp when the record was loaded',
      position: 90
    };
  }
  
  private createRecordSourceColumn(dataset_id: string): Column {
    return {
      id: generateUUID(),
      dataset_id,
      fqn: null,
      name: 'record_source',
      data_type: 'STRING',
      length: 100,
      is_nullable: false,
      description: 'Source system identifier',
      position: 91
    };
  }
  
  private getHashLength(algorithm: string, isBinary: boolean): number {
    const lengths = {
      'MD5': isBinary ? 16 : 32,
      'SHA-1': isBinary ? 20 : 40,
      'SHA-256': isBinary ? 32 : 64,
      'SHA-512': isBinary ? 64 : 128
    };
    return lengths[algorithm] || 64;
  }
  
  private getColumnNames(columnIds: string[]): string[] {
    return columnIds.map(id => {
      const col = getColumn(id);
      return col.name;
    });
  }
  
  private cloneColumnForHub(sourceCol: Column, hubDatasetId: string): Column {
    return {
      ...sourceCol,
      id: generateUUID(),
      dataset_id: hubDatasetId,
      is_primary_key: false,
      is_foreign_key: false,
      reference_column_id: null
    };
  }
}
```

#### 6.4.2 Satellite Generation

```typescript
class SatelliteGenerator {
  generateSatellites(
    sourceDataset: Dataset,
    hub: GeneratedHub,
    attributeGroups: AttributeGroup[],
    config: DataVaultConfiguration
  ): GeneratedHub[] {
    const satellites: GeneratedHub[] = [];
    
    for (const group of attributeGroups) {
      const satellite = this.generateSatellite(
        sourceDataset,
        hub,
        group,
        config
      );
      satellites.push(satellite);
    }
    
    return satellites;
  }
  
  private generateSatellite(
    sourceDataset: Dataset,
    hub: GeneratedHub,
    group: AttributeGroup,
    config: DataVaultConfiguration
  ): GeneratedHub {
    const satName = this.generateSatelliteName(
      hub.dataset.name,
      group.group_name,
      config
    );
    const satSchema = config.satellite_schema || 'rdv';
    
    // Create satellite dataset
    const satellite: Dataset = {
      id: generateUUID(),
      account_id: sourceDataset.account_id,
      fqn: `${satSchema}.${satName}`,
      name: satName,
      medallion_layer: 'Gold',
      entity_type: 'DataVault',
      entity_subtype: 'Satellite',
      materialization_type: 'Table',
      description: `Satellite for ${hub.dataset.name} - ${group.group_name} attributes`,
      metadata: {
        parent_hub: hub.dataset.name,
        attribute_group: group.group_name,
        change_rate: group.change_rate
      },
      visibility: 'public',
      has_uncommitted_changes: true
    };
    
    const columns: Column[] = [];
    const mappings: SourceMapping[] = [];
    
    // 1. Reference to hub (surrogate key)
    const hubRef = this.createHubReference(
      satellite.id,
      hub.dataset.name,
      hub.columns.find(c => c.is_primary_key)
    );
    columns.push(hubRef);
    
    // 2. Load date (part of PK for SCD Type 2)
    const loadDate = this.createLoadDateColumn(satellite.id);
    loadDate.is_primary_key = true;
    loadDate.position = 2;
    columns.push(loadDate);
    
    // 3. Hash diff (for change detection)
    if (config.include_hash_diff) {
      const hashDiff = this.createHashDiffColumn(satellite.id, group.column_ids);
      columns.push(hashDiff);
    }
    
    // 4. Descriptive attributes
    const sourceColumns = getColumns(sourceDataset.id);
    for (const colId of group.column_ids) {
      const sourceCol = sourceColumns.find(c => c.id === colId);
      const satCol = this.cloneColumnForSatellite(sourceCol, satellite.id);
      columns.push(satCol);
      
      mappings.push({
        source_dataset_id: sourceDataset.id,
        source_column_id: sourceCol.id,
        target_column_id: satCol.id
      });
    }
    
    // 5. System columns
    if (config.include_record_source) {
      columns.push(this.createRecordSourceColumn(satellite.id));
    }
    
    // Optional: End date for SCD Type 2
    const endDate = this.createEndDateColumn(satellite.id);
    columns.push(endDate);
    
    const isCurrentFlag = this.createIsCurrentFlag(satellite.id);
    columns.push(isCurrentFlag);
    
    return {
      dataset: satellite,
      columns,
      source_mappings: mappings
    };
  }
  
  private generateSatelliteName(
    hubName: string,
    groupName: string,
    config: DataVaultConfiguration
  ): string {
    // Remove HUB_ prefix from hub name
    const entityName = hubName.replace(/^HUB_/i, '');
    
    return this.applyNamingPattern(
      `${entityName}_${groupName}`,
      config.satellite_naming_pattern,
      {
        hub: entityName,
        descriptor: groupName
      }
    );
  }
  
  private createHubReference(
    satelliteId: string,
    hubName: string,
    hubPK: Column
  ): Column {
    return {
      id: generateUUID(),
      dataset_id: satelliteId,
      name: hubPK.name,
      data_type: hubPK.data_type,
      length: hubPK.length,
      is_primary_key: true,
      is_nullable: false,
      reference_column_id: hubPK.id,
      reference_type: 'FK',
      description: `Foreign key to ${hubName}`,
      position: 1
    };
  }
  
  private createHashDiffColumn(satelliteId: string, columnIds: string[]): Column {
    const columnNames = this.getColumnNames(columnIds);
    
    return {
      id: generateUUID(),
      dataset_id: satelliteId,
      name: 'hash_diff',
      data_type: 'STRING',
      length: 64, // SHA-256
      is_nullable: false,
      transformation_logic: `SHA2(CONCAT(${columnNames.join(', ')}), 256)`,
      description: 'Hash of all satellite attributes for change detection',
      position: 3
    };
  }
  
  private createEndDateColumn(dataset_id: string): Column {
    return {
      id: generateUUID(),
      dataset_id,
      name: 'load_end_date',
      data_type: 'TIMESTAMP',
      is_nullable: true,
      description: 'End date for SCD Type 2 (NULL for current record)',
      position: 95
    };
  }
  
  private createIsCurrentFlag(dataset_id: string): Column {
    return {
      id: generateUUID(),
      dataset_id,
      name: 'is_current',
      data_type: 'BOOLEAN',
      is_nullable: false,
      default_value: 'TRUE',
      description: 'Flag indicating current version',
      position: 96
    };
  }
  
  private cloneColumnForSatellite(sourceCol: Column, satDatasetId: string): Column {
    return {
      ...sourceCol,
      id: generateUUID(),
      dataset_id: satDatasetId,
      is_primary_key: false,
      is_foreign_key: false,
      reference_column_id: null,
      position: sourceCol.position + 10 // Offset for system columns
    };
  }
}
```

#### 6.4.3 Link Generation

```typescript
class LinkGenerator {
  generateLinks(
    sourceDatasets: Dataset[],
    hubs: GeneratedHub[],
    relationships: RelationshipAnalysis[],
    config: DataVaultConfiguration
  ): GeneratedHub[] {
    const links: GeneratedHub[] = [];
    
    // Identify many-to-many relationships
    for (const rel of relationships) {
      if (rel.relationships.some(r => r.relationship_type === 'many_to_many')) {
        const link = this.generateLink(rel, hubs, config);
        links.push(link);
      }
    }
    
    // Identify relationships with descriptive attributes (need link satellite)
    for (const rel of relationships) {
      const hasDescriptiveAttrs = this.hasRelationshipAttributes(rel);
      if (hasDescriptiveAttrs) {
        const link = this.generateLink(rel, hubs, config);
        links.push(link);
      }
    }
    
    return links;
  }
  
  private generateLink(
    relationship: RelationshipAnalysis,
    hubs: GeneratedHub[],
    config: DataVaultConfiguration
  ): GeneratedHub {
    const participatingHubs = this.getParticipatingHubs(relationship, hubs);
    const linkName = this.generateLinkName(participatingHubs, config);
    const linkSchema = config.link_schema || 'rdv';
    
    const link: Dataset = {
      id: generateUUID(),
      account_id: hubs[0].dataset.account_id,
      fqn: `${linkSchema}.${linkName}`,
      name: linkName,
      medallion_layer: 'Gold',
      entity_type: 'DataVault',
      entity_subtype: 'Link',
      materialization_type: 'Table',
      description: `Link between ${participatingHubs.map(h => h.dataset.name).join(', ')}`,
      metadata: {
        participating_hubs: participatingHubs.map(h => h.dataset.name)
      },
      visibility: 'public',
      has_uncommitted_changes: true
    };
    
    const columns: Column[] = [];
    const mappings: SourceMapping[] = [];
    
    // 1. Link surrogate key
    const linkSK = this.generateLinkSurrogateKey(linkName, config);
    columns.push(linkSK);
    
    // 2. References to participating hubs
    let position = 2;
    for (const hub of participatingHubs) {
      const hubPK = hub.columns.find(c => c.is_primary_key);
      const hubRef: Column = {
        id: generateUUID(),
        dataset_id: link.id,
        name: hubPK.name,
        data_type: hubPK.data_type,
        length: hubPK.length,
        is_primary_key: false,
        is_nullable: false,
        reference_column_id: hubPK.id,
        reference_type: 'FK',
        description: `Foreign key to ${hub.dataset.name}`,
        position: position++
      };
      columns.push(hubRef);
    }
    
    // 3. If accelerate_link_keys = true, include relationship business keys
    if (config.accelerate_link_keys) {
      // Add business key columns from source
      const relCols = this.getRelationshipColumns(relationship);
      for (const col of relCols) {
        const linkCol = this.cloneColumnForLink(col, link.id);
        columns.push(linkCol);
      }
    }
    
    // 4. System columns
    if (config.include_load_date) {
      columns.push(this.createLoadDateColumn(link.id));
    }
    
    if (config.include_record_source) {
      columns.push(this.createRecordSourceColumn(link.id));
    }
    
    return {
      dataset: link,
      columns,
      source_mappings: mappings
    };
  }
  
  private generateLinkName(
    hubs: GeneratedHub[],
    config: DataVaultConfiguration
  ): string {
    const entityNames = hubs.map(h => 
      h.dataset.name.replace(/^HUB_/i, '')
    ).sort(); // Sort for consistent naming
    
    return this.applyNamingPattern(
      entityNames.join('_'),
      config.link_naming_pattern,
      {
        entity1: entityNames[0],
        entity2: entityNames[1] || entityNames[0]
      }
    );
  }
  
  private generateLinkSurrogateKey(
    linkName: string,
    config: DataVaultConfiguration
  ): Column {
    const keyName = config.use_hash_keys ? 
      `${linkName}_hash_key` : 
      `${linkName}_seq_key`;
    
    return {
      id: generateUUID(),
      dataset_id: null,
      name: keyName,
      data_type: config.use_hash_keys ? 'STRING' : 'BIGINT',
      length: config.use_hash_keys ? 64 : null,
      is_primary_key: true,
      is_nullable: false,
      transformation_logic: config.use_hash_keys ? 
        'HASH(hub_ref_1 || hub_ref_2)' : 
        undefined,
      position: 1
    };
  }
  
  private hasRelationshipAttributes(rel: RelationshipAnalysis): boolean {
    // Check if source dataset has columns beyond the relationship keys
    const sourceDataset = getDataset(rel.source_dataset_id);
    const columns = getColumns(sourceDataset.id);
    
    const relationshipColIds = rel.relationships.flatMap(r => r.source_column_ids);
    const descriptiveColumns = columns.filter(c => 
      !c.is_primary_key &&
      !relationshipColIds.includes(c.id) &&
      !this.isSystemColumn(c)
    );
    
    return descriptiveColumns.length > 0;
  }
  
  private getParticipatingHubs(
    relationship: RelationshipAnalysis,
    hubs: GeneratedHub[]
  ): GeneratedHub[] {
    const sourceDataset = getDataset(relationship.source_dataset_id);
    const targetDatasets = relationship.relationships.map(r => 
      getDataset(r.target_dataset_id)
    );
    
    // Find hubs for source and targets
    const participatingHubs: GeneratedHub[] = [];
    
    for (const hub of hubs) {
      const hubSourceDataset = hub.dataset.metadata?.source_dataset;
      if (hubSourceDataset === sourceDataset.name ||
          targetDatasets.some(td => td.name === hubSourceDataset)) {
        participatingHubs.push(hub);
      }
    }
    
    return participatingHubs;
  }
}
```

#### 6.4.4 Databricks Optimizations

```typescript
interface DatabricksOptimizations {
  liquid_clustering_columns: string[];
  partition_columns: string[];
  z_order_columns: string[];
  delta_properties: Record<string, string>;
}

class DatabricksOptimizer {
  generateOptimizations(
    dataset: Dataset,
    columns: Column[],
    config: DataVaultConfiguration
  ): DatabricksOptimizations {
    const optimizations: DatabricksOptimizations = {
      liquid_clustering_columns: [],
      partition_columns: [],
      z_order_columns: [],
      delta_properties: {}
    };
    
    // Liquid Clustering (for Databricks Runtime 13.3+)
    if (config.enable_liquid_clustering) {
      if (dataset.entity_subtype === 'Hub' || dataset.entity_subtype === 'Link') {
        // Cluster by surrogate key
        const pk = columns.find(c => c.is_primary_key);
        if (pk) {
          optimizations.liquid_clustering_columns.push(pk.name);
        }
      } else if (dataset.entity_subtype === 'Satellite' || dataset.entity_subtype === 'LinkSatellite') {
        // Cluster by hub reference
        const hubRef = columns.find(c => c.reference_type === 'FK');
        if (hubRef) {
          optimizations.liquid_clustering_columns.push(hubRef.name);
        }
      }
    }
    
    // Partitioning
    if (config.partition_by_load_date) {
      const loadDateCol = columns.find(c => c.name === 'load_date');
      if (loadDateCol) {
        optimizations.partition_columns.push(`DATE(${loadDateCol.name})`);
      }
    }
    
    // Delta properties
    if (config.enable_change_data_feed) {
      optimizations.delta_properties['delta.enableChangeDataFeed'] = 'true';
    }
    
    if (config.enable_deletion_vectors) {
      optimizations.delta_properties['delta.enableDeletionVectors'] = 'true';
    }
    
    // Performance tuning
    optimizations.delta_properties['delta.autoOptimize.optimizeWrite'] = 'true';
    optimizations.delta_properties['delta.autoOptimize.autoCompact'] = 'true';
    
    return optimizations;
  }
  
  generateDDL(
    dataset: Dataset,
    columns: Column[],
    optimizations: DatabricksOptimizations
  ): string {
    let ddl = `CREATE TABLE ${dataset.fqn} (\n`;
    
    // Columns
    ddl += columns.map(c => {
      const nullable = c.is_nullable ? '' : ' NOT NULL';
      const defaultVal = c.default_value ? ` DEFAULT ${c.default_value}` : '';
      const length = c.length ? `(${c.length})` : '';
      return `  ${c.name} ${c.data_type}${length}${nullable}${defaultVal}`;
    }).join(',\n');
    
    // Primary key
    const pkCols = columns.filter(c => c.is_primary_key).map(c => c.name);
    if (pkCols.length > 0) {
      ddl += `,\n  CONSTRAINT pk_${dataset.name} PRIMARY KEY(${pkCols.join(', ')})`;
    }
    
    ddl += '\n)\n';
    ddl += 'USING DELTA\n';
    
    // Liquid Clustering
    if (optimizations.liquid_clustering_columns.length > 0) {
      ddl += `CLUSTER BY (${optimizations.liquid_clustering_columns.join(', ')})\n`;
    }
    
    // Partitioning
    if (optimizations.partition_columns.length > 0) {
      ddl += `PARTITIONED BY (${optimizations.partition_columns.join(', ')})\n`;
    }
    
    // Properties
    if (Object.keys(optimizations.delta_properties).length > 0) {
      ddl += 'TBLPROPERTIES (\n';
      ddl += Object.entries(optimizations.delta_properties)
        .map(([k, v]) => `  '${k}' = '${v}'`)
        .join(',\n');
      ddl += '\n)';
    }
    
    return ddl + ';';
  }
}
```

---

### 6.5 UI Components

#### 6.5.1 Accelerator Dialog (Main Entry Point)

```typescript
// DataVaultAcceleratorDialog.tsx
interface AcceleratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
}

export function DataVaultAcceleratorDialog({
  isOpen,
  onClose,
  workspaceId,
  projectId
}: AcceleratorDialogProps) {
  const [step, setStep] = useState<'select' | 'config' | 'preview' | 'review'>('select');
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [config, setConfig] = useState<DataVaultConfiguration>(null);
  const [generatedModel, setGeneratedModel] = useState<GeneratedDataVaultModel>(null);
  
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        Data Vault Accelerator
        <StepIndicator currentStep={step} />
      </DialogTitle>
      
      <DialogContent>
        {step === 'select' && (
          <SourceSelectionStep
            workspaceId={workspaceId}
            selectedDatasets={selectedDatasets}
            onSelectionChange={setSelectedDatasets}
            onNext={() => setStep('config')}
          />
        )}
        
        {step === 'config' && (
          <ConfigurationStep
            projectId={projectId}
            config={config}
            onConfigChange={setConfig}
            onBack={() => setStep('select')}
            onNext={() => {
              // Generate model
              const model = generateDataVaultModel(selectedDatasets, config);
              setGeneratedModel(model);
              setStep('preview');
            }}
          />
        )}
        
        {step === 'preview' && (
          <PreviewStep
            model={generatedModel}
            onBack={() => setStep('config')}
            onNext={() => setStep('review')}
            onModelChange={setGeneratedModel}
          />
        )}
        
        {step === 'review' && (
          <ReviewStep
            model={generatedModel}
            onBack={() => setStep('preview')}
            onApply={async () => {
              await applyDataVaultModel(generatedModel, workspaceId);
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

#### 6.5.2 Source Selection Step

```typescript
// SourceSelectionStep.tsx
interface SourceSelectionStepProps {
  workspaceId: string;
  selectedDatasets: string[];
  onSelectionChange: (datasets: string[]) => void;
  onNext: () => void;
}

export function SourceSelectionStep({
  workspaceId,
  selectedDatasets,
  onSelectionChange,
  onNext
}: SourceSelectionStepProps) {
  const { data: datasets } = useWorkspaceDatasets(workspaceId);
  const [search, setSearch] = useState('');
  
  // Filter datasets: Bronze/Silver layers only
  const sourceDatasets = datasets?.filter(d => 
    ['Bronze', 'Silver'].includes(d.medallion_layer)
  ) || [];
  
  const filteredDatasets = sourceDatasets.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Source Datasets</h3>
        <p className="text-sm text-gray-600">
          Choose Bronze or Silver layer datasets to accelerate into Data Vault
        </p>
      </div>
      
      <TextField
        fullWidth
        placeholder="Search datasets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: <Search className="w-5 h-5 text-gray-400" />
        }}
      />
      
      <div className="border rounded-lg max-h-96 overflow-y-auto">
        {filteredDatasets.map(dataset => (
          <div
            key={dataset.id}
            className={`
              p-4 border-b cursor-pointer hover:bg-gray-50
              ${selectedDatasets.includes(dataset.id) ? 'bg-blue-50' : ''}
            `}
            onClick={() => {
              if (selectedDatasets.includes(dataset.id)) {
                onSelectionChange(selectedDatasets.filter(id => id !== dataset.id));
              } else {
                onSelectionChange([...selectedDatasets, dataset.id]);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedDatasets.includes(dataset.id)}
                onChange={() => {}}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{dataset.name}</span>
                  <Badge color={dataset.medallion_layer === 'Bronze' ? 'warning' : 'info'}>
                    {dataset.medallion_layer}
                  </Badge>
                </div>
                {dataset.description && (
                  <p className="text-sm text-gray-600 mt-1">{dataset.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{dataset.columns?.length || 0} columns</span>
                  <span>{dataset.entity_type}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between">
        <span className="text-sm text-gray-600">
          {selectedDatasets.length} dataset(s) selected
        </span>
        <Button
          variant="contained"
          disabled={selectedDatasets.length === 0}
          onClick={onNext}
        >
          Next: Configuration
        </Button>
      </div>
    </div>
  );
}
```

#### 6.5.3 Configuration Step

```typescript
// ConfigurationStep.tsx
export function ConfigurationStep({
  projectId,
  config,
  onConfigChange,
  onBack,
  onNext
}: ConfigurationStepProps) {
  const { data: project } = useProject(projectId);
  const defaultConfig = project?.configuration?.data_vault_preferences || DEFAULT_DV_CONFIG;
  
  const [localConfig, setLocalConfig] = useState<DataVaultConfiguration>(
    config || defaultConfig
  );
  
  useEffect(() => {
    onConfigChange(localConfig);
  }, [localConfig]);
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configuration</h3>
        <p className="text-sm text-gray-600">
          Configure Data Vault naming conventions and options
        </p>
      </div>
      
      {/* Naming Patterns */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ChevronDown />}>
          <Typography className="font-semibold">Naming Patterns</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Hub Pattern"
              value={localConfig.hub_naming_pattern}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                hub_naming_pattern: e.target.value
              })}
              helperText="Use {entity_name} as placeholder"
            />
            
            <TextField
              label="Satellite Pattern"
              value={localConfig.satellite_naming_pattern}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                satellite_naming_pattern: e.target.value
              })}
              helperText="Use {hub}, {descriptor}"
            />
            
            <TextField
              label="Link Pattern"
              value={localConfig.link_naming_pattern}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                link_naming_pattern: e.target.value
              })}
              helperText="Use {entity1}, {entity2}"
            />
            
            <TextField
              label="Link Satellite Pattern"
              value={localConfig.link_satellite_naming_pattern}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                link_satellite_naming_pattern: e.target.value
              })}
              helperText="Use {link}, {descriptor}"
            />
          </div>
        </AccordionDetails>
      </Accordion>
      
      {/* Hash/Key Strategy */}
      <Accordion>
        <AccordionSummary expandIcon={<ChevronDown />}>
          <Typography className="font-semibold">Key Strategy</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <div className="space-y-4">
            <FormControl component="fieldset">
              <FormLabel>Surrogate Key Type</FormLabel>
              <RadioGroup
                value={localConfig.use_hash_keys ? 'hash' : 'sequence'}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  use_hash_keys: e.target.value === 'hash',
                  use_sequence_keys: e.target.value === 'sequence'
                })}
              >
                <FormControlLabel
                  value="hash"
                  control={<Radio />}
                  label="Hash Keys (recommended for distributed systems)"
                />
                <FormControlLabel
                  value="sequence"
                  control={<Radio />}
                  label="Sequence Keys (auto-increment)"
                />
              </RadioGroup>
            </FormControl>
            
            {localConfig.use_hash_keys && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Hash Algorithm</InputLabel>
                  <Select
                    value={localConfig.hash_algorithm}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      hash_algorithm: e.target.value
                    })}
                  >
                    <MenuItem value="MD5">MD5 (fastest, 32 chars)</MenuItem>
                    <MenuItem value="SHA-1">SHA-1 (40 chars)</MenuItem>
                    <MenuItem value="SHA-256">SHA-256 (64 chars, recommended)</MenuItem>
                    <MenuItem value="SHA-512">SHA-512 (128 chars)</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Hash Storage Type</InputLabel>
                  <Select
                    value={localConfig.hash_key_datatype}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      hash_key_datatype: e.target.value
                    })}
                  >
                    <MenuItem value="STRING">String (human-readable)</MenuItem>
                    <MenuItem value="BINARY">Binary (smaller storage)</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </div>
        </AccordionDetails>
      </Accordion>
      
      {/* Structure Options */}
      <Accordion>
        <AccordionSummary expandIcon={<ChevronDown />}>
          <Typography className="font-semibold">Structure Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <div className="space-y-3">
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.include_load_date}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    include_load_date: e.target.checked
                  })}
                />
              }
              label="Include Load Date"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.include_record_source}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    include_record_source: e.target.checked
                  })}
                />
              }
              label="Include Record Source"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.include_hash_diff}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    include_hash_diff: e.target.checked
                  })}
                />
              }
              label="Include Hash Diff (for satellites)"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.accelerate_hub_keys}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    accelerate_hub_keys: e.target.checked
                  })}
                />
              }
              label="Include Business Keys in Hubs"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.accelerate_link_keys}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    accelerate_link_keys: e.target.checked
                  })}
                />
              }
              label="Include Relationship Keys in Links"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.accelerate_link_satellites}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    accelerate_link_satellites: e.target.checked
                  })}
                />
              }
              label="Auto-generate Link Satellites"
            />
          </div>
        </AccordionDetails>
      </Accordion>
      
      {/* Databricks Optimizations */}
      <Accordion>
        <AccordionSummary expandIcon={<ChevronDown />}>
          <Typography className="font-semibold">Databricks Optimizations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <div className="space-y-3">
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.enable_liquid_clustering}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    enable_liquid_clustering: e.target.checked
                  })}
                />
              }
              label="Enable Liquid Clustering (DBR 13.3+)"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.enable_change_data_feed}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    enable_change_data_feed: e.target.checked
                  })}
                />
              }
              label="Enable Change Data Feed"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.enable_deletion_vectors}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    enable_deletion_vectors: e.target.checked
                  })}
                />
              }
              label="Enable Deletion Vectors"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.partition_by_load_date}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    partition_by_load_date: e.target.checked
                  })}
                />
              }
              label="Partition by Load Date"
            />
          </div>
        </AccordionDetails>
      </Accordion>
      
      {/* Schema Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ChevronDown />}>
          <Typography className="font-semibold">Schema Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Hub Schema"
              value={localConfig.hub_schema}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                hub_schema: e.target.value
              })}
            />
            
            <TextField
              label="Link Schema"
              value={localConfig.link_schema}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                link_schema: e.target.value
              })}
            />
            
            <TextField
              label="Satellite Schema"
              value={localConfig.satellite_schema}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                satellite_schema: e.target.value
              })}
            />
            
            <TextField
              label="Link Satellite Schema"
              value={localConfig.link_satellite_schema}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                link_satellite_schema: e.target.value
              })}
            />
          </div>
        </AccordionDetails>
      </Accordion>
      
      <div className="flex justify-between">
        <Button onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" onClick={onNext}>
          Next: Generate Preview
        </Button>
      </div>
    </div>
  );
}
```

#### 6.5.4 Preview Step (React Flow Diagram)

```typescript
// PreviewStep.tsx
export function PreviewStep({
  model,
  onBack,
  onNext,
  onModelChange
}: PreviewStepProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  // Convert generated model to React Flow format
  useEffect(() => {
    const { nodes: flowNodes, edges: flowEdges } = convertToReactFlow(model);
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [model]);
  
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };
  
  const handleNodeDelete = (nodeId: string) => {
    // Remove node from model
    const updatedModel = {
      ...model,
      hubs: model.hubs.filter(h => h.dataset.id !== nodeId),
      satellites: model.satellites.filter(s => s.dataset.id !== nodeId),
      links: model.links.filter(l => l.dataset.id !== nodeId)
    };
    onModelChange(updatedModel);
  };
  
  return (
    <div className="h-[600px] flex gap-4">
      {/* Diagram View */}
      <div className="flex-1 border rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          nodeTypes={{
            hub: HubNode,
            satellite: SatelliteNode,
            link: LinkNode
          }}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      
      {/* Side Panel for Node Details */}
      {selectedNode && (
        <div className="w-96 border rounded-lg p-4 overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-semibold text-lg">{selectedNode.data.name}</h4>
              <Badge color="primary">{selectedNode.type}</Badge>
            </div>
            <IconButton size="small" onClick={() => setSelectedNode(null)}>
              <X className="w-4 h-4" />
            </IconButton>
          </div>
          
          <NodeDetailPanel
            node={selectedNode}
            model={model}
            onUpdate={(updatedNode) => {
              // Update model
              const updatedModel = updateNodeInModel(model, updatedNode);
              onModelChange(updatedModel);
            }}
            onDelete={() => {
              handleNodeDelete(selectedNode.id);
              setSelectedNode(null);
            }}
          />
        </div>
      )}
      
      {/* Stats and Actions */}
      <div className="absolute bottom-4 left-4 bg-white border rounded-lg p-4 shadow-lg">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-8">
            <span className="text-gray-600">Hubs:</span>
            <span className="font-semibold">{model.hubs.length}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-gray-600">Satellites:</span>
            <span className="font-semibold">{model.satellites.length}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-gray-600">Links:</span>
            <span className="font-semibold">{model.links.length}</span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" onClick={onNext}>
          Next: Review & Apply
        </Button>
      </div>
    </div>
  );
}

// Custom Node Components
function HubNode({ data }: { data: any }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-blue-900">{data.name}</span>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>Type: Hub</div>
        <div>{data.columnCount} columns</div>
        {data.businessKeys && (
          <div className="text-blue-600">BK: {data.businessKeys.join(', ')}</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function SatelliteNode({ data }: { data: any }) {
  return (
    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-green-900">{data.name}</span>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>Type: Satellite</div>
        <div>{data.columnCount} attributes</div>
        {data.changeRate && (
          <div className={`
            ${data.changeRate === 'high' ? 'text-red-600' : ''}
            ${data.changeRate === 'medium' ? 'text-yellow-600' : ''}
            ${data.changeRate === 'low' ? 'text-green-600' : ''}
          `}>
            Change Rate: {data.changeRate}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
    </div>
  );
}

function LinkNode({ data }: { data: any }) {
  return (
    <div className="bg-purple-50 border-2 border-purple-500 rounded-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-5 h-5 text-purple-600" />
        <span className="font-semibold text-purple-900">{data.name}</span>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>Type: Link</div>
        <div>{data.hubCount} hubs</div>
        {data.hasLinkSatellite && (
          <div className="text-purple-600">Has Link Satellite</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// Node Detail Panel
function NodeDetailPanel({
  node,
  model,
  onUpdate,
  onDelete
}: NodeDetailPanelProps) {
  const nodeData = getNodeFromModel(model, node.id);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(nodeData?.dataset.name || '');
  
  if (!nodeData) return null;
  
  return (
    <div className="space-y-4">
      {/* Name Editor */}
      <div>
        <label className="text-sm font-medium">Name</label>
        {editMode ? (
          <div className="flex gap-2 mt-1">
            <TextField
              size="small"
              fullWidth
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
            />
            <IconButton
              size="small"
              color="primary"
              onClick={() => {
                onUpdate({ ...nodeData, dataset: { ...nodeData.dataset, name: editedName } });
                setEditMode(false);
              }}
            >
              <Check className="w-4 h-4" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                setEditedName(nodeData.dataset.name);
                setEditMode(false);
              }}
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        ) : (
          <div className="flex justify-between items-center mt-1">
            <span className="font-mono text-sm">{nodeData.dataset.name}</span>
            <IconButton size="small" onClick={() => setEditMode(true)}>
              <Edit className="w-4 h-4" />
            </IconButton>
          </div>
        )}
      </div>
      
      {/* Schema */}
      <div>
        <label className="text-sm font-medium">Schema</label>
        <div className="mt-1 text-sm text-gray-600">
          {nodeData.dataset.fqn.split('.').slice(0, -1).join('.')}
        </div>
      </div>
      
      {/* Description */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <TextField
          size="small"
          fullWidth
          multiline
          rows={2}
          value={nodeData.dataset.description || ''}
          onChange={(e) => onUpdate({
            ...nodeData,
            dataset: { ...nodeData.dataset, description: e.target.value }
          })}
          placeholder="Add description..."
          className="mt-1"
        />
      </div>
      
      {/* Columns */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Columns</label>
          <span className="text-xs text-gray-500">
            {nodeData.columns.length} total
          </span>
        </div>
        <div className="border rounded max-h-64 overflow-y-auto">
          {nodeData.columns.map((col, idx) => (
            <div
              key={col.id}
              className={`
                p-2 text-sm border-b last:border-b-0
                ${col.is_primary_key ? 'bg-yellow-50' : ''}
                ${col.reference_column_id ? 'bg-blue-50' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                {col.is_primary_key && <Key className="w-3 h-3 text-yellow-600" />}
                {col.reference_column_id && <Link className="w-3 h-3 text-blue-600" />}
                <span className="font-mono flex-1">{col.name}</span>
                <span className="text-xs text-gray-500">{col.data_type}</span>
              </div>
              {col.description && (
                <div className="text-xs text-gray-600 mt-1 ml-5">
                  {col.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Source Mappings */}
      {nodeData.source_mappings.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Source Mappings</label>
          <div className="border rounded max-h-48 overflow-y-auto">
            {nodeData.source_mappings.map((mapping, idx) => (
              <div key={idx} className="p-2 text-xs border-b last:border-b-0">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">
                    {getColumnName(mapping.source_column_id)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span className="font-mono">
                    {getColumnName(mapping.target_column_id)}
                  </span>
                </div>
                {mapping.transformation && (
                  <div className="ml-5 mt-1 text-gray-500 font-mono">
                    {mapping.transformation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Databricks Optimizations */}
      {nodeData.optimizations && (
        <div>
          <label className="text-sm font-medium mb-2 block">Databricks Optimizations</label>
          <div className="space-y-2 text-xs">
            {nodeData.optimizations.liquid_clustering_columns.length > 0 && (
              <div className="flex items-start gap-2">
                <Zap className="w-3 h-3 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium">Liquid Clustering</div>
                  <div className="text-gray-600">
                    {nodeData.optimizations.liquid_clustering_columns.join(', ')}
                  </div>
                </div>
              </div>
            )}
            
            {nodeData.optimizations.partition_columns.length > 0 && (
              <div className="flex items-start gap-2">
                <Grid className="w-3 h-3 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium">Partitioning</div>
                  <div className="text-gray-600">
                    {nodeData.optimizations.partition_columns.join(', ')}
                  </div>
                </div>
              </div>
            )}
            
            {Object.keys(nodeData.optimizations.delta_properties).length > 0 && (
              <div className="flex items-start gap-2">
                <Settings className="w-3 h-3 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium">Delta Properties</div>
                  {Object.entries(nodeData.optimizations.delta_properties).map(([key, value]) => (
                    <div key={key} className="text-gray-600">
                      {key}: {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="pt-4 border-t flex gap-2">
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<Trash2 className="w-4 h-4" />}
          onClick={onDelete}
          fullWidth
        >
          Delete Node
        </Button>
      </div>
    </div>
  );
}
```

#### 6.5.5 Review Step

```typescript
// ReviewStep.tsx
export function ReviewStep({
  model,
  onBack,
  onApply
}: ReviewStepProps) {
  const [applying, setApplying] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'ddl' | 'conflicts'>('summary');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  
  // Check for conflicts on mount
  useEffect(() => {
    checkForConflicts(model).then(setConflicts);
  }, [model]);
  
  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply();
      // Success handled by parent
    } catch (error) {
      console.error('Failed to apply model:', error);
      // Show error notification
    } finally {
      setApplying(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Review & Apply</h3>
        <p className="text-sm text-gray-600">
          Review the generated Data Vault model before applying to your workspace
        </p>
      </div>
      
      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
        <Tab label="Summary" value="summary" />
        <Tab label="DDL Preview" value="ddl" />
        <Tab 
          label={
            <Badge badgeContent={conflicts.length} color="error">
              Conflicts
            </Badge>
          } 
          value="conflicts" 
        />
      </Tabs>
      
      {/* Summary Tab */}
      {selectedTab === 'summary' && (
        <div className="space-y-4">
          <Card>
            <CardContent>
              <h4 className="font-semibold mb-4">Model Statistics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {model.hubs.length}
                  </div>
                  <div className="text-sm text-gray-600">Hubs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {model.satellites.length}
                  </div>
                  <div className="text-sm text-gray-600">Satellites</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {model.links.length}
                  </div>
                  <div className="text-sm text-gray-600">Links</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Hubs List */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ChevronDown />}>
              <Typography className="font-semibold">
                Hubs ({model.hubs.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div className="space-y-2">
                {model.hubs.map(hub => (
                  <div key={hub.dataset.id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-medium">{hub.dataset.name}</div>
                        <div className="text-sm text-gray-600">{hub.dataset.fqn}</div>
                      </div>
                      <Badge color="primary">{hub.columns.length} cols</Badge>
                    </div>
                    {hub.dataset.metadata?.source_dataset && (
                      <div className="text-xs text-gray-500 mt-2">
                        Source: {hub.dataset.metadata.source_dataset}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionDetails>
          </Accordion>
          
          {/* Satellites List */}
          <Accordion>
            <AccordionSummary expandIcon={<ChevronDown />}>
              <Typography className="font-semibold">
                Satellites ({model.satellites.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div className="space-y-2">
                {model.satellites.map(sat => (
                  <div key={sat.dataset.id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-medium">{sat.dataset.name}</div>
                        <div className="text-sm text-gray-600">{sat.dataset.fqn}</div>
                      </div>
                      <div className="flex gap-2">
                        {sat.dataset.metadata?.change_rate && (
                          <Badge 
                            color={
                              sat.dataset.metadata.change_rate === 'high' ? 'error' :
                              sat.dataset.metadata.change_rate === 'medium' ? 'warning' :
                              'success'
                            }
                          >
                            {sat.dataset.metadata.change_rate}
                          </Badge>
                        )}
                        <Badge color="success">{sat.columns.length} cols</Badge>
                      </div>
                    </div>
                    {sat.dataset.metadata?.parent_hub && (
                      <div className="text-xs text-gray-500 mt-2">
                        Parent Hub: {sat.dataset.metadata.parent_hub}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionDetails>
          </Accordion>
          
          {/* Links List */}
          {model.links.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ChevronDown />}>
                <Typography className="font-semibold">
                  Links ({model.links.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <div className="space-y-2">
                  {model.links.map(link => (
                    <div key={link.dataset.id} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono font-medium">{link.dataset.name}</div>
                          <div className="text-sm text-gray-600">{link.dataset.fqn}</div>
                        </div>
                        <Badge color="info">{link.columns.length} cols</Badge>
                      </div>
                      {link.dataset.metadata?.participating_hubs && (
                        <div className="text-xs text-gray-500 mt-2">
                          Hubs: {link.dataset.metadata.participating_hubs.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionDetails>
            </Accordion>
          )}
        </div>
      )}
      
      {/* DDL Preview Tab */}
      {selectedTab === 'ddl' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Preview of DDL statements that will be generated
            </span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Copy className="w-4 h-4" />}
              onClick={() => {
                const ddl = generateAllDDL(model);
                navigator.clipboard.writeText(ddl);
              }}
            >
              Copy All DDL
            </Button>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Accordion>
              <AccordionSummary expandIcon={<ChevronDown />}>
                <Typography className="font-mono text-sm">Hubs DDL</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                  {model.hubs.map(hub => generateDDL(hub)).join('\n\n')}
                </pre>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ChevronDown />}>
                <Typography className="font-mono text-sm">Satellites DDL</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                  {model.satellites.map(sat => generateDDL(sat)).join('\n\n')}
                </pre>
              </AccordionDetails>
            </Accordion>
            
            {model.links.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ChevronDown />}>
                  <Typography className="font-mono text-sm">Links DDL</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                    {model.links.map(link => generateDDL(link)).join('\n\n')}
                  </pre>
                </AccordionDetails>
              </Accordion>
            )}
          </div>
        </div>
      )}
      
      {/* Conflicts Tab */}
      {selectedTab === 'conflicts' && (
        <div className="space-y-4">
          {conflicts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="font-semibold text-lg">No Conflicts Detected</h4>
              <p className="text-sm text-gray-600 mt-2">
                All generated objects are unique and won't conflict with existing datasets
              </p>
            </div>
          ) : (
            <>
              <Alert severity="warning">
                {conflicts.length} potential conflict(s) detected. Review and resolve before applying.
              </Alert>
              
              <div className="space-y-3">
                {conflicts.map((conflict, idx) => (
                  <Card key={idx}>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="font-semibold">{conflict.dataset_name}</h5>
                          <p className="text-sm text-gray-600 mt-1">
                            {conflict.conflict_type === 'name' && 
                              'A dataset with this name already exists'}
                            {conflict.conflict_type === 'fqn' && 
                              'A dataset with this fully qualified name already exists'}
                            {conflict.conflict_type === 'schema' && 
                              'Schema structure conflicts with existing dataset'}
                          </p>
                          
                          {conflict.suggestions && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">
                                Suggestions:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {conflict.suggestions.map((suggestion, sidx) => (
                                  <Button
                                    key={sidx}
                                    variant="outlined"
                                    size="small"
                                    onClick={() => applySuggestion(model, conflict, suggestion)}
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button onClick={onBack} disabled={applying}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={applying || conflicts.length > 0}
          startIcon={applying ? <CircularProgress size={16} /> : <Check />}
        >
          {applying ? 'Applying...' : 'Apply Data Vault Model'}
        </Button>
      </div>
    </div>
  );
}
```

---

### 6.6 Backend Service Functions

```typescript
// backend/src/services/data-vault-accelerator.service.ts

export async function generateDataVaultModel(
  sourceDatasetIds: string[],
  config: DataVaultConfiguration,
  workspaceId: string
): Promise<GeneratedDataVaultModel> {
  const sourceDatasets = await Promise.all(
    sourceDatasetIds.map(id => getDataset(id))
  );
  
  // 1. Analyze business keys
  const businessKeyAnalyses = await Promise.all(
    sourceDatasets.map(async dataset => {
      const columns = await getColumns(dataset.id);
      return new BusinessKeyDetector().detectBusinessKeys(dataset, columns);
    })
  );
  
  // 2. Analyze relationships
  const allDatasets = await getAllDatasets(workspaceId);
  const relationshipAnalyses = await Promise.all(
    sourceDatasets.map(dataset => 
      new RelationshipAnalyzer().analyzeRelationships(dataset, allDatasets)
    )
  );
  
  // 3. Group attributes for satellites
  const attributeGroups = await Promise.all(
    sourceDatasets.map(async (dataset, idx) => {
      const columns = await getColumns(dataset.id);
      return new AttributeGrouper().groupAttributes(dataset, columns);
    })
  );
  
  // 4. Generate Hubs
  const hubGenerator = new HubGenerator();
  const hubs: GeneratedHub[] = [];
  
  for (let i = 0; i < sourceDatasets.length; i++) {
    const dataset = sourceDatasets[i];
    const businessKeys = businessKeyAnalyses[i].detected_keys[0]; // Use highest confidence
    
    if (businessKeys) {
      const hub = hubGenerator.generateHub(dataset, businessKeys, config);
      
      // Add Databricks optimizations
      const optimizer = new DatabricksOptimizer();
      hub.optimizations = optimizer.generateOptimizations(hub.dataset, hub.columns, config);
      
      hubs.push(hub);
    }
  }
  
  // 5. Generate Satellites
  const satelliteGenerator = new SatelliteGenerator();
  const satellites: GeneratedHub[] = [];
  
  for (let i = 0; i < hubs.length; i++) {
    const hub = hubs[i];
    const sourceDataset = sourceDatasets[i];
    const groups = attributeGroups[i];
    
    const sats = satelliteGenerator.generateSatellites(
      sourceDataset,
      hub,
      groups,
      config
    );
    
    // Add optimizations
    const optimizer = new DatabricksOptimizer();
    for (const sat of sats) {
      sat.optimizations = optimizer.generateOptimizations(sat.dataset, sat.columns, config);
    }
    
    satellites.push(...sats);
  }
  
  // 6. Generate Links
  const linkGenerator = new LinkGenerator();
  const links = linkGenerator.generateLinks(
    sourceDatasets,
    hubs,
    relationshipAnalyses,
    config
  );
  
  // Add optimizations
  const optimizer = new DatabricksOptimizer();
  for (const link of links) {
    link.optimizations = optimizer.generateOptimizations(link.dataset, link.columns, config);
  }
  
  // 7. Generate Link Satellites (if enabled)
  const linkSatellites: GeneratedHub[] = [];
  if (config.accelerate_link_satellites) {
    for (const link of links) {
      // Check if link has descriptive attributes
      const hasAttrs = link.columns.some(c => 
        !c.is_primary_key && !c.reference_column_id
      );
      
      if (hasAttrs) {
        // Create link satellite
        const linkSat = satelliteGenerator.generateSatellite(
          link.dataset,
          link,
          {
            group_name: 'details',
            column_ids: link.columns
              .filter(c => !c.is_primary_key && !c.reference_column_id)
              .map(c => c.id),
            change_rate: 'medium',
            reasoning: 'Relationship attributes'
          },
          config
        );
        linkSat.optimizations = optimizer.generateOptimizations(
          linkSat.dataset,
          linkSat.columns,
          config
        );
        linkSatellites.push(linkSat);
      }
    }
  }
  
  return {
    hubs,
    satellites: [...satellites, ...linkSatellites],
    links,
    config,
    metadata: {
      generated_at: new Date().toISOString(),
      source_datasets: sourceDatasets.map(d => d.name),
      total_entities: hubs.length + satellites.length + links.length + linkSatellites.length
    }
  };
}

export async function applyDataVaultModel(
  model: GeneratedDataVaultModel,
  workspaceId: string
): Promise<void> {
  // Create all datasets in database
  const allEntities = [
    ...model.hubs,
    ...model.satellites,
    ...model.links
  ];
  
  for (const entity of allEntities) {
    // 1. Create dataset
    const dataset = await createDataset({
      ...entity.dataset,
      workspace_id: workspaceId,
      has_uncommitted_changes: true,
      sync_status: 'pending'
    });
    
    // 2. Create columns
    for (const column of entity.columns) {
      await createColumn({
        ...column,
        dataset_id: dataset.id
      });
    }
    
    // 3. Create lineage entries
    for (const mapping of entity.source_mappings) {
      await createLineage({
        workspace_id: workspaceId,
        downstream_dataset_id: dataset.id,
        downstream_column_id: mapping.target_column_id,
        upstream_dataset_id: mapping.source_dataset_id,
        upstream_column_id: mapping.source_column_id,
        mapping_type: mapping.transformation ? 'Transform' : 'Direct',
        transformation_expression: mapping.transformation
      });
    }
  }
  
  // Log the acceleration event
  await logAudit({
    workspace_id: workspaceId,
    change_type: 'created',
    entity_type: 'data_vault_model',
    entity_id: null,
    new_value: {
      entity_count: allEntities.length,
      source_datasets: model.metadata.source_datasets
    },
    changed_by: getCurrentUserId(),
    changed_at: new Date()
  });
}

async function checkForConflicts(
  model: GeneratedDataVaultModel
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const allDatasets = await getAllDatasets(model.hubs[0].dataset.workspace_id);
  
  const allEntities = [
    ...model.hubs,
    ...model.satellites,
    ...model.links
  ];
  
  for (const entity of allEntities) {
    // Check for name conflicts
    const nameConflict = allDatasets.find(d => 
      d.name.toLowerCase() === entity.dataset.name.toLowerCase()
    );
    
    if (nameConflict) {
      conflicts.push({
        dataset_id: entity.dataset.id,
        dataset_name: entity.dataset.name,
        conflict_type: 'name',
        existing_dataset_id: nameConflict.id,
        suggestions: [
          `${entity.dataset.name}_v2`,
          `${entity.dataset.name}_new`,
          `${entity.dataset.name}_${new Date().getFullYear()}`
        ]
      });
    }
    
    // Check for FQN conflicts
    const fqnConflict = allDatasets.find(d => 
      d.fqn.toLowerCase() === entity.dataset.fqn.toLowerCase()
    );
    
    if (fqnConflict) {
      conflicts.push({
        dataset_id: entity.dataset.id,
        dataset_name: entity.dataset.name,
        conflict_type: 'fqn',
        existing_dataset_id: fqnConflict.id,
        suggestions: [
          entity.dataset.fqn.replace(/\.([^.]+)$/, '_v2.$1'),
          entity.dataset.fqn.replace(/^([^.]+)\./, '$1_new.')
        ]
      });
    }
  }
  
  return conflicts;
}
