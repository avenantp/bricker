# accounts and Multi-Tenancy Guide

Uroq uses a multi-tenant architecture where all resources are organized under **accounts**. This guide explains how accounts, subscriptions, and resource sharing work.

## Understanding accounts

### What is a Company?

A **company** is the root container for all your Uroq resources:
- Users
- Projects
- Workspaces
- Datasets
- Source control connections

**Key Characteristics:**
- ✅ Complete data isolation between accounts
- ✅ Shared subscription and billing
- ✅ Centralized user management
- ✅ Resource sharing within company

### Company Types

#### Individual Company
- **Purpose**: Personal use by a single user
- **Users**: 1 user
- **Use Case**: Freelancers, individual consultants, personal projects
- **Billing**: Individual subscription

#### Organization Company
- **Purpose**: Team/organization use
- **Users**: Multiple users with roles
- **Use Case**: accounts, teams, departments
- **Billing**: Organizational subscription with multiple seats

### Creating a Company

**Individual:**
- Automatically created when you sign up
- Named after your email (e.g., "john.doe@example.com")
- Can upgrade to organization later

**Organization:**
1. Go to **Settings** → **Company**
2. Click **"Create Organization"**
3. Enter company details:
   - **Name**: Your organization name
   - **Type**: Organization
4. Click **"Create"**
5. Invite team members

## Subscription Tiers

### Free Tier

**Limits:**
- **Users**: 1
- **Projects**: 5
- **Datasets**: 100
- **Workspaces**: 10

**Features:**
- ✅ Core dataset modeling
- ✅ Column references
- ✅ Basic lineage tracking
- ✅ Source control sync
- ✅ Community support

**Best For:**
- Individual users
- Personal projects
- Proof of concept
- Learning Uroq

### Pro Tier

**Limits:**
- **Users**: Up to 10
- **Projects**: Unlimited
- **Datasets**: Unlimited
- **Workspaces**: Unlimited

**Features:**
- ✅ Everything in Free
- ✅ Team collaboration
- ✅ Advanced lineage visualization
- ✅ Custom templates
- ✅ API access
- ✅ Priority support
- ✅ Advanced analytics

**Price:** $49/month per user

**Best For:**
- Small teams
- Growing projects
- Professional use
- Multiple projects

### Enterprise Tier

**Limits:**
- **Users**: Unlimited
- **Projects**: Unlimited
- **Datasets**: Unlimited
- **Workspaces**: Unlimited

**Features:**
- ✅ Everything in Pro
- ✅ SSO/SAML authentication
- ✅ Advanced security controls
- ✅ Audit logging
- ✅ Custom roles and permissions
- ✅ Dedicated support
- ✅ SLA guarantee
- ✅ On-premise deployment option
- ✅ Custom integrations

**Price:** Custom pricing

**Best For:**
- Large organizations
- Enterprise requirements
- Compliance needs
- Mission-critical workloads

### Upgrading Your Subscription

1. Go to **Settings** → **Subscription**
2. Click **"Upgrade"**
3. Select tier (Pro or Enterprise)
4. Enter payment details
5. Click **"Subscribe"**

**Immediate Benefits:**
- Limits increased instantly
- New features unlocked
- Pro-rated billing for current month

## User Roles and Permissions

### Company Roles

#### Admin
**Permissions:**
- ✅ Full access to all resources
- ✅ Manage company settings
- ✅ Manage billing and subscription
- ✅ Invite/remove users
- ✅ Create/delete/modify any resource
- ✅ Change resource visibility
- ✅ View audit logs

**Use Cases:**
- Company owners
- IT administrators
- Project managers

#### Member
**Permissions:**
- ✅ View public resources
- ✅ Create own resources
- ✅ Edit own resources
- ✅ Share own resources
- ❌ Cannot access others' private resources
- ❌ Cannot manage company settings
- ❌ Cannot manage billing

**Use Cases:**
- Data engineers
- Analytics engineers
- Data analysts

### Resource Roles

Resources (projects, workspaces, datasets) can have additional access control:

#### Owner
- Created the resource
- Full control over the resource
- Can change visibility
- Can delete resource

#### Editor
- Can modify resource
- Cannot change visibility
- Cannot delete resource

#### Viewer
- Read-only access
- Cannot modify anything
- Can view and use resource

## Resource Visibility

### Public
- **Access**: All company members can see and use
- **Editing**: Only owner and admins can edit
- **Use Case**: Shared datasets, company standards

**Example:**
```
Dataset: "dim_customer"
Visibility: Public
Owner: John (Data Engineer)

Result:
- All company members can see and use dim_customer
- Only John and admins can modify it
- Can be added to any project/workspace
```

### Private
- **Access**: Only owner and admins can see
- **Editing**: Only owner and admins can edit
- **Use Case**: Work-in-progress, sensitive data

**Example:**
```
Dataset: "customer_pii_staging"
Visibility: Private
Owner: Sarah (Data Engineer)

Result:
- Only Sarah and admins can see it
- Only Sarah and admins can use it
- Cannot be added to others' projects
```

### Locked
- **Access**: All company members can see (if public) or owner only (if private)
- **Editing**: Only owner and admins can edit
- **Use Case**: Production datasets, approved models

**Example:**
```
Dataset: "fact_sales"
Visibility: Public
Is Locked: Yes
Owner: Mike (Lead Engineer)

Result:
- All company members can see and use fact_sales
- Nobody except Mike and admins can modify it
- Prevents accidental changes to production data
```

## Sharing Datasets Across Projects

### Why Share Datasets?

**Benefits:**
- **Reusability**: Create once, use everywhere
- **Consistency**: Single source of truth
- **Efficiency**: No duplication
- **Maintenance**: Update once, reflected everywhere

**Use Cases:**
- Shared dimension tables across star schemas
- Common staging tables used by multiple pipelines
- Reference data used company-wide

### How to Share a Dataset

#### Step 1: Create Dataset in Source Project

1. Create dataset in Project A
2. Set visibility to **"Public"**
3. Commit to source control (optional)

#### Step 2: Add to Target Project

1. Open Project B
2. Click **"Add Existing Dataset"**
3. Browse datasets from your company
4. Select the dataset from Project A
5. Click **"Add to Project"**

#### Step 3: Add to Workspace Canvas

1. Open workspace in Project B
2. Click **"Add to Canvas"**
3. Select the shared dataset
4. Position on canvas

**Result:**
- Dataset appears in both projects
- Changes to dataset reflect in both places
- Only owner can modify the dataset
- Canvas positions are independent per workspace

### Sharing Example

**Scenario:**
```
dim_customer created in "Customer Analytics" project
Want to use in "Sales Dashboard" project
```

**Steps:**
1. In "Customer Analytics":
   - Create dim_customer
   - Set visibility: Public
   - Owner: Data Engineering Team

2. In "Sales Dashboard":
   - Add existing dataset → dim_customer
   - Add to workspace canvas
   - Position next to fact_sales

3. Result:
   - Both projects use same dim_customer
   - Data Engineering Team owns and maintains it
   - Dashboard team can use but not modify
   - Updates automatically available to both projects

## Managing Users

### Inviting Users

**Prerequisites:**
- Admin role
- Pro or Enterprise subscription with available seats

**Steps:**
1. Go to **Settings** → **Users**
2. Click **"Invite User"**
3. Enter email address
4. Select role: Admin or Member
5. Click **"Send Invitation"**

**Invitation Process:**
1. User receives email invitation
2. User clicks invitation link
3. User creates account or signs in
4. User is added to company

### Managing User Roles

1. Go to **Settings** → **Users**
2. Find user in list
3. Click **"Change Role"**
4. Select new role
5. Click **"Update"**

**Role Changes:**
- Admin → Member: Loses administrative privileges
- Member → Admin: Gains administrative privileges
- Takes effect immediately

### Removing Users

1. Go to **Settings** → **Users**
2. Find user in list
3. Click **"Remove User"**
4. Confirm removal

**Effects:**
- User loses access to company resources
- User's owned resources remain (transferred to admin)
- Frees up subscription seat
- Cannot be undone (user must be re-invited)

## Company Settings

### General Settings

**Company Name:**
- Displayed throughout application
- Can be changed anytime

**Company Type:**
- Individual or Organization
- Cannot be changed after creation

**Industry:**
- Select your industry (optional)
- Used for analytics and benchmarking

### Billing Settings

**Payment Method:**
- Credit card or invoice (Enterprise)
- Update in Settings → Billing

**Billing Contact:**
- Email for invoices and receipts
- Can be different from admin email

**Billing Address:**
- Required for invoicing
- Used for tax calculations

### Security Settings

**Authentication:**
- Email/password (default)
- SSO/SAML (Enterprise only)
- Two-factor authentication (recommended)

**Session Timeout:**
- Auto-logout after inactivity
- Default: 30 minutes
- Range: 15 minutes to 24 hours

**IP Allowlist:**
- Restrict access to specific IP ranges
- Enterprise only
- Format: CIDR notation (e.g., 192.168.1.0/24)

## Subscription Limits

### Monitoring Usage

View current usage:
1. Go to **Settings** → **Subscription**
2. See usage dashboard:
   - Users: X of Y
   - Projects: X of Y (Unlimited for Pro/Enterprise)
   - Datasets: X of Y (Unlimited for Pro/Enterprise)
   - Workspaces: X of Y (Unlimited for Pro/Enterprise)

### Handling Limits

**Approaching Limit:**
- Warning shown at 80% usage
- Email notifications sent to admins

**At Limit:**
- Cannot create new resources
- Existing resources continue working
- Must upgrade or delete resources

**Over Limit:**
- Can happen if downgrading
- Grace period: 30 days
- Must reduce usage or upgrade

## Best Practices

### Company Organization

**Naming Convention:**
```
Good: "Acme Corporation"
Bad: "acme_corp" or "ACME_CORP_123"
```

**User Management:**
- Use admin role sparingly (1-2 admins)
- Most users should be members
- Review user list quarterly
- Remove inactive users

**Resource Visibility:**
- Default to public for shared datasets
- Use private for work-in-progress
- Lock production-ready datasets
- Document visibility decisions

### Subscription Management

**Right-Sizing:**
- Free: Start here, upgrade when needed
- Pro: When you need team collaboration
- Enterprise: When you need security/compliance

**Cost Optimization:**
- Remove unused users
- Archive completed projects
- Delete unused datasets
- Monitor usage regularly

### Security

**Access Control:**
- Follow principle of least privilege
- Review permissions regularly
- Use locked visibility for critical data
- Enable two-factor authentication

**Audit:**
- Review audit logs monthly
- Investigate suspicious activity
- Document access changes
- Maintain compliance records

## Migration Scenarios

### Individual to Organization

**When to Migrate:**
- Adding team members
- Need for collaboration
- Growing project complexity

**Steps:**
1. Upgrade to Pro or Enterprise subscription
2. Create organization company
3. Transfer projects to organization
4. Invite team members
5. Set up access controls

### Merging accounts

**When to Merge:**
- Company acquisition
- Department consolidation
- Simplifying structure

**Steps:**
1. Contact support (Enterprise only)
2. Plan resource migration
3. Transfer datasets to target company
4. Update source control connections
5. Migrate users

## Getting Help

### Support Channels

**Free Tier:**
- Community forum
- Documentation
- Email support (48-hour response)

**Pro Tier:**
- Priority email support (24-hour response)
- Live chat (business hours)
- Documentation

**Enterprise Tier:**
- Dedicated support manager
- 24/7 phone support
- SLA guarantees
- Custom onboarding

### Common Issues

**Can't invite users?**
- Check subscription limits
- Verify admin role
- Check email address format

**Dataset not shareable?**
- Set visibility to public
- Verify same company
- Check ownership

**Billing questions?**
- Contact billing@uroq.com
- Include company name and invoice number

---

**Next:** [Access Control Guide](./access-control.md)
