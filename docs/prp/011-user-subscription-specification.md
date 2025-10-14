# Technical Specification: User, Subscription & License Management

## 1. Overview

### 1.1 Purpose
Implement a comprehensive user, subscription, and license management system similar to Cursor.ai's model, providing transparent usage tracking, flexible subscription tiers, and team-based collaboration with granular access controls.

### 1.2 Key Features
- Individual and organization account types
- Multi-tier subscription plans (Free, Pro, Enterprise, Custom)
- Usage-based metering and limits
- Team member management with role-based access
- Transparent usage dashboards
- Stripe integration for payments
- Grace periods and billing management
- API token management for programmatic access

### 1.3 Design Principles
- **Transparency**: Users always know their usage and limits
- **Flexibility**: Easy upgrades, downgrades, and team scaling
- **Fairness**: Grace periods before hard limits
- **Security**: Row-level security and audit logging
- **Simplicity**: Clear pricing and straightforward management

---

## 2. Data Architecture

### 2.1 Core Tables

#### 2.1.1 Accounts Table (Multi-Tenant Root)
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  name VARCHAR NOT NULL UNIQUE,
  slug VARCHAR UNIQUE, -- URL-friendly identifier (e.g., 'acme-corp')
  account_type VARCHAR NOT NULL CHECK (account_type IN ('individual', 'organization')),
  
  -- Subscription
  current_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  subscription_tier VARCHAR DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'custom')),
  subscription_status VARCHAR DEFAULT 'active' CHECK (subscription_status IN (
    'active',      -- Paying and in good standing
    'trialing',    -- In trial period
    'past_due',    -- Payment failed, grace period
    'suspended',   -- Grace period expired, limited access
    'cancelled',   -- User cancelled, end of period
    'incomplete'   -- Signup started but payment incomplete
  )),
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  
  -- Billing
  billing_email VARCHAR,
  billing_contact_name VARCHAR,
  billing_address JSONB, -- {line1, line2, city, state, postal_code, country}
  tax_id VARCHAR, -- VAT/Tax ID for invoicing
  stripe_customer_id VARCHAR UNIQUE,
  stripe_subscription_id VARCHAR UNIQUE,
  
  -- Limits (from plan or custom overrides)
  max_users INTEGER DEFAULT 1,
  max_projects INTEGER DEFAULT 5,
  max_datasets INTEGER DEFAULT 100,
  max_monthly_ai_requests INTEGER DEFAULT 100, -- AI usage limit
  max_storage_mb INTEGER DEFAULT 1000, -- Storage limit in MB
  
  -- Usage Tracking (current period)
  current_user_count INTEGER DEFAULT 0,
  current_project_count INTEGER DEFAULT 0,
  current_dataset_count INTEGER DEFAULT 0,
  current_monthly_ai_requests INTEGER DEFAULT 0,
  current_storage_mb INTEGER DEFAULT 0,
  usage_reset_date TIMESTAMP, -- When usage counters reset
  
  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Email verification for orgs
  allow_trial BOOLEAN DEFAULT true, -- Can use trial
  has_used_trial BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_status ON accounts(subscription_status);
CREATE INDEX idx_accounts_slug ON accounts(slug);
CREATE INDEX idx_accounts_stripe_customer ON accounts(stripe_customer_id);
CREATE INDEX idx_accounts_deleted ON accounts(deleted_at) WHERE deleted_at IS NULL;
```

#### 2.1.2 Subscription Plans Table
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Plan Identity
  name VARCHAR NOT NULL UNIQUE, -- 'Free', 'Pro', 'Enterprise'
  slug VARCHAR NOT NULL UNIQUE, -- 'free', 'pro', 'enterprise'
  tier VARCHAR NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise', 'custom')),
  display_name VARCHAR NOT NULL, -- 'Professional Plan'
  description TEXT,
  
  -- Pricing
  price_monthly NUMERIC(10,2), -- Monthly price in USD
  price_yearly NUMERIC(10,2), -- Yearly price in USD (discounted)
  currency VARCHAR DEFAULT 'usd',
  stripe_price_id_monthly VARCHAR, -- Stripe Price ID for monthly
  stripe_price_id_yearly VARCHAR, -- Stripe Price ID for yearly
  
  -- Limits
  max_users INTEGER,
  max_projects INTEGER,
  max_datasets INTEGER,
  max_monthly_ai_requests INTEGER,
  max_storage_mb INTEGER,
  max_workspaces_per_project INTEGER,
  max_connections INTEGER,
  
  -- Features (JSONB array of feature keys)
  features JSONB, -- ['advanced_ai', 'priority_support', 'sso', 'audit_logs']
  
  -- Feature Flags
  has_git_sync BOOLEAN DEFAULT true,
  has_ai_assistance BOOLEAN DEFAULT false,
  has_data_vault_accelerator BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_sso BOOLEAN DEFAULT false,
  has_audit_logs BOOLEAN DEFAULT false,
  has_api_access BOOLEAN DEFAULT false,
  has_white_labeling BOOLEAN DEFAULT false,
  
  -- Trial
  trial_days INTEGER DEFAULT 0, -- Number of trial days (0 = no trial)
  
  -- Visibility
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Show on pricing page
  is_recommended BOOLEAN DEFAULT false, -- Highlight as recommended
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX idx_subscription_plans_public ON subscription_plans(is_public) WHERE is_public = true;

-- Seed default plans
INSERT INTO subscription_plans (name, slug, tier, display_name, price_monthly, price_yearly, max_users, max_projects, max_datasets, max_monthly_ai_requests, max_storage_mb, trial_days, features) VALUES
('Free', 'free', 'free', 'Free Plan', 0, 0, 1, 5, 100, 100, 1000, 0, '[]'),
('Pro', 'pro', 'pro', 'Professional Plan', 29, 290, 10, 50, 1000, 1000, 10000, 14, '["advanced_ai", "priority_support", "api_access"]'),
('Enterprise', 'enterprise', 'enterprise', 'Enterprise Plan', NULL, NULL, -1, -1, -1, -1, -1, 30, '["advanced_ai", "priority_support", "sso", "audit_logs", "api_access", "white_labeling"]');
```

#### 2.1.3 Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  
  -- Stripe Integration
  stripe_subscription_id VARCHAR UNIQUE,
  stripe_customer_id VARCHAR, -- Denormalized for quick lookup
  stripe_price_id VARCHAR, -- Current price being charged
  
  -- Status
  status VARCHAR NOT NULL CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
  )),
  
  -- Dates
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  ended_at TIMESTAMP,
  
  -- Billing
  billing_cycle VARCHAR CHECK (billing_cycle IN ('monthly', 'yearly')),
  cancel_at_period_end BOOLEAN DEFAULT false,
  auto_renew BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB, -- Additional Stripe metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_account ON subscriptions(account_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
```

#### 2.1.4 Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Stripe Integration
  stripe_payment_intent_id VARCHAR UNIQUE,
  stripe_charge_id VARCHAR,
  stripe_invoice_id VARCHAR,
  
  -- Payment Details
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'usd',
  status VARCHAR NOT NULL CHECK (status IN (
    'pending',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded',
    'disputed'
  )),
  
  -- Payment Method
  payment_method VARCHAR, -- 'card', 'bank_transfer', 'paypal'
  last4 VARCHAR, -- Last 4 digits of card
  brand VARCHAR, -- 'visa', 'mastercard'
  
  -- Failure Details
  failure_code VARCHAR,
  failure_message TEXT,
  
  -- Refund Details
  refund_amount NUMERIC(10,2),
  refund_reason TEXT,
  refunded_at TIMESTAMP,
  
  -- Dates
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_account ON payments(account_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_processed ON payments(processed_at);
```

#### 2.1.5 Usage Events Table
```sql
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type VARCHAR NOT NULL CHECK (event_type IN (
    'ai_request',
    'dataset_created',
    'project_created',
    'user_invited',
    'storage_used',
    'api_call'
  )),
  event_category VARCHAR, -- 'ai', 'resource', 'api'
  
  -- Quantity
  quantity INTEGER DEFAULT 1, -- How many units consumed
  unit VARCHAR, -- 'request', 'mb', 'count'
  
  -- Context
  resource_type VARCHAR, -- 'dataset', 'project', etc.
  resource_id UUID,
  metadata JSONB, -- Additional context
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_events_account ON usage_events(account_id);
CREATE INDEX idx_usage_events_user ON usage_events(user_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created ON usage_events(created_at);
CREATE INDEX idx_usage_events_account_type_created ON usage_events(account_id, event_type, created_at);
```

#### 2.1.6 Invitations Table
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Invitee
  email VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('admin', 'member')),
  
  -- Token
  token VARCHAR NOT NULL UNIQUE, -- Secure random token
  
  -- Inviter
  invited_by UUID REFERENCES users(id),
  invited_by_name VARCHAR,
  invited_by_email VARCHAR,
  
  -- Status
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES users(id),
  
  -- Expiry
  expires_at TIMESTAMP NOT NULL,
  
  -- Metadata
  message TEXT, -- Optional message from inviter
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitations_account ON invitations(account_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);
```

#### 2.1.7 API Tokens Table
```sql
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Token Details
  name VARCHAR NOT NULL, -- User-friendly name
  token_hash VARCHAR NOT NULL UNIQUE, -- SHA-256 hash of token
  prefix VARCHAR NOT NULL, -- First 8 chars for display (e.g., 'brk_1234')
  
  -- Permissions
  scopes JSONB, -- ['read:datasets', 'write:projects']
  
  -- Usage
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- Expiry
  expires_at TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revoke_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_tokens_account ON api_tokens(account_id);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash);
CREATE INDEX idx_api_tokens_active ON api_tokens(is_active) WHERE is_active = true;
```

### 2.2 Updated Users Table
```sql
-- Users table already exists, add these columns if missing:
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_notifications": true,
  "usage_alerts": true,
  "billing_alerts": true,
  "security_alerts": true
}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
```

### 2.3 Account Users (Membership) Table
```sql
-- Already exists in schema, add these columns if missing:
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP;
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES users(id);
```

---

## 3. Business Logic

### 3.1 Account Types

#### 3.1.1 Individual Accounts
- Created automatically on user signup
- `account_type = 'individual'`
- `name = user's email or full name`
- Single user (max_users = 1)
- Can upgrade to organization later
- Default to Free plan

#### 3.1.2 Organization Accounts
- Created when user creates a team
- `account_type = 'organization'`
- `name = company name`
- Multiple users supported
- Creator becomes owner/admin
- Can invite team members

### 3.2 Subscription Tiers

#### 3.2.1 Free Plan
**Limits:**
- 1 user (individual only)
- 5 projects
- 100 datasets
- 100 AI requests/month
- 1 GB storage
- Basic features only
- Community support

**Features:**
- Core metadata management
- GitHub sync
- Basic templates
- Community templates

#### 3.2.2 Pro Plan ($29/month or $290/year)
**Limits:**
- 10 users
- 50 projects
- 1,000 datasets
- 1,000 AI requests/month
- 10 GB storage

**Features:**
- All Free features
- Advanced AI assistance
- Data Vault accelerator
- Dimensional modeling
- Priority email support
- API access
- 14-day trial

#### 3.2.3 Enterprise Plan (Custom pricing)
**Limits:**
- Unlimited users
- Unlimited projects
- Unlimited datasets
- Unlimited AI requests
- Unlimited storage

**Features:**
- All Pro features
- SSO (SAML, OAuth)
- Advanced audit logs
- Dedicated support
- White-labeling
- Custom integrations
- SLA guarantees
- 30-day trial

### 3.3 Usage Tracking

#### 3.3.1 Countable Resources
1. **Users**: Count of active users in account_users
2. **Projects**: Count of projects for account
3. **Datasets**: Count of datasets for account
4. **AI Requests**: Count of AI API calls in current period
5. **Storage**: Sum of YAML file sizes + metadata

#### 3.3.2 Usage Calculation
```typescript
interface UsageSnapshot {
  account_id: string;
  period_start: Date;
  period_end: Date;
  
  users: {
    current: number;
    limit: number;
    percentage: number;
  };
  
  projects: {
    current: number;
    limit: number;
    percentage: number;
  };
  
  datasets: {
    current: number;
    limit: number;
    percentage: number;
  };
  
  ai_requests: {
    current: number;
    limit: number;
    percentage: number;
    resets_at: Date;
  };
  
  storage: {
    current_mb: number;
    limit_mb: number;
    percentage: number;
  };
}
```

#### 3.3.3 Usage Reset
- AI requests reset monthly on subscription anniversary
- Resource counts are real-time (users, projects, datasets)
- Storage is calculated daily

### 3.4 Limit Enforcement

#### 3.4.1 Soft Limits (Warnings)
- At 80% usage: Warning notification
- At 90% usage: Prominent warning, suggest upgrade
- At 95% usage: Blocking warning, must upgrade soon

#### 3.4.2 Hard Limits (Blocking)
- At 100% usage: Block new resource creation
- Grace period: 7 days to upgrade or delete resources
- After grace period: Account suspended (read-only)

#### 3.4.3 Limit Check Service
```typescript
interface LimitCheckResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  percentage: number;
  message?: string;
  requires_upgrade: boolean;
}

async function checkLimit(
  accountId: string,
  resourceType: 'users' | 'projects' | 'datasets' | 'ai_requests' | 'storage',
  incrementBy: number = 1
): Promise<LimitCheckResult>
```

### 3.5 Subscription Lifecycle

#### 3.5.1 Trial Period
1. User signs up
2. Selects plan with trial
3. Trial starts immediately (no payment)
4. Full access to plan features
5. 3 days before trial end: Email reminder
6. Trial ends: Prompt for payment
7. If no payment: Downgrade to Free plan

#### 3.5.2 Subscription Activation
1. User enters payment method (Stripe)
2. Stripe creates customer and subscription
3. Webhook confirms subscription active
4. Plan features activated
5. Usage limits applied
6. First billing on subscription start date

#### 3.5.3 Upgrade/Downgrade
**Immediate Upgrade:**
- Switch to higher tier immediately
- Pro-rated charge for remaining period
- New limits apply immediately
- No data loss

**Downgrade (end of period):**
- Schedule downgrade for end of current period
- User keeps current plan until then
- Warning if over new limits
- Must reduce usage before downgrade applies
- On period end: Downgrade activates

#### 3.5.4 Cancellation
1. User cancels subscription
2. Access continues until period end
3. No auto-renewal
4. Data retained for 30 days
5. After 30 days: Account suspended
6. After 90 days: Data deleted (with warning)

#### 3.5.5 Payment Failure
1. Payment fails (card declined, etc.)
2. Status: `past_due`
3. Retry payment (Stripe automatic retry)
4. Email user to update payment method
5. Grace period: 7 days
6. After grace period: Status `suspended`, read-only access
7. After 30 days: Status `cancelled`

### 3.6 Team Management

#### 3.6.1 Roles
- **Owner**: Full control, billing access, cannot be removed
- **Admin**: Full control except billing and deleting account
- **Member**: Standard access, cannot manage team or billing

#### 3.6.2 Invitation Flow
1. Admin/Owner invites user by email
2. Invitation created with secure token
3. Email sent with invitation link
4. Invitee clicks link
5. If existing user: Add to account immediately
6. If new user: Sign up flow, then add to account
7. Invitation marked accepted

#### 3.6.3 User Removal
- Only admins/owners can remove users
- Cannot remove owner
- User loses access to account immediately
- User's personal data retained (for audit)
- Reassign user's resources to admin

---

## 4. API Endpoints

### 4.1 Account Management

#### 4.1.1 Get Current Account
```typescript
GET /api/accounts/current
Response: {
  account: Account;
  subscription: Subscription;
  plan: SubscriptionPlan;
  usage: UsageSnapshot;
  permissions: string[]; // User's permissions in this account
}
```

#### 4.1.2 Update Account
```typescript
PATCH /api/accounts/:accountId
Request: {
  name?: string;
  billing_email?: string;
  billing_address?: object;
  tax_id?: string;
}
Response: { account: Account }
```

#### 4.1.3 Delete Account
```typescript
DELETE /api/accounts/:accountId
Request: {
  confirmation: string; // Must match account name
  transfer_ownership?: string; // Email of new owner (if applicable)
}
Response: { success: boolean; scheduled_deletion_date: Date }
```

### 4.2 Subscription Management

#### 4.2.1 Get Available Plans
```typescript
GET /api/subscriptions/plans
Query: {
  public_only?: boolean;
  include_features?: boolean;
}
Response: {
  plans: SubscriptionPlan[];
}
```

#### 4.2.2 Start Trial
```typescript
POST /api/subscriptions/trial
Request: {
  plan_id: string;
}
Response: {
  subscription: Subscription;
  trial_end_date: Date;
}
```

#### 4.2.3 Create Subscription (Upgrade)
```typescript
POST /api/subscriptions
Request: {
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  payment_method_id: string; // Stripe payment method
  proration?: boolean; // Default true
}
Response: {
  subscription: Subscription;
  client_secret?: string; // For 3D Secure if needed
}
```

#### 4.2.4 Update Subscription (Change Plan)
```typescript
PATCH /api/subscriptions/:subscriptionId
Request: {
  plan_id?: string;
  billing_cycle?: 'monthly' | 'yearly';
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
}
Response: {
  subscription: Subscription;
  proration_amount?: number;
}
```

#### 4.2.5 Cancel Subscription
```typescript
DELETE /api/subscriptions/:subscriptionId
Request: {
  cancel_at_period_end: boolean; // true = cancel at end, false = cancel now
  reason?: string;
}
Response: {
  subscription: Subscription;
  access_until: Date;
}
```

### 4.3 Usage Tracking

#### 4.3.1 Get Usage
```typescript
GET /api/usage
Query: {
  period?: 'current' | 'last_month';
}
Response: {
  usage: UsageSnapshot;
  trends: {
    resource_type: string;
    change_percentage: number;
  }[];
}
```

#### 4.3.2 Get Usage History
```typescript
GET /api/usage/history
Query: {
  start_date?: Date;
  end_date?: Date;
  event_type?: string;
  limit?: number;
}
Response: {
  events: UsageEvent[];
  total: number;
}
```

#### 4.3.3 Check Limit
```typescript
POST /api/usage/check-limit
Request: {
  resource_type: 'users' | 'projects' | 'datasets' | 'ai_requests' | 'storage';
  increment_by?: number;
}
Response: LimitCheckResult
```

### 4.4 Team Management

#### 4.4.1 List Team Members
```typescript
GET /api/accounts/:accountId/members
Response: {
  members: (AccountUser & {
    user: User;
    invited_by_name?: string;
  })[];
  total: number;
}
```

#### 4.4.2 Invite User
```typescript
POST /api/accounts/:accountId/invitations
Request: {
  email: string;
  role: 'admin' | 'member';
  message?: string;
}
Response: {
  invitation: Invitation;
}
```

#### 4.4.3 Resend Invitation
```typescript
POST /api/invitations/:invitationId/resend
Response: { success: boolean }
```

#### 4.4.4 Revoke Invitation
```typescript
DELETE /api/invitations/:invitationId
Response: { success: boolean }
```

#### 4.4.5 Accept Invitation
```typescript
POST /api/invitations/accept
Request: {
  token: string;
}
Response: {
  account: Account;
  member: AccountUser;
}
```

#### 4.4.6 Update Member Role
```typescript
PATCH /api/accounts/:accountId/members/:userId
Request: {
  role: 'admin' | 'member';
}
Response: {
  member: AccountUser;
}
```

#### 4.4.7 Remove Member
```typescript
DELETE /api/accounts/:accountId/members/:userId
Response: { success: boolean }
```

### 4.5 Billing & Payments

#### 4.5.1 Get Payment Methods
```typescript
GET /api/billing/payment-methods
Response: {
  payment_methods: {
    id: string;
    type: string;
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
    is_default: boolean;
  }[];
}
```

#### 4.5.2 Add Payment Method
```typescript
POST /api/billing/payment-methods
Request: {
  stripe_payment_method_id: string;
  set_as_default?: boolean;
}
Response: {
  payment_method: any;
}
```

#### 4.5.3 Set Default Payment Method
```typescript
POST /api/billing/payment-methods/:paymentMethodId/default
Response: { success: boolean }
```

#### 4.5.4 Delete Payment Method
```typescript
DELETE /api/billing/payment-methods/:paymentMethodId
Response: { success: boolean }
```

#### 4.5.5 Get Invoices
```typescript
GET /api/billing/invoices
Query: {
  limit?: number;
  starting_after?: string;
}
Response: {
  invoices: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    invoice_pdf: string;
    created_at: Date;
    period_start: Date;
    period_end: Date;
  }[];
  has_more: boolean;
}
```

#### 4.5.6 Download Invoice
```typescript
GET /api/billing/invoices/:invoiceId/download
Response: PDF file
```

### 4.6 API Tokens

#### 4.6.1 List API Tokens
```typescript
GET /api/api-tokens
Response: {
  tokens: (Omit<APIToken, 'token_hash'> & {
    display_token: string; // prefix + asterisks
  })[];
}
```

#### 4.6.2 Create API Token
```typescript
POST /api/api-tokens
Request: {
  name: string;
  scopes: string[];
  expires_in_days?: number; // null = no expiry
}
Response: {
  token: string; // Full token, shown only once
  token_metadata: APIToken;
}
```

#### 4.6.3 Revoke API Token
```typescript
DELETE /api/api-tokens/:tokenId
Request: {
  reason?: string;
}
Response: { success: boolean }
```

---

## 5. UI Components

### 5.1 Account Settings Page

#### 5.1.1 General Tab
```tsx
<AccountSettingsGeneral>
  <Section title="Account Information">
    <Field label="Account Name" value={account.name} editable />
    <Field label="Account Type" value={account.account_type} />
    <Field label="Account ID" value={account.id} copyable />
  </Section>
  
  <Section title="Billing Information">
    <Field label="Billing Email" value={account.billing_email} editable />
    <Field label="Tax ID" value={account.tax_id} editable />
    <AddressField label="Billing Address" value={account.billing_address} />
  </Section>
  
  <Section title="Danger Zone">
    <Button variant="danger" onClick={handleDeleteAccount}>
      Delete Account
    </Button>
  </Section>
</AccountSettingsGeneral>
```

#### 5.1.2 Subscription Tab
```tsx
<SubscriptionSettings>
  <CurrentPlanCard
    plan={currentPlan}
    subscription={subscription}
    onUpgrade={handleUpgrade}
    onCancel={handleCancel}
  />
  
  <UsageOverview usage={usage} />
  
  <PlanComparison
    plans={availablePlans}
    currentPlan={currentPlan}
    onSelectPlan={handleSelectPlan}
  />
</SubscriptionSettings>
```

#### 5.1.3 Team Tab
```tsx
<TeamSettings>
  <TeamMembersList
    members={members}
    onRemove={handleRemoveMember}
    onChangeRole={handleChangeRole}
  />
  
  <InviteUserForm
    onInvite={handleInvite}
    remainingSeats={remainingSeats}
  />
  
  <PendingInvitations
    invitations={pendingInvitations}
    onResend={handleResendInvitation}
    onRevoke={handleRevokeInvitation}
  />
</TeamSettings>
```

#### 5.1.4 Billing Tab
```tsx
<BillingSettings>
  <PaymentMethodsCard
    paymentMethods={paymentMethods}
    onAdd={handleAddPaymentMethod}
    onSetDefault={handleSetDefaultPaymentMethod}
    onDelete={handleDeletePaymentMethod}
  />
  
  <InvoiceHistory
    invoices={invoices}
    onDownload={handleDownloadInvoice}
  />
  
  <BillingContactInfo
    billingEmail={account.billing_email}
    billingAddress={account.billing_address}
    onUpdate={handleUpdateBillingInfo}
  />
</BillingSettings>
```

#### 5.1.5 API Tokens Tab
```tsx
<APITokensSettings>
  <APITokensList
    tokens={apiTokens}
    onRevoke={handleRevokeToken}
  />
  
  <CreateAPITokenDialog
    open={createTokenOpen}
    onClose={() => setCreateTokenOpen(false)}
    onCreated={handleTokenCreated}
  />
  
  <TokenCreatedDialog
    open={tokenCreatedOpen}
    token={newToken}
    onClose={() => setTokenCreatedOpen(false)}
  />
</APITokensSettings>
```

### 5.2 Usage Dashboard

```tsx
<UsageDashboard>
  <UsageOverview usage={usage}>
    <UsageCard
      title="Team Members"
      current={usage.users.current}
      limit={usage.users.limit}
      percentage={usage.users.percentage}
      icon={<Users />}
    />
    <UsageCard
      title="Projects"
      current={usage.projects.current}
      limit={usage.projects.limit}
      percentage={usage.projects.percentage}
      icon={<Folder />}
    />
    <UsageCard
      title="Datasets"
      current={usage.datasets.current}
      limit={usage.datasets.limit}
      percentage={usage.datasets.percentage}
      icon={<Database />}
    />
    <UsageCard
      title="AI Requests"
      current={usage.ai_requests.current}
      limit={usage.ai_requests.limit}
      percentage={usage.ai_requests.percentage}
      icon={<Sparkles />}
      resetsAt={usage.ai_requests.resets_at}
    />
    <UsageCard
      title="Storage"
      current={formatBytes(usage.storage.current_mb * 1024 * 1024)}
      limit={formatBytes(usage.storage.limit_mb * 1024 * 1024)}
      percentage={usage.storage.percentage}
      icon={<HardDrive />}
    />
  </UsageOverview>
  
  <UsageTrends trends={usageTrends} />
  
  {usage.percentage > 80 && (
    <UpgradePrompt
      usage={usage}
      currentPlan={currentPlan}
      onUpgrade={handleUpgrade}
    />
  )}
</UsageDashboard>
```

### 5.3 Plan Selection Page

```tsx
<PlanSelection>
  <PricingHeader
    title="Choose the right plan for your team"
    subtitle="All plans include core features. Upgrade anytime."
  />
  
  <BillingCycleToggle
    cycle={billingCycle}
    onChange={setBillingCycle}
    savings={calculateYearlySavings()}
  />
  
  <PricingCards>
    {plans.map(plan => (
      <PricingCard
        key={plan.id}
        plan={plan}
        billingCycle={billingCycle}
        isCurrentPlan={plan.id === currentPlan.id}
        isRecommended={plan.is_recommended}
        onSelect={() => handleSelectPlan(plan)}
      >
        <PlanFeatures features={plan.features} />
        <PlanLimits plan={plan} />
      </PricingCard>
    ))}
  </PricingCards>
  
  <PlanComparison plans={plans} />
</PlanSelection>
```

### 5.4 Upgrade Flow

```tsx
<UpgradeDialog open={upgradeOpen} onClose={handleClose}>
  <UpgradeStep step={currentStep}>
    {currentStep === 'select_plan' && (
      <PlanSelectionStep
        plans={plans}
        selectedPlan={selectedPlan}
        onSelect={setSelectedPlan}
        onNext={handleNext}
      />
    )}
    
    {currentStep === 'billing_cycle' && (
      <BillingCycleStep
        cycle={billingCycle}
        onChange={setBillingCycle}
        savings={calculateSavings()}
        onNext={handleNext}
        onBack={handleBack}
      />
    )}
    
    {currentStep === 'payment_method' && (
      <PaymentMethodStep
        existingMethods={paymentMethods}
        onSelectExisting={handleSelectExisting}
        onAddNew={handleAddNew}
        onNext={handleNext}
        onBack={handleBack}
      />
    )}
    
    {currentStep === 'review' && (
      <ReviewStep
        plan={selectedPlan}
        billingCycle={billingCycle}
        paymentMethod={selectedPaymentMethod}
        proratedAmount={proratedAmount}
        onConfirm={handleConfirmUpgrade}
        onBack={handleBack}
      />
    )}
    
    {currentStep === 'processing' && (
      <ProcessingStep />
    )}
    
    {currentStep === 'success' && (
      <SuccessStep
        plan={selectedPlan}
        onClose={handleClose}
      />
    )}
  </UpgradeStep>
</UpgradeDialog>
```

### 5.5 Usage Limit Warnings

```tsx
<LimitWarningBanner usage={usage}>
  {usage.percentage >= 95 && (
    <CriticalWarning>
      You're at {usage.percentage}% of your {usage.resource} limit.
      Upgrade now to avoid service interruption.
      <Button onClick={handleUpgrade}>Upgrade</Button>
    </CriticalWarning>
  )}
  
  {usage.percentage >= 90 && usage.percentage < 95 && (
    <HighWarning>
      You're approaching your {usage.resource} limit ({usage.percentage}%).
      Consider upgrading soon.
      <Button variant="secondary" onClick={handleUpgrade}>View Plans</Button>
    </HighWarning>
  )}
  
  {usage.percentage >= 80 && usage.percentage < 90 && (
    <ModerateWarning>
      You've used {usage.percentage}% of your {usage.resource} limit.
      <Link to="/settings/subscription">View usage details</Link>
    </ModerateWarning>
  )}
</LimitWarningBanner>
```

---

## 6. Service Layer

### 6.1 Account Service

```typescript
// backend/src/services/account-service.ts

export class AccountService {
  async createAccount(data: CreateAccountData): Promise<Account> {
    // Create account
    // Set default plan (Free)
    // Create initial subscription
    // Log event
  }
  
  async getAccount(accountId: string): Promise<Account> {
    // Get account with subscription and plan
  }
  
  async updateAccount(accountId: string, data: Partial<Account>): Promise<Account> {
    // Update account
    // Validate changes
    // Log event
  }
  
  async deleteAccount(accountId: string, confirmation: string): Promise<void> {
    // Verify confirmation
    // Schedule deletion (30 days)
    // Cancel subscription
    // Notify users
    // Log event
  }
  
  async getUsage(accountId: string): Promise<UsageSnapshot> {
    // Calculate current usage
    // Compare against limits
    // Return snapshot
  }
  
  async checkLimit(
    accountId: string,
    resourceType: ResourceType,
    incrementBy: number
  ): Promise<LimitCheckResult> {
    // Get current usage
    // Get limits
    // Calculate if allowed
    // Return result with message
  }
}
```

### 6.2 Subscription Service

```typescript
// backend/src/services/subscription-service.ts

export class SubscriptionService {
  async createSubscription(
    accountId: string,
    planId: string,
    paymentMethodId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<Subscription> {
    // Get plan
    // Create Stripe subscription
    // Create local subscription record
    // Update account
    // Log event
    // Send confirmation email
  }
  
  async updateSubscription(
    subscriptionId: string,
    planId: string
  ): Promise<Subscription> {
    // Get current subscription
    // Calculate proration
    // Update Stripe subscription
    // Update local record
    // Log event
    // Send confirmation email
  }
  
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<Subscription> {
    // Cancel Stripe subscription
    // Update local record
    // Schedule downgrade (if applicable)
    // Log event
    // Send confirmation email
  }
  
  async handleWebhook(event: Stripe.Event): Promise<void> {
    // Handle Stripe webhooks
    // Update subscription status
    // Send notifications
    // Log events
  }
}
```

### 6.3 Usage Tracking Service

```typescript
// backend/src/services/usage-service.ts

export class UsageService {
  async trackEvent(event: UsageEventData): Promise<UsageEvent> {
    // Create usage event
    // Update account counters
    // Check limits
    // Send alerts if needed
  }
  
  async getUsageHistory(
    accountId: string,
    filters: UsageFilters
  ): Promise<UsageEvent[]> {
    // Query usage events
    // Apply filters
    // Return paginated results
  }
  
  async resetMonthlyUsage(accountId: string): Promise<void> {
    // Reset AI request counter
    // Update usage_reset_date
    // Log event
  }
  
  async calculateUsage(accountId: string): Promise<UsageSnapshot> {
    // Count users
    // Count projects
    // Count datasets
    // Sum AI requests (current period)
    // Calculate storage
    // Get limits from plan
    // Calculate percentages
    // Return snapshot
  }
}
```

### 6.4 Team Management Service

```typescript
// backend/src/services/team-service.ts

export class TeamService {
  async inviteUser(
    accountId: string,
    email: string,
    role: 'admin' | 'member',
    invitedBy: string
  ): Promise<Invitation> {
    // Check user limit
    // Create invitation
    // Generate secure token
    // Send invitation email
    // Log event
  }
  
  async acceptInvitation(token: string, userId: string): Promise<void> {
    // Verify token
    // Check expiry
    // Add user to account
    // Mark invitation accepted
    // Send welcome email
    // Log event
  }
  
  async removeUser(accountId: string, userId: string): Promise<void> {
    // Check permissions (cannot remove owner)
    // Deactivate user
    // Reassign resources
    // Log event
    // Send notification
  }
  
  async updateUserRole(
    accountId: string,
    userId: string,
    newRole: 'admin' | 'member'
  ): Promise<void> {
    // Check permissions
    // Update role
    // Log event
    // Send notification
  }
}
```

---

## 7. Stripe Integration

### 7.1 Webhook Events

```typescript
// backend/src/webhooks/stripe.ts

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    
    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object);
      break;
    
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
  
  res.json({ received: true });
}
```

### 7.2 Subscription Syncing

```typescript
async function syncSubscriptionFromStripe(
  stripeSubscriptionId: string
): Promise<void> {
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  
  await supabase
    .from('subscriptions')
    .update({
      status: stripeSubscription.status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      updated_at: new Date(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId);
}
```

---

## 8. Email Notifications

### 8.1 Notification Types

1. **Welcome Email** - After signup
2. **Invitation Email** - When invited to team
3. **Trial Starting** - Trial begins
4. **Trial Ending Soon** - 3 days before trial ends
5. **Trial Ended** - Trial has ended
6. **Subscription Activated** - Payment successful
7. **Subscription Updated** - Plan changed
8. **Subscription Cancelled** - User cancelled
9. **Payment Failed** - Payment declined
10. **Payment Succeeded** - Payment processed
11. **Usage Warning** - At 80%, 90%, 95% limits
12. **Limit Reached** - At 100% limit
13. **Account Suspended** - After grace period
14. **Account Deletion Scheduled** - 30 days before deletion

### 8.2 Email Templates

```typescript
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  variables: Record<string, string>;
}

const emailTemplates: Record<string, EmailTemplate> = {
  welcome: {
    subject: 'Welcome to Bricker!',
    html: welcomeTemplate,
    text: welcomeTextTemplate,
    variables: { user_name, account_name }
  },
  
  trial_ending: {
    subject: 'Your trial ends in 3 days',
    html: trialEndingTemplate,
    text: trialEndingTextTemplate,
    variables: { user_name, trial_end_date, plan_name }
  },
  
  usage_warning: {
    subject: 'You\'re approaching your usage limit',
    html: usageWarningTemplate,
    text: usageWarningTextTemplate,
    variables: { user_name, resource_type, usage_percentage, limit }
  },
  
  // ... more templates
};
```

---

## 9. Security & Permissions

### 9.1 Row Level Security (RLS) Policies

```sql
-- Accounts: Users can only see accounts they're members of
CREATE POLICY accounts_select_policy ON accounts
  FOR SELECT
  USING (
    id IN (
      SELECT account_id FROM account_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Subscriptions: Same as accounts
CREATE POLICY subscriptions_select_policy ON subscriptions
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Usage Events: Can see own account's usage
CREATE POLICY usage_events_select_policy ON usage_events
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- API Tokens: Can only see own tokens
CREATE POLICY api_tokens_select_policy ON api_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Account Users: Can see members of own account
CREATE POLICY account_users_select_policy ON account_users
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

### 9.2 Permission Checks

```typescript
interface PermissionCheck {
  canManageAccount: boolean;
  canManageBilling: boolean;
  canManageTeam: boolean;
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canViewUsage: boolean;
  canCreateAPITokens: boolean;
}

async function getUserPermissions(
  userId: string,
  accountId: string
): Promise<PermissionCheck> {
  const member = await supabase
    .from('account_users')
    .select('role')
    .eq('account_id', accountId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (!member) throw new Error('User not member of account');
  
  const isOwner = member.role === 'owner';
  const isAdmin = member.role === 'admin' || isOwner;
  
  return {
    canManageAccount: isOwner,
    canManageBilling: isOwner,
    canManageTeam: isAdmin,
    canInviteUsers: isAdmin,
    canRemoveUsers: isAdmin,
    canViewUsage: true, // All members
    canCreateAPITokens: true, // All members
  };
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
describe('AccountService', () => {
  describe('createAccount', () => {
    it('should create individual account with free plan', async () => {
      const account = await accountService.createAccount({
        name: 'John Doe',
        account_type: 'individual',
        email: 'john@example.com',
      });
      
      expect(account.account_type).toBe('individual');
      expect(account.subscription_tier).toBe('free');
      expect(account.max_users).toBe(1);
    });
    
    it('should create organization account', async () => {
      const account = await accountService.createAccount({
        name: 'Acme Corp',
        account_type: 'organization',
        email: 'admin@acme.com',
      });
      
      expect(account.account_type).toBe('organization');
    });
  });
  
  describe('checkLimit', () => {
    it('should allow resource creation within limit', async () => {
      const result = await accountService.checkLimit(
        accountId,
        'projects',
        1
      );
      
      expect(result.allowed).toBe(true);
    });
    
    it('should block resource creation at limit', async () => {
      // Set account to limit
      await setAccountProjectCount(accountId, 5);
      
      const result = await accountService.checkLimit(
        accountId,
        'projects',
        1
      );
      
      expect(result.allowed).toBe(false);
      expect(result.requires_upgrade).toBe(true);
    });
  });
});

describe('UsageService', () => {
  describe('trackEvent', () => {
    it('should create usage event and update counter', async () => {
      await usageService.trackEvent({
        account_id: accountId,
        user_id: userId,
        event_type: 'ai_request',
        quantity: 1,
      });
      
      const usage = await usageService.getUsage(accountId);
      expect(usage.ai_requests.current).toBeGreaterThan(0);
    });
  });
  
  describe('resetMonthlyUsage', () => {
    it('should reset AI request counter', async () => {
      // Track some AI requests
      await usageService.trackEvent({
        account_id: accountId,
        event_type: 'ai_request',
        quantity: 50,
      });
      
      // Reset
      await usageService.resetMonthlyUsage(accountId);
      
      const usage = await usageService.getUsage(accountId);
      expect(usage.ai_requests.current).toBe(0);
    });
  });
});
```

### 10.2 Integration Tests

```typescript
describe('Subscription Flow', () => {
  it('should complete upgrade flow', async () => {
    // 1. Create account
    const account = await createTestAccount();
    
    // 2. Select plan
    const proPlan = await getProPlan();
    
    // 3. Add payment method
    const paymentMethod = await createTestPaymentMethod();
    
    // 4. Create subscription
    const subscription = await subscriptionService.createSubscription(
      account.id,
      proPlan.id,
      paymentMethod.id,
      'monthly'
    );
    
    expect(subscription.status).toBe('active');
    
    // 5. Verify account updated
    const updatedAccount = await accountService.getAccount(account.id);
    expect(updatedAccount.subscription_tier).toBe('pro');
    expect(updatedAccount.max_projects).toBe(50);
  });
  
  it('should handle subscription cancellation', async () => {
    const account = await createAccountWithSubscription();
    
    await subscriptionService.cancelSubscription(
      account.current_subscription_id,
      true // cancel at period end
    );
    
    const subscription = await getSubscription(account.current_subscription_id);
    expect(subscription.cancel_at_period_end).toBe(true);
  });
});

describe('Team Management', () => {
  it('should complete invitation flow', async () => {
    const account = await createTestAccount();
    const admin = await createTestUser();
    await addUserToAccount(account.id, admin.id, 'admin');
    
    // Send invitation
    const invitation = await teamService.inviteUser(
      account.id,
      'newuser@example.com',
      'member',
      admin.id
    );
    
    expect(invitation.status).toBe('pending');
    expect(invitation.email).toBe('newuser@example.com');
    
    // Accept invitation
    const newUser = await createTestUser('newuser@example.com');
    await teamService.acceptInvitation(invitation.token, newUser.id);
    
    // Verify user added
    const members = await getAccountMembers(account.id);
    expect(members.some(m => m.user_id === newUser.id)).toBe(true);
  });
});
```

### 10.3 E2E Tests

```typescript
describe('Subscription Management E2E', () => {
  it('should allow user to upgrade from free to pro', async () => {
    // 1. Sign up
    await page.goto('/signup');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to settings
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="account-settings"]');
    await page.click('[data-testid="subscription-tab"]');
    
    // 3. Select Pro plan
    await page.click('[data-testid="upgrade-button"]');
    await page.click('[data-testid="plan-pro"]');
    await page.click('[data-testid="select-plan"]');
    
    // 4. Enter payment details
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.click('[data-testid="submit-payment"]');
    
    // 5. Verify success
    await page.waitForSelector('[data-testid="upgrade-success"]');
    await expect(page.locator('[data-testid="current-plan"]')).toHaveText('Pro');
  });
});
```
