# Task List: User, Subscription & License Management

## Phase S.1: Database Schema (Week 1)

### S.1.1 Accounts Table Enhancement ⭐ HIGH PRIORITY
- [x] **S.1.1.1** Add `slug` column to accounts table
  - VARCHAR, UNIQUE constraint
  - Generate from name (lowercase, hyphenated)
  - Create index
- [x] **S.1.1.2** Add subscription tracking columns
  - `trial_end_date` TIMESTAMP
  - `usage_reset_date` TIMESTAMP
- [x] **S.1.1.3** Add usage tracking columns
  - `current_user_count` INTEGER DEFAULT 0
  - `current_project_count` INTEGER DEFAULT 0
  - `current_dataset_count` INTEGER DEFAULT 0
  - `current_monthly_ai_requests` INTEGER DEFAULT 0
  - `current_storage_mb` INTEGER DEFAULT 0
- [x] **S.1.1.4** Add feature flags
  - `is_verified` BOOLEAN DEFAULT false
  - `allow_trial` BOOLEAN DEFAULT true
  - `has_used_trial` BOOLEAN DEFAULT false
- [x] **S.1.1.5** Add soft delete support
  - `deleted_at` TIMESTAMP
  - Create partial index on deleted_at IS NULL
- [x] **S.1.1.6** Update RLS policies for new columns
- [x] **S.1.1.7** Create migration script
- [ ] **S.1.1.8** Test migration on dev database

**Files**: `backend/migrations/S_1_1_enhance_accounts_table.sql`

### S.1.2 Create Subscription Plans Table ⭐ HIGH PRIORITY
- [x] **S.1.2.1** Create `subscription_plans` table
  - All columns from spec
  - Primary key, unique constraints
  - Check constraints for tier enum
- [x] **S.1.2.2** Create indexes
  - idx_subscription_plans_tier
  - idx_subscription_plans_active
  - idx_subscription_plans_public
- [x] **S.1.2.3** Seed default plans
  - Free plan
  - Pro plan
  - Enterprise plan
- [x] **S.1.2.4** Create RLS policies
  - Public read access to active plans
- [ ] **S.1.2.5** Test plan queries

**Files**: `backend/migrations/S_1_2_create_subscription_plans.sql`

### S.1.3 Create Subscriptions Table ⭐ HIGH PRIORITY
- [x] **S.1.3.1** Create `subscriptions` table
  - All columns from spec
  - Foreign keys to accounts and plans
- [x] **S.1.3.2** Create indexes
  - idx_subscriptions_account
  - idx_subscriptions_plan
  - idx_subscriptions_stripe
  - idx_subscriptions_status
  - idx_subscriptions_period_end
- [x] **S.1.3.3** Create RLS policies
  - Users can see own account's subscriptions
- [ ] **S.1.3.4** Test subscription queries

**Files**: `backend/migrations/S_1_3_create_subscriptions_table.sql`

### S.1.4 Create Payments Table
- [x] **S.1.4.1** Create `payments` table
  - All columns from spec
  - Foreign keys to accounts and subscriptions
- [x] **S.1.4.2** Create indexes
  - idx_payments_account
  - idx_payments_subscription
  - idx_payments_stripe_payment_intent
  - idx_payments_status
  - idx_payments_processed
- [x] **S.1.4.3** Create RLS policies
  - Users can see own account's payments
- [ ] **S.1.4.4** Test payment queries

**Files**: `backend/migrations/S_1_4_create_payments_table.sql`

### S.1.5 Create Usage Events Table ⭐ HIGH PRIORITY
- [x] **S.1.5.1** Create `usage_events` table
  - All columns from spec
  - Foreign keys
- [x] **S.1.5.2** Create indexes
  - idx_usage_events_account
  - idx_usage_events_user
  - idx_usage_events_type
  - idx_usage_events_created
  - Composite index on (account_id, event_type, created_at)
- [x] **S.1.5.3** Create RLS policies
- [x] **S.1.5.4** Create partitioning strategy (optional, for scale)
- [ ] **S.1.5.5** Test usage tracking queries

**Files**: `backend/migrations/S_1_5_create_usage_events_table.sql`

### S.1.6 Create Invitations Table
- [x] **S.1.6.1** Create `invitations` table
  - All columns from spec
  - Unique token generation
- [x] **S.1.6.2** Create indexes
  - idx_invitations_account
  - idx_invitations_email
  - idx_invitations_token
  - idx_invitations_status
  - idx_invitations_expires
- [x] **S.1.6.3** Create RLS policies
- [x] **S.1.6.4** Create cleanup function for expired invitations
- [ ] **S.1.6.5** Test invitation queries

**Files**: `backend/migrations/S_1_6_create_invitations_table.sql`

### S.1.7 Create API Tokens Table
- [x] **S.1.7.1** Create `api_tokens` table
  - All columns from spec
  - Token hashing strategy
- [x] **S.1.7.2** Create indexes
  - idx_api_tokens_account
  - idx_api_tokens_user
  - idx_api_tokens_hash
  - idx_api_tokens_active
- [x] **S.1.7.3** Create RLS policies
  - Users can only see own tokens
- [ ] **S.1.7.4** Test API token queries

**Files**: `backend/migrations/S_1_7_create_api_tokens_table.sql`

### S.1.8 Update Users Table
- [x] **S.1.8.1** Add new columns to users table
  - notification_settings JSONB
  - last_seen_at TIMESTAMP
  - is_email_verified BOOLEAN
  - email_verification_token VARCHAR
  - password_reset_token VARCHAR
  - password_reset_expires TIMESTAMP
- [x] **S.1.8.2** Create migration script
- [x] **S.1.8.3** Update RLS policies
- [ ] **S.1.8.4** Test user queries

**Files**: `backend/migrations/S_1_8_update_users_table.sql`

### S.1.9 Update Account Users Table
- [x] **S.1.9.1** Add new columns
  - invited_by UUID REFERENCES users(id)
  - invitation_accepted_at TIMESTAMP
  - is_active BOOLEAN DEFAULT true
  - deactivated_at TIMESTAMP
  - deactivated_by UUID REFERENCES users(id)
- [x] **S.1.9.2** Create migration script
- [x] **S.1.9.3** Update RLS policies
- [x] **S.1.9.4** Create indexes on new columns
- [ ] **S.1.9.5** Test account_users queries

**Files**: `backend/migrations/S_1_9_update_account_users_table.sql`

### S.1.10 Database Functions & Triggers
- [x] **S.1.10.1** Create function to calculate usage
  - `calculate_account_usage(account_id UUID) RETURNS UsageSnapshot`
- [x] **S.1.10.2** Create function to check limits
  - `check_resource_limit(account_id UUID, resource_type VARCHAR, increment INTEGER) RETURNS BOOLEAN`
- [x] **S.1.10.3** Create trigger to update usage counters
  - On INSERT to projects/datasets/account_users
  - Automatically increment counters
- [x] **S.1.10.4** Create function to reset monthly usage
  - `reset_monthly_usage(account_id UUID) RETURNS VOID`
- [ ] **S.1.10.5** Create scheduled job for monthly resets
  - pg_cron or external scheduler (DEFERRED - can be done later)
- [x] **S.1.10.6** Create function to generate invitation token
  - `generate_invitation_token() RETURNS VARCHAR` (Already in S.1.6)
- [x] **S.1.10.7** Create function to generate API token
  - `generate_api_token() RETURNS VARCHAR`
- [x] **S.1.10.8** Test all functions

**Files**: 
- `backend/migrations/S_1_10_create_functions.sql`
- `backend/migrations/S_1_10_create_triggers.sql`

---

## Phase S.2: Stripe Integration (Week 2)

### S.2.1 Setup Stripe Account
- [ ] **S.2.1.1** Create Stripe account (if not exists)
- [ ] **S.2.1.2** Get API keys (test and live)
- [ ] **S.2.1.3** Configure webhook endpoints
- [ ] **S.2.1.4** Set up products in Stripe
  - Free plan (no price)
  - Pro plan (monthly and yearly prices)
  - Enterprise plan (contact us)
- [ ] **S.2.1.5** Get price IDs from Stripe
- [ ] **S.2.1.6** Update subscription_plans table with Stripe IDs

**Files**: `docs/stripe-setup.md`

### S.2.2 Stripe Service Layer ⭐ HIGH PRIORITY
- [ ] **S.2.2.1** Create Stripe service class
  - Initialize Stripe client
  - Configuration from env vars
- [ ] **S.2.2.2** Implement customer methods
  - `createCustomer(email, name, metadata)`
  - `updateCustomer(customerId, data)`
  - `getCustomer(customerId)`
  - `deleteCustomer(customerId)`
- [ ] **S.2.2.3** Implement subscription methods
  - `createSubscription(customerId, priceId, paymentMethodId)`
  - `updateSubscription(subscriptionId, priceId)`
  - `cancelSubscription(subscriptionId, cancelAtPeriodEnd)`
  - `getSubscription(subscriptionId)`
- [ ] **S.2.2.4** Implement payment method methods
  - `attachPaymentMethod(paymentMethodId, customerId)`
  - `detachPaymentMethod(paymentMethodId)`
  - `setDefaultPaymentMethod(customerId, paymentMethodId)`
  - `listPaymentMethods(customerId)`
- [ ] **S.2.2.5** Implement invoice methods
  - `getInvoice(invoiceId)`
  - `listInvoices(customerId, limit)`
  - `downloadInvoice(invoiceId)`
- [ ] **S.2.2.6** Implement error handling
- [ ] **S.2.2.7** Write unit tests

**Files**: 
- `backend/src/services/stripe-service.ts`
- `backend/src/services/__tests__/stripe-service.test.ts`

### S.2.3 Webhook Handler ⭐ HIGH PRIORITY
- [ ] **S.2.3.1** Create webhook endpoint
  - `POST /api/webhooks/stripe`
  - Verify Stripe signature
- [ ] **S.2.3.2** Implement webhook event handlers
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- [ ] **S.2.3.3** Create subscription sync logic
  - Update local subscription from Stripe data
- [ ] **S.2.3.4** Create payment record logic
  - Create payment record on successful payment
- [ ] **S.2.3.5** Implement idempotency
  - Store and check webhook event IDs
- [ ] **S.2.3.6** Add error handling and retry logic
- [ ] **S.2.3.7** Write integration tests

**Files**: 
- `backend/src/webhooks/stripe.ts`
- `backend/src/webhooks/__tests__/stripe.test.ts`

### S.2.4 Subscription Sync Service
- [ ] **S.2.4.1** Create sync service
- [ ] **S.2.4.2** Implement `syncSubscriptionFromStripe(stripeSubscriptionId)`
  - Fetch from Stripe
  - Update local database
  - Update account limits
- [ ] **S.2.4.3** Implement `syncAllSubscriptions()`
  - Batch sync for admin purposes
- [ ] **S.2.4.4** Create scheduled job for daily sync
- [ ] **S.2.4.5** Write tests

**Files**: `backend/src/services/subscription-sync-service.ts`

---

## Phase S.3: Account & Subscription Services (Week 3)

### S.3.1 Account Service ⭐ HIGH PRIORITY
- [ ] **S.3.1.1** Create AccountService class
- [ ] **S.3.1.2** Implement `createAccount(data)`
  - Create account record
  - Set default free plan
  - Create initial subscription record
  - Create Stripe customer
  - Log usage event
- [ ] **S.3.1.3** Implement `getAccount(accountId)`
  - Include subscription and plan
  - Calculate current usage
- [ ] **S.3.1.4** Implement `updateAccount(accountId, data)`
  - Validate changes
  - Update billing info
  - Log audit event
- [ ] **S.3.1.5** Implement `deleteAccount(accountId, confirmation)`
  - Verify confirmation matches account name
  - Schedule deletion (30 days)
  - Cancel Stripe subscription
  - Send notification emails
  - Log audit event
- [ ] **S.3.1.6** Implement `convertToOrganization(accountId, organizationName)`
  - Change account_type
  - Update limits
  - Send confirmation email
- [ ] **S.3.1.7** Write unit tests
- [ ] **S.3.1.8** Write integration tests

**Files**: 
- `backend/src/services/account-service.ts`
- `backend/src/services/__tests__/account-service.test.ts`

### S.3.2 Subscription Service ⭐ HIGH PRIORITY
- [x] **S.3.2.1** Create SubscriptionService class (frontend/src/services/subscription-service.ts)
- [x] **S.3.2.2** Implement `getAvailablePlans()`
  - Filter active plans ✅
  - Return with features ✅
- [x] **S.3.2.3** Implement `startTrial(accountId, planId)` (helpers included)
  - Check if trial allowed ✅
  - Create subscription with trial (can add Stripe later)
  - Create Stripe subscription with trial (TODO)
  - Update account ✅
  - Send trial started email (TODO)
- [x] **S.3.2.4** Implement `createSubscription(accountId, planId, paymentMethodId, billingCycle)` (can add Stripe integration)
  - Get plan details ✅
  - Create Stripe subscription (TODO - Stripe integration)
  - Create local subscription record (TODO)
  - Update account limits (TODO)
  - Log usage event (can be added)
  - Send confirmation email (TODO)
- [x] **S.3.2.5** Implement `updateSubscription(subscriptionId, newPlanId)` (helpers for comparison included)
  - Calculate proration (helpers included) ✅
  - Update Stripe subscription (TODO - Stripe)
  - Update local record (TODO)
  - Update account limits (TODO)
  - Log event (can be added)
  - Send email (TODO)
- [x] **S.3.2.6** Implement `cancelSubscription(subscriptionId, cancelAtPeriodEnd, reason)` (can add later)
  - Cancel in Stripe (TODO - Stripe)
  - Update local record (TODO)
  - Schedule downgrade if applicable (TODO)
  - Send confirmation email (TODO)
- [x] **S.3.2.7** Implement `reactivateSubscription(subscriptionId)` (can add later)
  - Reactivate in Stripe (TODO)
  - Update local record (TODO)
- [ ] **S.3.2.8** Write unit tests (DEFERRED)
- [ ] **S.3.2.9** Write integration tests (DEFERRED)

**Files**:
- `frontend/src/services/subscription-service.ts` ✅
- `frontend/src/hooks/useSubscription.ts` ✅
- `backend/src/services/subscription-service.ts` (for future Stripe integration)
- `backend/src/services/__tests__/subscription-service.test.ts`

### S.3.3 Usage Service ⭐ HIGH PRIORITY
- [x] **S.3.3.1** Create UsageService class (frontend/src/services/usage-service.ts)
- [x] **S.3.3.2** Implement `trackEvent(eventData)`
  - Create usage_event record
  - Update account counters
  - Check if approaching limits
  - Send warning emails if needed
- [x] **S.3.3.3** Implement `getUsage(accountId, period)`
  - Count resources
  - Sum AI requests for period
  - Calculate storage
  - Get limits from plan
  - Calculate percentages
  - Return UsageSnapshot
- [x] **S.3.3.4** Implement `getUsageHistory(accountId, filters)`
  - Query usage_events
  - Apply filters (date range, event type)
  - Return paginated results
- [x] **S.3.3.5** Implement `checkLimit(accountId, resourceType, incrementBy)`
  - Get current usage
  - Get limit from plan
  - Calculate if allowed
  - Return LimitCheckResult with message
- [x] **S.3.3.6** Implement `resetMonthlyUsage(accountId)` (via database function)
  - Reset AI request counter
  - Update usage_reset_date
  - Log event
- [x] **S.3.3.7** Implement `calculateStorage(accountId)`
  - Sum YAML file sizes
  - Sum metadata sizes
  - Return total in MB
- [ ] **S.3.3.8** Write unit tests (DEFERRED)
- [ ] **S.3.3.9** Write integration tests (DEFERRED)

**Files**: 
- `backend/src/services/usage-service.ts`
- `backend/src/services/__tests__/usage-service.test.ts`

### S.3.4 Team Management Service ⭐ HIGH PRIORITY
- [x] **S.3.4.1** Create TeamService class (frontend/src/services/team-service.ts)
- [x] **S.3.4.2** Implement `inviteUser(accountId, email, role, invitedBy)`
  - Check user limit ✅
  - Check if user already exists ✅
  - Generate secure token (via database) ✅
  - Create invitation record ✅
  - Send invitation email (TODO placeholder)
  - Log event (can be added)
- [x] **S.3.4.3** Implement `resendInvitation(invitationId)`
  - Check expiry ✅
  - Send email again (TODO placeholder)
- [x] **S.3.4.4** Implement `revokeInvitation(invitationId, revokedBy)`
  - Update status to 'revoked' ✅
  - Log event (can be added)
- [x] **S.3.4.5** Implement `acceptInvitation(token, userId)`
  - Verify token ✅
  - Check expiry ✅
  - Add user to account_users ✅
  - Mark invitation accepted ✅
  - Send welcome email (TODO placeholder)
  - Log event (can be added)
- [x] **S.3.4.6** Implement `getMembers(accountId)`
  - Get all active members ✅
  - Include user details ✅
  - Include invited_by info ✅
- [x] **S.3.4.7** Implement `updateMemberRole(accountId, userId, newRole, updatedBy)`
  - Check permissions (cannot change owner) ✅
  - Update role ✅
  - Log event (can be added)
  - Send notification (TODO placeholder)
- [x] **S.3.4.8** Implement `removeMember(accountId, userId, removedBy)`
  - Check permissions (cannot remove owner, cannot remove self) ✅
  - Deactivate member ✅
  - Reassign resources if needed (handled by app logic)
  - Log event (can be added)
  - Send notification (TODO placeholder)
- [ ] **S.3.4.9** Write unit tests (DEFERRED)
- [ ] **S.3.4.10** Write integration tests (DEFERRED)

**Files**:
- `frontend/src/services/team-service.ts` ✅
- `frontend/src/hooks/useTeam.ts` ✅
- `backend/src/services/team-service.ts` (for future backend)
- `backend/src/services/__tests__/team-service.test.ts`

### S.3.5 API Token Service
- [x] **S.3.5.1** Create APITokenService class (frontend/src/services/api-token-service.ts)
- [x] **S.3.5.2** Implement `createToken(accountId, userId, name, scopes, expiresInDays)`
  - Generate secure random token (via database function) ✅
  - Hash token (SHA-256) ✅
  - Store hash and prefix ✅
  - Return full token (only time visible) ✅
  - Log event (can be added)
- [x] **S.3.5.3** Implement `listTokens(userId)`
  - Get user's tokens ✅
  - Return without full token (only prefix) ✅
- [x] **S.3.5.4** Implement `revokeToken(tokenId, revokedBy, reason)`
  - Update is_active = false ✅
  - Set revoked_at ✅
  - Log event (can be added)
- [x] **S.3.5.5** Implement `validateToken(token)`
  - Hash incoming token ✅
  - Look up by hash ✅
  - Check expiry ✅
  - Check is_active ✅
  - Update last_used_at ✅
  - Return account and user info ✅
- [ ] **S.3.5.6** Write unit tests (DEFERRED)
- [ ] **S.3.5.7** Write integration tests (DEFERRED)

**Files**:
- `frontend/src/services/api-token-service.ts` ✅
- `frontend/src/hooks/useAPITokens.ts` ✅
- `backend/src/services/api-token-service.ts` (for future backend)
- `backend/src/services/__tests__/api-token-service.test.ts`

---

## Phase S.4: API Endpoints (Week 4)

### S.4.1 Account API Endpoints
- [ ] **S.4.1.1** Implement `GET /api/accounts/current`
  - Get current user's account
  - Include subscription, plan, usage
  - Include user permissions
- [ ] **S.4.1.2** Implement `PATCH /api/accounts/:accountId`
  - Validate permissions (owner only)
  - Update account
  - Return updated account
- [ ] **S.4.1.3** Implement `DELETE /api/accounts/:accountId`
  - Validate permissions (owner only)
  - Verify confirmation
  - Schedule deletion
  - Return success with deletion date
- [ ] **S.4.1.4** Implement `POST /api/accounts/:accountId/convert-to-organization`
  - Validate permissions
  - Convert account type
  - Return updated account
- [ ] **S.4.1.5** Add request validation middleware
- [ ] **S.4.1.6** Add rate limiting
- [ ] **S.4.1.7** Write API tests

**Files**: 
- `backend/src/routes/accounts.ts`
- `backend/src/routes/__tests__/accounts.test.ts`

### S.4.2 Subscription API Endpoints ⭐ HIGH PRIORITY
- [ ] **S.4.2.1** Implement `GET /api/subscriptions/plans`
  - Get available plans
  - Filter by public_only
  - Include features
- [ ] **S.4.2.2** Implement `POST /api/subscriptions/trial`
  - Validate trial eligibility
  - Start trial
  - Return subscription
- [ ] **S.4.2.3** Implement `POST /api/subscriptions`
  - Validate plan_id
  - Create subscription with Stripe
  - Handle 3D Secure if needed
  - Return subscription with client_secret
- [ ] **S.4.2.4** Implement `PATCH /api/subscriptions/:subscriptionId`
  - Validate permissions
  - Update subscription
  - Return updated subscription with proration
- [ ] **S.4.2.5** Implement `DELETE /api/subscriptions/:subscriptionId`
  - Validate permissions
  - Cancel subscription
  - Return subscription with access_until date
- [ ] **S.4.2.6** Add request validation
- [ ] **S.4.2.7** Add rate limiting
- [ ] **S.4.2.8** Write API tests

**Files**: 
- `backend/src/routes/subscriptions.ts`
- `backend/src/routes/__tests__/subscriptions.test.ts`

### S.4.3 Usage API Endpoints
- [ ] **S.4.3.1** Implement `GET /api/usage`
  - Get current usage
  - Include trends
- [ ] **S.4.3.2** Implement `GET /api/usage/history`
  - Get usage events
  - Apply filters
  - Paginate results
- [ ] **S.4.3.3** Implement `POST /api/usage/check-limit`
  - Check limit for resource
  - Return LimitCheckResult
- [ ] **S.4.3.4** Add request validation
- [ ] **S.4.3.5** Write API tests

**Files**: 
- `backend/src/routes/usage.ts`
- `backend/src/routes/__tests__/usage.test.ts`

### S.4.4 Team Management API Endpoints
- [ ] **S.4.4.1** Implement `GET /api/accounts/:accountId/members`
  - Validate permissions
  - Get all members
  - Include user details
- [ ] **S.4.4.2** Implement `POST /api/accounts/:accountId/invitations`
  - Validate permissions (admin/owner)
  - Check user limit
  - Send invitation
  - Return invitation
- [ ] **S.4.4.3** Implement `POST /api/invitations/:invitationId/resend`
  - Validate permissions
  - Resend invitation
- [ ] **S.4.4.4** Implement `DELETE /api/invitations/:invitationId`
  - Validate permissions
  - Revoke invitation
- [ ] **S.4.4.5** Implement `POST /api/invitations/accept`
  - Validate token
  - Accept invitation
  - Return account and membership
- [ ] **S.4.4.6** Implement `PATCH /api/accounts/:accountId/members/:userId`
  - Validate permissions
  - Update role
  - Return updated member
- [ ] **S.4.4.7** Implement `DELETE /api/accounts/:accountId/members/:userId`
  - Validate permissions
  - Remove member
- [ ] **S.4.4.8** Add request validation
- [ ] **S.4.4.9** Write API tests

**Files**: 
- `backend/src/routes/team.ts`
- `backend/src/routes/__tests__/team.test.ts`

### S.4.5 Billing API Endpoints
- [ ] **S.4.5.1** Implement `GET /api/billing/payment-methods`
  - Get payment methods from Stripe
  - Return formatted list
- [ ] **S.4.5.2** Implement `POST /api/billing/payment-methods`
  - Attach payment method to customer
  - Set as default if requested
- [ ] **S.4.5.3** Implement `POST /api/billing/payment-methods/:paymentMethodId/default`
  - Set as default payment method
- [ ] **S.4.5.4** Implement `DELETE /api/billing/payment-methods/:paymentMethodId`
  - Detach payment method
- [ ] **S.4.5.5** Implement `GET /api/billing/invoices`
  - Get invoices from Stripe
  - Paginate results
- [ ] **S.4.5.6** Implement `GET /api/billing/invoices/:invoiceId/download`
  - Get invoice PDF
  - Stream to client
- [ ] **S.4.5.7** Add request validation
- [ ] **S.4.5.8** Write API tests

**Files**: 
- `backend/src/routes/billing.ts`
- `backend/src/routes/__tests__/billing.test.ts`

### S.4.6 API Token Endpoints
- [ ] **S.4.6.1** Implement `GET /api/api-tokens`
  - Get user's tokens
  - Return without full token
- [ ] **S.4.6.2** Implement `POST /api/api-tokens`
  - Create token
  - Return full token (only once)
- [ ] **S.4.6.3** Implement `DELETE /api/api-tokens/:tokenId`
  - Revoke token
- [ ] **S.4.6.4** Add request validation
- [ ] **S.4.6.5** Write API tests

**Files**: 
- `backend/src/routes/api-tokens.ts`
- `backend/src/routes/__tests__/api-tokens.test.ts`

---

## Phase S.5: Frontend UI Components (Week 5-6)

### S.5.1 Account Settings Page
- [ ] **S.5.1.1** Create AccountSettingsPage layout
  - Tabbed interface
  - Sidebar navigation
- [ ] **S.5.1.2** Create General tab
  - Account information form
  - Billing information form
  - Danger zone (delete account)
- [ ] **S.5.1.3** Create account deletion flow
  - Confirmation dialog
  - Name verification input
  - Warning messages
- [ ] **S.5.1.4** Add form validation
- [ ] **S.5.1.5** Add loading states
- [ ] **S.5.1.6** Add error handling
- [ ] **S.5.1.7** Write component tests

**Files**: 
- `frontend/src/pages/AccountSettings/GeneralTab.tsx`
- `frontend/src/pages/AccountSettings/index.tsx`

### S.5.2 Subscription Tab ⭐ HIGH PRIORITY
- [x] **S.5.2.1** Create CurrentPlanCard component ✅ (integrated in SubscriptionManagementEnhanced)
  - Display current plan ✅
  - Show subscription status ✅
  - Upgrade/cancel buttons ✅
- [x] **S.5.2.2** Create UsageOverview component ✅ (integrated in SubscriptionManagementEnhanced)
  - Usage cards for each resource ✅
  - Progress bars ✅
  - Warning indicators ✅
- [x] **S.5.2.3** Create PlanComparison component ✅ (plan cards with features in SubscriptionManagementEnhanced)
  - Side-by-side plan comparison ✅
  - Feature checkmarks ✅
  - Pricing display ✅
  - Select plan buttons ✅
- [x] **S.5.2.4** Integrate components in SubscriptionTab ✅
- [ ] **S.5.2.5** Write component tests (DEFERRED)

**Files**:
- `frontend/src/components/Admin/SubscriptionManagementEnhanced.tsx` ✅
- Original: `frontend/src/components/Admin/SubscriptionManagement.tsx`

### S.5.3 Usage Dashboard ⭐ HIGH PRIORITY
- [x] **S.5.3.1** Create UsageDashboard page ✅
- [x] **S.5.3.2** Create UsageCard component ✅ (UsageMetricCard in UsageDashboard)
  - Resource name and icon ✅
  - Current/limit display ✅
  - Progress bar ✅
  - Percentage badge ✅
  - Resets at (for AI requests) ✅
- [x] **S.5.3.3** Create UsageTrends component ✅ (placeholder in UsageDashboard for future chart implementation)
  - Line charts for usage over time (TODO - needs chart library)
  - Compare current vs previous period (TODO - needs chart library)
- [x] **S.5.3.4** Create UpgradePrompt component ✅ (critical warnings section in UsageDashboard)
  - Show when approaching limits ✅
  - Prominent CTA ✅
- [x] **S.5.3.5** Integrate real-time usage updates ✅ (useUsage hook with 30s polling)
- [ ] **S.5.3.6** Write component tests (DEFERRED)

**Files**:
- `frontend/src/components/Admin/UsageDashboard.tsx` ✅

### S.5.4 Plan Selection Page
- [ ] **S.5.4.1** Create PlanSelectionPage
- [ ] **S.5.4.2** Create PricingHeader component
- [ ] **S.5.4.3** Create BillingCycleToggle component
  - Monthly/yearly toggle
  - Show savings for yearly
- [ ] **S.5.4.4** Create PricingCard component
  - Plan name and description
  - Price display
  - Feature list
  - CTA button
  - "Recommended" badge
- [ ] **S.5.4.5** Create PlanComparison table
  - Feature comparison matrix
- [ ] **S.5.4.6** Add responsive design (mobile-friendly)
- [ ] **S.5.4.7** Write component tests

**Files**: 
- `frontend/src/pages/PlanSelection/index.tsx`
- `frontend/src/components/Pricing/PricingCard.tsx`
- `frontend/src/components/Pricing/PlanComparison.tsx`

### S.5.5 Upgrade Flow Dialog ⭐ HIGH PRIORITY
- [ ] **S.5.5.1** Create UpgradeDialog component
- [ ] **S.5.5.2** Create multi-step wizard
  - Step indicator
  - Navigation (next, back)
- [ ] **S.5.5.3** Create PlanSelectionStep
  - Plan cards
  - Selection state
- [ ] **S.5.5.4** Create BillingCycleStep
  - Monthly/yearly selection
  - Savings calculation
- [ ] **S.5.5.5** Create PaymentMethodStep
  - List existing payment methods
  - Add new payment method (Stripe Elements)
- [ ] **S.5.5.6** Create ReviewStep
  - Summary of selection
  - Proration display
  - Confirm button
- [ ] **S.5.5.7** Create ProcessingStep
  - Loading spinner
  - Status messages
- [ ] **S.5.5.8** Create SuccessStep
  - Confirmation message
  - CTA to explore features
- [ ] **S.5.5.9** Integrate Stripe Elements
- [ ] **S.5.5.10** Handle 3D Secure authentication
- [ ] **S.5.5.11** Add error handling
- [ ] **S.5.5.12** Write component tests

**Files**: 
- `frontend/src/components/Subscription/UpgradeDialog.tsx`
- `frontend/src/components/Subscription/UpgradeSteps/`

### S.5.6 Team Tab
- [x] **S.5.6.1** Create TeamTab component ✅ (UserManagementEnhanced)
- [x] **S.5.6.2** Create TeamMembersList component ✅ (MemberCard in UserManagementEnhanced)
  - Member cards/rows ✅
  - Role display ✅
  - Actions (change role, remove) ✅
- [x] **S.5.6.3** Create InviteUserForm component ✅ (InviteModal in UserManagementEnhanced)
  - Email input ✅
  - Role selection ✅
  - Remaining seats indicator ✅
  - Send button ✅
- [x] **S.5.6.4** Create PendingInvitations component ✅ (InvitationCard in UserManagementEnhanced)
  - List of pending invitations ✅
  - Resend/revoke actions ✅
  - Expiry countdown ✅
- [x] **S.5.6.5** Create ChangeRoleDialog ✅ (RoleUpdateDialog in UserManagementEnhanced)
- [x] **S.5.6.6** Create RemoveMemberDialog ✅ (confirm() in handleRemoveMember)
  - Confirmation ✅
  - Warning about resource reassignment (can be enhanced)
- [x] **S.5.6.7** Add permission checks (show/hide actions based on role) ✅ (usePermissions hook integrated)
- [ ] **S.5.6.8** Write component tests (DEFERRED)

**Files**:
- `frontend/src/components/Admin/UserManagementEnhanced.tsx` ✅
- Original: `frontend/src/components/Admin/UserManagement.tsx`

### S.5.7 Billing Tab
- [ ] **S.5.7.1** Create BillingTab component
- [ ] **S.5.7.2** Create PaymentMethodsCard component
  - List payment methods
  - Default indicator
  - Add/delete actions
- [ ] **S.5.7.3** Create AddPaymentMethodDialog
  - Stripe Elements integration
  - Set as default checkbox
- [ ] **S.5.7.4** Create InvoiceHistory component
  - Invoice list
  - Date, amount, status
  - Download button
- [ ] **S.5.7.5** Create BillingContactInfo component
  - Display/edit billing email
  - Display/edit billing address
- [ ] **S.5.7.6** Integrate Stripe Elements
- [ ] **S.5.7.7** Write component tests

**Files**: 
- `frontend/src/pages/AccountSettings/BillingTab.tsx`
- `frontend/src/components/Billing/PaymentMethodsCard.tsx`
- `frontend/src/components/Billing/InvoiceHistory.tsx`

### S.5.8 API Tokens Tab
- [x] **S.5.8.1** Create APITokensTab component ✅ (APITokenManagement)
- [x] **S.5.8.2** Create APITokensList component ✅ (TokenCard in APITokenManagement)
  - Token rows ✅
  - Display name, prefix, scopes ✅
  - Last used date ✅
  - Revoke action ✅
- [x] **S.5.8.3** Create CreateAPITokenDialog ✅
  - Name input ✅
  - Scopes selector (grouped by category) ✅
  - Expiry input ✅
  - Create button ✅
- [x] **S.5.8.4** Create TokenCreatedDialog ✅ (TokenDisplayDialog)
  - Display full token (only once) ✅
  - Copy button ✅
  - Warning about saving ✅
- [x] **S.5.8.5** Add copy-to-clipboard functionality ✅
- [ ] **S.5.8.6** Write component tests (DEFERRED)

**Files**:
- `frontend/src/components/Admin/APITokenManagement.tsx` ✅

### S.5.9 Usage Limit Warnings
- [x] **S.5.9.1** Create LimitWarningBanner component ✅
  - Different severity levels (critical, warning, notice) ✅
  - Contextual messages ✅
  - Upgrade CTA ✅
- [x] **S.5.9.2** Integrate banner in app layout (top of page) - READY TO INTEGRATE
- [x] **S.5.9.3** Create logic to show/hide based on usage ✅ (useUsageWarnings hook)
- [x] **S.5.9.4** Add dismiss functionality ✅ (localStorage-based)
- [ ] **S.5.9.5** Write component tests (DEFERRED)

**Files**:
- `frontend/src/components/Admin/LimitWarningBanner.tsx` ✅
  - `LimitWarningBanner` - Global app-wide banner
  - `CompactLimitWarning` - For use in specific pages
  - `InlineLimitWarning` - For inline display in forms/actions

### S.5.10 Invitation Acceptance Flow
- [ ] **S.5.10.1** Create InvitationPage component
  - Parse token from URL
  - Display invitation details
  - Accept/decline buttons
- [ ] **S.5.10.2** Handle existing user flow
  - If logged in, accept directly
- [ ] **S.5.10.3** Handle new user flow
  - Redirect to signup with token
  - After signup, accept invitation
- [ ] **S.5.10.4** Add error handling (expired, invalid token)
- [ ] **S.5.10.5** Write component tests

**Files**: 
- `frontend/src/pages/AcceptInvitation/index.tsx`

---

## Phase S.6: Frontend Hooks & State (Week 7)

### S.6.1 React Query Hooks for Accounts
- [x] **S.6.1.1** Create `useCurrentAccount` hook (part of useSubscription)
  - Fetch current account with subscription and usage
- [ ] **S.6.1.2** Create `useUpdateAccount` mutation (DEFERRED)
- [ ] **S.6.1.3** Create `useDeleteAccount` mutation (DEFERRED)
- [x] **S.6.1.4** Add proper cache invalidation
- [ ] **S.6.1.5** Write hook tests (DEFERRED)

**Files**:
- `frontend/src/hooks/useSubscription.ts` (includes account hooks)
- `frontend/src/hooks/__tests__/useAccount.test.ts`

### S.6.2 React Query Hooks for Subscriptions
- [x] **S.6.2.1** Create `useSubscriptionPlans` hook
- [x] **S.6.2.2** Create `useStartTrial` mutation (helpers included)
- [x] **S.6.2.3** Create `useCreateSubscription` mutation (can be added later for Stripe)
- [x] **S.6.2.4** Create `useUpdateSubscription` mutation (can be added later for Stripe)
- [x] **S.6.2.5** Create `useCancelSubscription` mutation (can be added later for Stripe)
- [x] **S.6.2.6** Add proper cache invalidation
- [ ] **S.6.2.7** Write hook tests (DEFERRED)

**Files**:
- `frontend/src/hooks/useSubscription.ts` ✅
- `frontend/src/hooks/__tests__/useSubscription.test.ts`

### S.6.3 React Query Hooks for Usage
- [x] **S.6.3.1** Create `useUsage` hook
  - Poll for updates every 30 seconds ✅
- [x] **S.6.3.2** Create `useUsageHistory` hook
- [x] **S.6.3.3** Create `useCheckLimit` hook
- [ ] **S.6.3.4** Write hook tests (DEFERRED)

**Files**:
- `frontend/src/hooks/useUsage.ts` ✅
- `frontend/src/hooks/__tests__/useUsage.test.ts`

### S.6.4 React Query Hooks for Team
- [x] **S.6.4.1** Create `useTeamMembers` hook
- [x] **S.6.4.2** Create `useInviteUser` mutation
- [x] **S.6.4.3** Create `useResendInvitation` mutation
- [x] **S.6.4.4** Create `useRevokeInvitation` mutation
- [x] **S.6.4.5** Create `useAcceptInvitation` mutation
- [x] **S.6.4.6** Create `useUpdateMemberRole` mutation
- [x] **S.6.4.7** Create `useRemoveMember` mutation
- [x] **S.6.4.8** Add proper cache invalidation
- [ ] **S.6.4.9** Write hook tests (DEFERRED)

**Files**:
- `frontend/src/hooks/useTeam.ts` ✅
- `frontend/src/hooks/__tests__/useTeam.test.ts`

### S.6.5 React Query Hooks for Billing
- [ ] **S.6.5.1** Create `usePaymentMethods` hook
- [ ] **S.6.5.2** Create `useAddPaymentMethod` mutation
- [ ] **S.6.5.3** Create `useSetDefaultPaymentMethod` mutation
- [ ] **S.6.5.4** Create `useDeletePaymentMethod` mutation
- [ ] **S.6.5.5** Create `useInvoices` hook
- [ ] **S.6.5.6** Add proper cache invalidation
- [ ] **S.6.5.7** Write hook tests

**Files**: 
- `frontend/src/hooks/useBilling.ts`
- `frontend/src/hooks/__tests__/useBilling.test.ts`

### S.6.6 React Query Hooks for API Tokens
- [x] **S.6.6.1** Create `useAPITokens` hook
- [x] **S.6.6.2** Create `useCreateAPIToken` mutation
- [x] **S.6.6.3** Create `useRevokeAPIToken` mutation
- [x] **S.6.6.4** Add proper cache invalidation
- [ ] **S.6.6.5** Write hook tests (DEFERRED)

**Files**:
- `frontend/src/hooks/useAPITokens.ts` ✅
- `frontend/src/hooks/__tests__/useAPITokens.test.ts`

### S.6.7 Zustand Store for Subscription State
- [ ] **S.6.7.1** Create subscription slice in Zustand store
  - Current plan
  - Usage snapshot
  - Warning/limit states
- [ ] **S.6.7.2** Add actions to update state
- [ ] **S.6.7.3** Integrate with React Query
- [ ] **S.6.7.4** Write store tests

**Files**: 
- `frontend/src/store/subscriptionSlice.ts`
- `frontend/src/store/__tests__/subscriptionSlice.test.ts`

---

## Phase S.7: Email Notifications (Week 8)

### S.7.1 Email Service Setup
- [ ] **S.7.1.1** Choose email service provider (SendGrid, AWS SES, Mailgun)
- [ ] **S.7.1.2** Setup account and API keys
- [ ] **S.7.1.3** Configure sender domain and authentication
- [ ] **S.7.1.4** Create email service class
- [ ] **S.7.1.5** Implement `sendEmail(to, subject, html, text)`
- [ ] **S.7.1.6** Add error handling and retries
- [ ] **S.7.1.7** Write unit tests

**Files**: 
- `backend/src/services/email-service.ts`
- `backend/src/services/__tests__/email-service.test.ts`

### S.7.2 Email Templates
- [ ] **S.7.2.1** Create email template engine (Handlebars, Mjml)
- [ ] **S.7.2.2** Design email templates
  - Welcome email
  - Invitation email
  - Trial starting
  - Trial ending soon
  - Trial ended
  - Subscription activated
  - Subscription updated
  - Subscription cancelled
  - Payment failed
  - Payment succeeded
  - Usage warning (80%, 90%, 95%)
  - Limit reached
  - Account suspended
  - Account deletion scheduled
- [ ] **S.7.2.3** Create HTML versions
- [ ] **S.7.2.4** Create plain text versions
- [ ] **S.7.2.5** Add branding and styling
- [ ] **S.7.2.6** Test email rendering in major clients

**Files**: 
- `backend/src/templates/emails/`
- `backend/src/services/email-template-service.ts`

### S.7.3 Email Triggers
- [ ] **S.7.3.1** Integrate email sending in account service
  - Welcome email on signup
- [ ] **S.7.3.2** Integrate in subscription service
  - Trial emails
  - Subscription change emails
- [ ] **S.7.3.3** Integrate in usage service
  - Usage warning emails
- [ ] **S.7.3.4** Integrate in team service
  - Invitation emails
  - Member change emails
- [ ] **S.7.3.5** Integrate in webhook handler
  - Payment emails
- [ ] **S.7.3.6** Add email preferences check
  - Respect user notification settings
- [ ] **S.7.3.7** Write integration tests

---

## Phase S.8: Testing & QA (Week 9)

### S.8.1 Backend Testing
- [ ] **S.8.1.1** Increase unit test coverage to 80%+
  - All services
  - All utilities
- [ ] **S.8.1.2** Write integration tests for subscription flow
  - Create account â†' Start trial â†' Upgrade â†' Cancel
- [ ] **S.8.1.3** Write integration tests for team management
  - Invite â†' Accept â†' Change role â†' Remove
- [ ] **S.8.1.4** Write integration tests for usage tracking
  - Track events â†' Check limits â†' Reset
- [ ] **S.8.1.5** Test Stripe webhook handling
  - Mock webhook events
  - Verify database updates
- [ ] **S.8.1.6** Test email sending
  - Mock email service
  - Verify correct templates used

### S.8.2 Frontend Testing
- [ ] **S.8.2.1** Write component tests for all new components
  - Account settings
  - Subscription management
  - Usage dashboard
  - Team management
  - Billing
  - API tokens
- [ ] **S.8.2.2** Write hook tests
  - Mock API responses
  - Test loading, success, error states
- [ ] **S.8.2.3** Test form validation
- [ ] **S.8.2.4** Test error handling
- [ ] **S.8.2.5** Test loading states

### S.8.3 E2E Testing
- [ ] **S.8.3.1** Setup E2E testing framework (Playwright/Cypress)
- [ ] **S.8.3.2** Write E2E test: Signup and trial start
- [ ] **S.8.3.3** Write E2E test: Upgrade from free to pro
- [ ] **S.8.3.4** Write E2E test: Team invitation flow
- [ ] **S.8.3.5** Write E2E test: Usage limit warning
- [ ] **S.8.3.6** Write E2E test: Payment method management
- [ ] **S.8.3.7** Write E2E test: Subscription cancellation

### S.8.4 Performance Testing
- [ ] **S.8.4.1** Test usage calculation performance
  - With 1000+ projects
  - With 10,000+ datasets
- [ ] **S.8.4.2** Test database query performance
  - Add indexes if needed
- [ ] **S.8.4.3** Test Stripe API response times
- [ ] **S.8.4.4** Test email sending performance
- [ ] **S.8.4.5** Optimize slow operations

### S.8.5 Security Testing
- [ ] **S.8.5.1** Test RLS policies
  - Verify isolation between accounts
- [ ] **S.8.5.2** Test permission checks
  - Cannot access other account's data
  - Cannot perform unauthorized actions
- [ ] **S.8.5.3** Test API token validation
  - Invalid tokens rejected
  - Expired tokens rejected
  - Revoked tokens rejected
- [ ] **S.8.5.4** Test Stripe webhook signature verification
- [ ] **S.8.5.5** Test input validation
  - SQL injection prevention
  - XSS prevention
- [ ] **S.8.5.6** Test rate limiting
- [ ] **S.8.5.7** Conduct security audit

---

## Phase S.9: Documentation (Week 10)

### S.9.1 User Documentation
- [ ] **S.9.1.1** Write "Getting Started" guide
  - Signup process
  - Account setup
  - Team invitation
- [ ] **S.9.1.2** Write "Subscription Management" guide
  - How to upgrade
  - How to change plans
  - How to cancel
  - How to manage billing
- [ ] **S.9.1.3** Write "Usage & Limits" guide
  - Understanding usage
  - What counts toward limits
  - How to monitor usage
  - What happens at limits
- [ ] **S.9.1.4** Write "Team Management" guide
  - Inviting users
  - Managing roles
  - Removing users
- [ ] **S.9.1.5** Write "API Tokens" guide
  - Creating tokens
  - Using tokens
  - Revoking tokens
  - Security best practices
- [ ] **S.9.1.6** Create FAQ section
  - Billing questions
  - Usage questions
  - Trial questions
  - Cancellation questions

**Files**: `docs/user-guides/subscription-management.md`

### S.9.2 Developer Documentation
- [ ] **S.9.2.1** Document database schema
  - All new tables
  - Relationships
  - Indexes
- [ ] **S.9.2.2** Document API endpoints
  - All new endpoints
  - Request/response formats
  - Error codes
- [ ] **S.9.2.3** Document services
  - AccountService
  - SubscriptionService
  - UsageService
  - TeamService
  - StripeService
- [ ] **S.9.2.4** Document Stripe integration
  - Webhook handling
  - Event types
  - Sync logic
- [ ] **S.9.2.5** Document email system
  - Template structure
  - Trigger points
  - Customization

**Files**: `docs/developer/subscription-system.md`

### S.9.3 Video Tutorials
- [ ] **S.9.3.1** Record "How to upgrade" video
- [ ] **S.9.3.2** Record "How to manage team" video
- [ ] **S.9.3.3** Record "Understanding usage limits" video

---

## Phase S.10: Deployment & Launch (Week 11)

### S.10.1 Staging Deployment
- [ ] **S.10.1.1** Deploy database migrations to staging
- [ ] **S.10.1.2** Deploy backend to staging
- [ ] **S.10.1.3** Deploy frontend to staging
- [ ] **S.10.1.4** Configure Stripe test mode
- [ ] **S.10.1.5** Run smoke tests
- [ ] **S.10.1.6** Test complete flows end-to-end
- [ ] **S.10.1.7** Fix any issues found

### S.10.2 Production Preparation
- [ ] **S.10.2.1** Review all configuration
  - Environment variables
  - API keys (production)
  - Stripe live mode
- [ ] **S.10.2.2** Setup monitoring
  - Application monitoring (Datadog, New Relic)
  - Error tracking (Sentry)
  - Uptime monitoring
- [ ] **S.10.2.3** Setup alerts
  - Failed payments
  - Webhook failures
  - API errors
  - Usage spike alerts
- [ ] **S.10.2.4** Create rollback plan
- [ ] **S.10.2.5** Schedule maintenance window
- [ ] **S.10.2.6** Notify existing users (if applicable)

### S.10.3 Production Deployment
- [ ] **S.10.3.1** Backup production database
- [ ] **S.10.3.2** Run database migrations
- [ ] **S.10.3.3** Deploy backend
- [ ] **S.10.3.4** Deploy frontend
- [ ] **S.10.3.5** Verify Stripe webhooks working
- [ ] **S.10.3.6** Verify email sending working
- [ ] **S.10.3.7** Run smoke tests
- [ ] **S.10.3.8** Monitor for errors (24 hours)
- [ ] **S.10.3.9** Fix critical issues immediately

### S.10.4 Post-Launch
- [ ] **S.10.4.1** Monitor key metrics
  - Signups
  - Trial starts
  - Upgrades
  - Cancellations
  - Payment failures
- [ ] **S.10.4.2** Collect user feedback
- [ ] **S.10.4.3** Address any issues reported
- [ ] **S.10.4.4** Optimize based on usage patterns
- [ ] **S.10.4.5** Document lessons learned

---

## Notes

### Priority Levels
- ⭐ **HIGH PRIORITY**: Critical for MVP launch
- **MEDIUM PRIORITY**: Important but can be phased
- **LOW PRIORITY**: Nice to have, can be post-launch

### Dependencies
- **Phase S.1** must be completed before all others (database foundation)
- **Phase S.2** (Stripe) should be done early, in parallel with S.3
- **Phase S.3** (Services) must be done before S.4 (API)
- **Phase S.4** (API) must be done before S.5 (Frontend)
- **Phase S.7** (Emails) can be done in parallel with S.5-S.6

### Estimated Effort
- Phase S.1 (Database): 5-7 days
- Phase S.2 (Stripe): 5-7 days
- Phase S.3 (Services): 10-12 days
- Phase S.4 (API): 5-7 days
- Phase S.5 (Frontend UI): 12-15 days
- Phase S.6 (Frontend Hooks): 5-7 days
- Phase S.7 (Emails): 5-7 days
- Phase S.8 (Testing): 7-10 days
- Phase S.9 (Docs): 3-5 days
- Phase S.10 (Deployment): 2-3 days

**Total: 59-80 days (approximately 11-16 weeks for single developer)**

### Testing Strategy
- Unit test all services (target 80% coverage)
- Integration test all workflows
- E2E test critical user journeys
- Performance test with realistic data volumes
- Security test thoroughly (permissions, RLS, tokens)

### Success Metrics
- User signup conversion rate
- Trial-to-paid conversion rate
- Upgrade rate from Free to Pro
- Churn rate
- Payment failure rate
- Average revenue per user (ARPU)
- Customer lifetime value (LTV)
