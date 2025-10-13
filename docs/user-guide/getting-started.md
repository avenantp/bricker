# Getting Started with Bricker

This guide will walk you through the basics of using Bricker to create and manage data models.

## Prerequisites

- A Bricker account
- Basic understanding of data modeling concepts
- (Optional) A GitHub or GitLab account for source control integration

## Your First Steps

### 1. Account Setup

When you first sign up for Bricker, you'll be prompted to:

1. **Create or join a company**
   - For individual use, a personal company is automatically created
   - For organizations, create a company and invite team members

2. **Choose your subscription tier**
   - **Free**: Up to 1 user, 5 projects, 100 datasets
   - **Pro**: Up to 10 users, unlimited projects, unlimited datasets
   - **Enterprise**: Unlimited users, advanced features, dedicated support

3. **Complete your profile**
   - Add your name and avatar
   - Set your preferences

### 2. Creating Your First Project

Projects are top-level containers for organizing related datasets.

**Steps:**
1. Click **"New Project"** on the dashboard
2. Enter project details:
   - **Name**: e.g., "Customer Analytics"
   - **Description**: Brief description of the project
   - **Type**: Standard, Data Vault, or Dimensional
   - **Visibility**: Public (all company members) or Private (only you and admins)
3. Click **"Create Project"**

**Project Types:**
- **Standard**: General-purpose data models
- **Data Vault**: Hub-Link-Satellite architecture
- **Dimensional**: Star/snowflake schemas with dimensions and facts

### 3. Creating Your First Workspace

Workspaces map to Git branches and contain your datasets on a visual canvas.

**Steps:**
1. Open your project
2. Click **"New Workspace"**
3. Enter workspace details:
   - **Name**: e.g., "main" or "development"
   - **Description**: Purpose of this workspace
   - **Source Control Branch**: (Optional) Git branch name
4. Click **"Create Workspace"**

**Best Practices:**
- Create a `main` workspace for production-ready models
- Create `development` workspaces for work-in-progress
- Use workspace names that match your Git branch names

### 4. Creating Your First Dataset

Datasets represent tables, views, or other data entities in your data platform.

**Steps:**
1. Open your workspace
2. Click **"Add Dataset"** or right-click the canvas
3. Fill in dataset properties:
   - **Name**: e.g., "customers"
   - **FQN** (Fully Qualified Name): e.g., "main.bronze.customers"
   - **Medallion Layer**: Raw, Bronze, Silver, or Gold
   - **Entity Type**: Table, Staging, DataVault, DataMart
   - **Materialization**: Table, View, or Materialized View
   - **Description**: What this dataset represents
4. Click **"Create"**

**Example Dataset:**
```
Name: customers
FQN: main.bronze.customers
Medallion Layer: Bronze
Entity Type: Table
Materialization: Table
Description: Customer master data from CRM system
```

### 5. Adding Columns

Columns are the fields within your dataset.

**Steps:**
1. Open the dataset editor (double-click the dataset on canvas)
2. Go to the **"Columns"** tab
3. Click **"Add Column"**
4. Enter column details:
   - **Name**: e.g., "customer_id"
   - **Data Type**: e.g., "BIGINT"
   - **Description**: Purpose of this column
   - **Is Primary Key**: Check if this is the primary key
   - **Is Nullable**: Check if NULL values are allowed
5. Click **"Save"**

**Example Columns:**
```
customer_id - BIGINT - Primary key, NOT NULL
email - VARCHAR - Customer email address
first_name - VARCHAR - Customer first name
last_name - VARCHAR - Customer last name
created_at - TIMESTAMP - Record creation timestamp
```

### 6. Defining Column References

Column references create relationships between datasets (foreign keys, business keys, etc.).

**Steps:**
1. Open the dataset editor
2. Go to the **"Columns"** tab
3. Select a column (e.g., "customer_id" in an orders table)
4. Click **"Add Reference"**
5. Choose:
   - **Target Dataset**: The dataset being referenced
   - **Target Column**: The column being referenced
   - **Reference Type**: FK (Foreign Key), BusinessKey, or NaturalKey
   - **Description**: Why this reference exists
6. Click **"Save"**

**Example Reference:**
```
Source: orders.customer_id
Target: customers.customer_id
Type: FK (Foreign Key)
Description: Links order to customer record
```

### 7. Tracking Data Lineage

Lineage shows how data flows from source to target.

**Steps:**
1. Click **"Add Lineage"** or use the lineage tool
2. Select:
   - **Source Dataset/Column**: Where the data comes from
   - **Target Dataset/Column**: Where the data goes to
   - **Mapping Type**: Direct, Transform, Derived, or Calculated
   - **Transformation**: (Optional) SQL expression if transformed
3. Click **"Create"**

**Example Lineage:**
```
Source: bronze.raw_customers.cust_id
Target: silver.customers.customer_id
Mapping Type: Transform
Transformation: CAST(cust_id AS BIGINT)
```

### 8. Viewing Your Canvas

The canvas provides a visual representation of your datasets.

**Canvas Features:**
- **Zoom**: Use mouse wheel or zoom controls
- **Pan**: Click and drag the canvas
- **Select**: Click datasets to select them
- **Multi-select**: Hold Ctrl/Cmd and click
- **Move**: Drag selected datasets
- **Connect**: Drag from one dataset to another to create lineage

**Layout Tips:**
- Arrange datasets left-to-right (source → target)
- Group related datasets together
- Use colors to indicate medallion layers
- Keep the canvas organized and readable

### 9. Connecting to Source Control (Optional)

Connect your workspace to GitHub or GitLab for version control.

**Steps:**
1. Go to **Workspace Settings**
2. Under **"Source Control Integration"**:
   - **Repository URL**: Your Git repository URL
   - **Branch**: The branch to sync with
   - **Access Token**: Personal access token with repo permissions
3. Click **"Connect"**
4. Click **"Test Connection"** to verify

**Benefits:**
- Version control for your data models
- Collaborate with team members
- Track changes over time
- Rollback to previous versions
- CI/CD integration

### 10. Committing Your Changes

Once you've made changes, commit them to source control.

**Steps:**
1. Click the **"Source Control"** icon (shows uncommitted changes count)
2. Review your uncommitted changes
3. Enter a commit message describing your changes
4. Click **"Commit"**

**Your changes are now:**
- Saved in the database ✅
- Committed to Git ✅
- Visible to team members ✅

## Common Workflows

### Creating a Data Pipeline

1. **Bronze Layer**: Create raw datasets from source systems
2. **Silver Layer**: Create cleansed/conformed datasets
3. **Gold Layer**: Create aggregated/business-ready datasets
4. **Add Lineage**: Connect datasets to show data flow
5. **Commit**: Save your pipeline to source control

### Modeling a Star Schema

1. **Create Fact Table**: Central table with measures
2. **Create Dimension Tables**: Descriptive attributes
3. **Add Foreign Keys**: Reference dimensions from fact
4. **Add Lineage**: Show how dimensions feed the fact
5. **Set Entity Types**: Mark as "Dimension" and "Fact"

### Sharing Datasets Across Projects

1. **Create Dataset**: In one project
2. **Set Visibility**: Mark as "Public"
3. **Add to Project**: From another project, click "Add Existing Dataset"
4. **Select Dataset**: Choose the shared dataset
5. **Position on Canvas**: Place in workspace canvas

## Next Steps

Now that you've created your first data model:

1. **Explore Advanced Features**
   - [Column References](./datasets-and-lineage.md#column-references)
   - [Lineage Tracking](./datasets-and-lineage.md#tracking-lineage)
   - [Source Control Sync](./source-control-sync.md)

2. **Learn About Multi-Tenancy**
   - [Companies and Subscriptions](./multi-tenancy.md)
   - [Access Control](./access-control.md)

3. **Collaborate with Your Team**
   - Invite team members
   - Share datasets across projects
   - Use source control for collaboration

## Troubleshooting

### Can't create a dataset?
- Check your subscription limits
- Ensure you have edit permissions in the workspace
- Verify the workspace is not locked

### Dataset not appearing in another project?
- Check the dataset visibility (must be "public")
- Verify you're in the same company
- Try refreshing the page

### Source control not connecting?
- Verify your access token has `repo` permissions
- Check the repository URL format
- Ensure the branch exists

## Getting Help

- Browse other guides in this directory
- Check the [API Documentation](../api/README.md)
- Contact support at support@bricker.com

---

**Next:** [Workspaces and Projects](./workspaces-and-projects.md)
