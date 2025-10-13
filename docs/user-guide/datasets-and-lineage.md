# Datasets and Lineage Guide

This comprehensive guide covers creating and managing datasets, columns, and data lineage in Bricker.

## Datasets

### What is a Dataset?

A **dataset** represents a data entity in your data platform - typically a table, view, or materialized view.

**Formerly Known As:** "Node" (in previous versions)

**Key Characteristics:**
- Has a fully qualified name (FQN)
- Contains columns (fields)
- Has classification metadata
- Tracks sync status with source control
- Can have lineage relationships

### Creating a Dataset

**Basic Creation:**
1. Open workspace
2. Right-click canvas → **"Add Dataset"**
3. Fill in required fields
4. Click **"Create"**

**Required Fields:**
- **Name**: Table name (e.g., "customers")
- **FQN**: Fully qualified name (e.g., "main.bronze.customers")

**Optional Fields:**
- **Medallion Layer**: Raw, Bronze, Silver, Gold
- **Entity Type**: Table, Staging, DataVault, DataMart
- **Entity Subtype**: Dimension, Fact, Hub, Link, Satellite, etc.
- **Materialization**: Table, View, Materialized View
- **Description**: Purpose and contents

### Dataset Properties

#### Fully Qualified Name (FQN)

Format: `catalog.schema.table_name`

**Examples:**
```
main.bronze.customers
main.silver.dim_customer
main.gold.fact_sales
analytics.staging.stg_orders
```

**Best Practices:**
- Use lowercase
- Use underscores for spaces
- Follow your platform's naming convention
- Keep consistent across datasets

#### Medallion Layer

Organizes datasets by data maturity:

**Raw:**
- Data as-is from source
- No transformations
- Exact copy of source
- Example: `raw.salesforce_accounts`

**Bronze:**
- Loaded data with minimal transformation
- Type casting, renaming
- Basic cleansing
- Example: `bronze.accounts`

**Silver:**
- Business-ready data
- Validated and enriched
- Conformed dimensions
- Example: `silver.dim_account`

**Gold:**
- Aggregated, business-focused
- Optimized for consumption
- Marts and reports
- Example: `gold.account_summary`

#### Entity Type

**Table:**
- Standard database table
- Most common type
- Persistent storage

**Staging:**
- Temporary landing area
- Intermediate processing
- Usually truncated/reloaded

**PersistentStaging:**
- Staging with history
- Change data capture
- Audit trail

**DataVault:**
- Data Vault 2.0 pattern
- Hubs, Links, Satellites
- Historized, auditable

**DataMart:**
- Business-specific subset
- Optimized for queries
- Aggregated data

#### Entity Subtype

**For Dimensional Models:**
- **Dimension**: Descriptive attributes
- **Fact**: Measurable events/transactions

**For Data Vault:**
- **Hub**: Business keys
- **Link**: Relationships
- **Satellite**: Descriptive attributes
- **PIT**: Point-in-time tables
- **Bridge**: Many-to-many relationships

#### Materialization Type

**Table:**
- Physical table
- Data stored on disk
- Fast queries

**View:**
- Virtual table
- Query executed on access
- Always up-to-date

**Materialized View:**
- Cached query results
- Refreshed periodically
- Balance of both

### Managing Datasets

#### Editing Datasets
1. Double-click dataset on canvas
2. Edit properties in dialog
3. Click **"Save"**

**Changes:**
- Marked as uncommitted
- Must commit to source control
- Synced across workspaces

#### Deleting Datasets
1. Select dataset
2. Press Delete key or right-click → **"Delete"**
3. Confirm deletion

**Effects:**
- Removed from canvas
- References removed
- Lineage deleted
- Marked as deleted (commit to finalize)

#### Cloning Datasets
1. Right-click dataset → **"Clone"**
2. Enter new name
3. Click **"Clone"**

**Use Cases:**
- Create similar datasets quickly
- Template for new datasets
- Experiment without affecting original

## Columns

### What is a Column?

A **column** represents a field within a dataset.

**Formerly Known As:** "NodeItem" (in previous versions)

**Key Characteristics:**
- Belongs to one dataset
- Has a data type
- Can be primary/foreign key
- Can reference another column
- Has position/ordering

### Creating Columns

**Steps:**
1. Open dataset editor
2. Go to **"Columns"** tab
3. Click **"Add Column"**
4. Fill in column details
5. Click **"Save"**

**Required Fields:**
- **Name**: Column name
- **Data Type**: SQL data type

**Optional Fields:**
- **Description**: Purpose of column
- **Business Name**: User-friendly name
- **Is Primary Key**: Primary key flag
- **Is Foreign Key**: Foreign key flag
- **Is Nullable**: Can be NULL
- **Default Value**: Default value
- **Position**: Display order

### Column Data Types

**Common Data Types:**

**Numeric:**
```
TINYINT, SMALLINT, INTEGER, BIGINT
DECIMAL(p,s), NUMERIC(p,s)
FLOAT, DOUBLE
```

**String:**
```
CHAR(n)
VARCHAR(n)
STRING (unbounded)
TEXT
```

**Date/Time:**
```
DATE
TIMESTAMP
TIMESTAMP_NTZ (no timezone)
TIME
```

**Boolean:**
```
BOOLEAN
```

**Binary:**
```
BINARY
VARBINARY(n)
```

**Complex:**
```
ARRAY<type>
STRUCT<field:type, ...>
MAP<key_type,value_type>
JSON
```

### Column Properties

#### Primary Key

**Purpose:** Unique identifier for rows

**Characteristics:**
- Must be unique
- Cannot be NULL
- One per table (composite keys: multiple columns)

**Example:**
```
customer_id - BIGINT - Primary Key
```

#### Foreign Key

**Purpose:** References another table's primary key

**Characteristics:**
- Creates relationship
- Must reference existing primary key
- Can be NULL (optional relationship)

**Example:**
```
customer_id in orders table
References: customers.customer_id
```

#### Nullable

**Nullable (default):**
- Can contain NULL values
- Optional data
- Example: middle_name, phone_number

**Not Nullable:**
- Must have a value
- Required data
- Example: customer_id, email

#### Default Value

**Purpose:** Value used when not specified

**Examples:**
```
created_at: CURRENT_TIMESTAMP
is_active: true
status: 'pending'
quantity: 0
```

### Column References

#### What is a Column Reference?

A **column reference** links one column to another, creating a relationship between datasets.

**Formerly:** Separate "Relationships" table
**Now:** Stored directly on column

**Reference Types:**

#### Foreign Key (FK)

**Purpose:** Standard database foreign key

**Use Case:** Enforce referential integrity

**Example:**
```
Source: orders.customer_id
Target: customers.customer_id
Type: FK
Description: Links order to customer
```

#### Business Key

**Purpose:** Natural/business key for matching

**Use Case:** Data integration, deduplication

**Example:**
```
Source: stg_customer.email
Target: dim_customer.email
Type: BusinessKey
Description: Match customers by email
```

#### Natural Key

**Purpose:** Natural identifier from source system

**Use Case:** Source-to-target mapping

**Example:**
```
Source: dim_customer.source_customer_id
Target: src_customers.id
Type: NaturalKey
Description: Original system ID
```

#### Creating Column References

**Steps:**
1. Open dataset editor
2. Go to **"Columns"** tab
3. Select source column
4. Click **"Add Reference"**
5. Choose:
   - Target dataset
   - Target column
   - Reference type
   - Description
6. Click **"Create"**

**Visual Representation:**
- References shown as edges on canvas
- Color-coded by type
- Hover to see details

#### Composite References

**Scenario:** Multiple columns form the key

**Example:**
```
orders table references:
- customer_id → customers.customer_id (FK)
- product_id → products.product_id (FK)

Together form composite key for fact_orders
```

**Implementation:**
- Create separate reference for each column
- Document in description
- Group logically

### Managing Columns

#### Reordering Columns
1. Go to **"Columns"** tab
2. Drag columns to reorder
3. Click **"Save"**

**Best Practices:**
- Primary key first
- Foreign keys next
- Business attributes
- Technical attributes last
- Timestamps at end

#### Bulk Operations

**Add Multiple Columns:**
1. Click **"Add Multiple"**
2. Enter columns (one per line):
   ```
   customer_id BIGINT NOT NULL
   email VARCHAR NOT NULL
   first_name VARCHAR
   last_name VARCHAR
   created_at TIMESTAMP
   ```
3. Click **"Add All"**

**Import from Schema:**
1. Click **"Import from Schema"**
2. Connect to database
3. Select table
4. Import column definitions

## Data Lineage

### What is Lineage?

**Lineage** tracks how data flows from source columns to target columns.

**Purpose:**
- Understand data flow
- Impact analysis
- Compliance (GDPR, etc.)
- Debugging data issues

**Key Concepts:**
- **Upstream**: Where data comes from (sources)
- **Downstream**: Where data goes to (targets)
- **Transformation**: How data changes

### Types of Lineage

#### Direct Mapping

**Definition:** Column copied as-is

**Example:**
```
Source: bronze.customers.email
Target: silver.customers.email
Mapping: Direct
Transformation: None
```

#### Transform Mapping

**Definition:** Column transformed

**Example:**
```
Source: bronze.customers.cust_id
Target: silver.customers.customer_id
Mapping: Transform
Transformation: CAST(cust_id AS BIGINT)
```

#### Derived Mapping

**Definition:** Column derived from multiple sources

**Example:**
```
Sources:
- bronze.customers.first_name
- bronze.customers.last_name
Target: silver.customers.full_name
Mapping: Derived
Transformation: CONCAT(first_name, ' ', last_name)
```

#### Calculated Mapping

**Definition:** Column calculated from business logic

**Example:**
```
Sources:
- fact_orders.order_amount
- fact_orders.quantity
Target: fact_orders.unit_price
Mapping: Calculated
Transformation: order_amount / quantity
```

### Creating Lineage

#### Basic Lineage

**Steps:**
1. Click **"Add Lineage"** tool
2. Select source dataset/column
3. Select target dataset/column
4. Choose mapping type
5. (Optional) Enter transformation SQL
6. Click **"Create"**

**Example:**
```
Source Column: bronze.raw_customers.cust_id
Target Column: silver.customers.customer_id
Mapping Type: Transform
Transformation: CAST(cust_id AS BIGINT)
Description: Convert customer ID to standard format
```

#### Dataset-Level Lineage

**Purpose:** Show dataset dependencies without column details

**Steps:**
1. Click **"Add Dataset Lineage"**
2. Select source dataset
3. Select target dataset
4. Add description
5. Click **"Create"**

**Use Case:**
- High-level overview
- Project documentation
- Architecture diagrams

### Viewing Lineage

#### Column Lineage View

**Steps:**
1. Select column
2. Click **"View Lineage"**
3. See:
   - Upstream lineages (sources)
   - Downstream lineages (targets)
   - Transformation logic

**Lineage Graph:**
```
raw_customers.cust_id
    ↓ (CAST AS BIGINT)
bronze.customers.customer_id
    ↓ (DIRECT)
silver.customers.customer_id
    ↓ (DIRECT)
gold.dim_customer.customer_id
```

#### Dataset Lineage View

**Steps:**
1. Select dataset
2. Click **"View Lineage"**
3. See:
   - Upstream datasets
   - Downstream datasets
   - Column counts

**Dataset Graph:**
```
raw_customers (5 columns)
    ↓
bronze.customers (8 columns)
    ↓
silver.customers (12 columns)
    ↓
gold.dim_customer (15 columns)
```

#### Workspace Lineage View

**Steps:**
1. Click **"View All Lineage"**
2. See complete data flow
3. Filter by:
   - Medallion layer
   - Entity type
   - Specific dataset

**Full Pipeline View:**
Shows entire data pipeline from sources to marts

### Impact Analysis

**Purpose:** Understand what's affected by changes

**Questions Answered:**
- If I change this column, what breaks?
- What datasets depend on this?
- What reports use this data?

**Steps:**
1. Select dataset or column
2. Click **"Impact Analysis"**
3. See:
   - Direct dependencies
   - Indirect dependencies
   - Affected reports/dashboards

**Example:**
```
Change: customers.email format
Direct Impact:
- silver.dim_customer
- gold.customer_summary

Indirect Impact:
- Reports using customer_summary
- Dashboards showing customer data
```

## Best Practices

### Dataset Naming

**Convention:**
```
{layer}_{entity_type}_{name}

Examples:
bronze_customers
silver_dim_customer
gold_fact_sales
```

**Prefixes:**
- `stg_`: Staging
- `dim_`: Dimension
- `fact_`: Fact table
- `hub_`: Data Vault hub
- `link_`: Data Vault link
- `sat_`: Data Vault satellite

### Column Naming

**Convention:**
- Use lowercase with underscores
- Be descriptive but concise
- Avoid abbreviations unless standard
- Use consistent patterns

**Examples:**
```
✅ Good:
customer_id
email_address
created_at
is_active

❌ Bad:
CustID
e_mail
CreateDate
active
```

### Lineage Documentation

**Best Practices:**
- Document all transformations
- Use clear SQL expressions
- Explain business logic
- Include data type conversions
- Note any assumptions

**Example:**
```
Transformation: CAST(cust_id AS BIGINT)
Description: Convert string customer ID to numeric format.
             Source system uses zero-padded strings (e.g., "00001234")
             Target uses integers (e.g., 1234)
Note: Leading zeros are lost in conversion
```

### Medallion Architecture

**Raw Layer:**
- Exact copy of source
- No transformations
- Keep source types

**Bronze Layer:**
- Type conversions
- Column renaming
- Basic cleansing

**Silver Layer:**
- Business rules applied
- Validated data
- Conformed dimensions

**Gold Layer:**
- Aggregations
- Business metrics
- Optimized for consumption

## Troubleshooting

### Cannot create dataset
**Cause:** At subscription limit
**Solution:** Delete unused datasets or upgrade

### Column reference not showing
**Cause:** Target column doesn't exist
**Solution:** Ensure target dataset and column exist first

### Lineage not appearing
**Cause:** Columns not properly referenced
**Solution:** Verify source and target columns are correct

### Transformation SQL error
**Cause:** Invalid SQL syntax
**Solution:** Test SQL in database first, then add to lineage

## Getting Help

- See [Getting Started](./getting-started.md)
- See [Workspaces and Projects](./workspaces-and-projects.md)
- See [Source Control Sync](./source-control-sync.md)
- Contact support at support@bricker.com

---

**Next:** [Source Control Sync Guide](./source-control-sync.md)
