# Development Mode Configuration

## Overview

Urck includes a development mode that bypasses all subscription and access control restrictions, allowing you to test all features without setting up companies, subscriptions, or role-based permissions.

## Enabling Dev Mode

Dev mode is controlled by environment variables in `frontend/.env.development`:

```env
# Dev Mode - Bypass all subscription and access control checks
VITE_DEV_MODE=true

# Dev Mode User Settings - Grants admin access
VITE_DEV_ADMIN_ACCESS=true
```

## What Dev Mode Does

When `VITE_DEV_MODE=true` and `VITE_DEV_ADMIN_ACCESS=true`:

1. **Automatic Company Setup**
   - Auto-creates a "Development Company" for the logged-in user
   - Grants `owner` role automatically
   - Bypasses company creation flow

2. **Full Admin Access**
   - Admin panel is always accessible (visible in header)
   - All subscription features unlocked
   - No subscription status checks

3. **Bypassed Restrictions**
   - Role-based access control (RBAC) bypassed
   - Subscription tier limits ignored
   - Lock mechanisms still function but can be managed
   - All route protections allow access

4. **Visual Indicators**
   - Yellow banner at top of screen: "Development Mode Active - Full admin access enabled"
   - Console logs on startup indicating dev mode is active

## Features You Can Access in Dev Mode

### Admin Panel (`/admin`)
- User Management
- Subscription Management
- Company Settings
- Analytics Dashboard
- Audit Logs

### Project Management
- Create projects
- Edit projects (even when locked by others in normal mode)
- Delete projects
- Manage project visibility (public/private)
- Lock/unlock projects

### Data Model Management
- Create data models
- Visual model designer
- Schema editor
- Data quality rules
- Archive/unarchive models

### GitHub Integration
- Configure GitHub repositories
- Sync YAML files
- Version control metadata

## Testing Subscription Features

Even in dev mode, you can test subscription-related UI:

1. The subscription management screen will display
2. You can view all subscription tiers
3. Plan comparison features work
4. Upgrade flows can be tested (payment processing would need separate config)

## Testing Role-Based Features

To test different role behaviors:

1. **Disable dev mode**: Set `VITE_DEV_ADMIN_ACCESS=false`
2. Create a real company in Supabase
3. Add company_members with different roles
4. Test each role's permissions

## Disabling Dev Mode

To disable dev mode and test production-like behavior:

```env
# In frontend/.env.development
VITE_DEV_MODE=false
VITE_DEV_ADMIN_ACCESS=false
```

Or simply remove these variables.

## Important Notes

⚠️ **Dev mode should NEVER be enabled in production**

- These environment variables are only in `.env.development`
- Production builds use `.env.production` (which should not have these flags)
- The `.env.development` file is in `.gitignore` and won't be committed

## Troubleshooting

### "I don't see the Admin button"

1. Check that `.env.development` has `VITE_DEV_ADMIN_ACCESS=true`
2. Restart the dev server (`npm run dev`)
3. Check browser console for dev mode logs
4. Clear browser cache and reload

### "Subscription restrictions still apply"

1. Verify environment variables are loaded (check browser console)
2. Ensure you're running `npm run dev` (not a production build)
3. Check that imports from `@/hooks/useDevMode` are present in components

### "Banner doesn't appear"

The yellow dev mode banner only appears when `VITE_DEV_ADMIN_ACCESS=true`. If you don't see it:

1. Check `.env.development` file
2. Restart dev server
3. Hard refresh browser (Ctrl+Shift+R)

## Code Implementation

Dev mode is implemented via:

- `frontend/.env.development` - Environment variables
- `frontend/src/config/env.ts` - Configuration loader
- `frontend/src/hooks/useDevMode.ts` - Dev mode hooks
- `frontend/src/components/DevMode/DevModeBanner.tsx` - Visual indicator

Key hooks:

```typescript
import { useDevMode, useCanAccessAdmin, usePermission, useSubscriptionStatus } from '@/hooks/useDevMode';

// Check if in dev mode
const { isDevMode, hasAdminAccess } = useDevMode();

// Check admin access (respects dev mode)
const canAccessAdmin = useCanAccessAdmin();

// Check permissions (respects dev mode)
const canEdit = usePermission('editor');

// Check subscription (respects dev mode)
const { isActive, canAccess } = useSubscriptionStatus();
```

## Example Workflow

1. Start dev server: `npm run dev`
2. Login with your test account
3. Dev mode auto-creates "Development Company" with owner role
4. Yellow banner confirms dev mode is active
5. Click "Admin" button in header
6. Test all admin features
7. Navigate to home page and create projects/models
8. All features are unlocked and accessible
