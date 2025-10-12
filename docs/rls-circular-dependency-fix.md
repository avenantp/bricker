# RLS Circular Dependency Fix

## Problem

The application was experiencing infinite recursion errors when creating workspaces and loading workspace data due to circular dependencies in Row Level Security (RLS) policies.

### Root Cause

1. **Circular SELECT Policies**:
   - The `workspaces` table SELECT policy required checking `workspace_members` to see if user is a member
   - The `workspace_members` table SELECT policy required checking `workspace_members` itself (recursion)
   - This created an infinite loop when querying workspaces

2. **Trigger-Based Approach Issues**:
   - Initial trigger `on_workspace_created` automatically added owner as member
   - Even with `SECURITY DEFINER`, the subsequent queries still hit RLS policies
   - Application code attempted duplicate inserts, exacerbating the problem

### Error Messages

```
{code: '42P17', message: 'infinite recursion detected in policy for relation "workspace_members"'}
```

This occurred in:
- `useWorkspace.ts` `loadWorkspaces()` function
- `useWorkspace.ts` `createWorkspace()` function
- `WorkspaceManagement.tsx` `loadWorkspaces()` function

## Solution

### Approach: RPC Function with SECURITY DEFINER

Instead of using database triggers that still interact with RLS policies, we now use a database RPC (Remote Procedure Call) function that:

1. **Runs with elevated privileges** (`SECURITY DEFINER`)
2. **Bypasses RLS completely** for the workspace creation transaction
3. **Handles both operations atomically**:
   - Creates the workspace
   - Adds the owner as a member

### Implementation Details

#### 1. Migration 007: RPC Function

**File**: `supabase/migrations/007_fix_circular_rls.sql`

**Key Components**:

- **Removes trigger**: Drops `on_workspace_created` trigger and `add_workspace_owner_as_member()` function
- **Creates RPC function**: `create_workspace_with_owner()` with `SECURITY DEFINER`
- **Fixes SELECT policy**: Breaks circular dependency in `workspace_members` SELECT policy

**RPC Function Signature**:
```sql
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_github_repo_url TEXT DEFAULT NULL
)
RETURNS TABLE(...)
SECURITY DEFINER
```

**How it works**:
1. Gets current user ID via `auth.uid()`
2. Inserts workspace with owner_id
3. Inserts workspace_members record (bypasses RLS due to SECURITY DEFINER)
4. Returns the created workspace

#### 2. Updated Frontend Hook

**File**: `frontend/src/hooks/useWorkspace.ts`

**Before**:
```typescript
const { data: workspace } = await supabase
  .from('workspaces')
  .insert({ name, description, owner_id: user.id })
  .select()
  .single();
```

**After**:
```typescript
const { data: workspace } = await supabase
  .rpc('create_workspace_with_owner', {
    p_name: name,
    p_description: description || null,
    p_github_repo_url: null,
  })
  .single();
```

#### 3. Fixed RLS Policy

**File**: `supabase/migrations/004_rls_policies.sql`

**Before** (Circular):
```sql
CREATE POLICY "Users can view workspace members"
  ON public.workspace_members
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members -- RECURSION!
      WHERE user_id = auth.uid()
    )
  );
```

**After** (No Recursion):
```sql
CREATE POLICY "Users can view workspace members"
  ON public.workspace_members
  FOR SELECT
  USING (
    -- User owns the workspace
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    OR
    -- User is a member (direct check, no subquery)
    user_id = auth.uid()
  );
```

## Testing

After applying migration 007:

1. **Test workspace creation**:
   - Create a new workspace via the UI
   - Should succeed without recursion errors
   - Owner should automatically be added as a member

2. **Test workspace loading**:
   - Load workspaces list
   - Should not trigger recursion errors
   - Should show all workspaces where user is a member

3. **Test workspace members view**:
   - View members of a workspace
   - Should not trigger recursion errors
   - Should show all members correctly

## Migration Order

1. `003_functions_and_triggers.sql` - Updated to remove trigger code
2. `004_rls_policies.sql` - Updated SELECT policy to break circular dependency
3. `005_fix_workspace_members_rls.sql` - Superseded by 007
4. `006_fix_workspace_trigger_rls.sql` - Superseded by 007
5. **`007_fix_circular_rls.sql`** - Final comprehensive fix (apply this)

## Benefits of This Approach

1. ✅ **No circular dependencies** - RPC function bypasses RLS entirely
2. ✅ **Atomic operation** - Workspace and member created in single transaction
3. ✅ **Better error handling** - Function can validate and return proper errors
4. ✅ **Simpler SELECT policies** - No recursive queries needed
5. ✅ **Better security** - `SECURITY DEFINER` ensures only authenticated users can call it
6. ✅ **Application-controlled** - Logic is explicit in the frontend code

## Alternative Approaches Considered

1. **Trigger with SECURITY DEFINER**: Tried, but still had RLS issues on subsequent queries
2. **Disabling RLS on workspace_members**: Considered too risky for security
3. **Service role key in frontend**: Major security risk, rejected
4. **Complex RLS policy logic**: Would be harder to maintain and debug

## Conclusion

The RPC function approach provides a clean, secure, and maintainable solution to the circular RLS dependency problem. All workspace creation now goes through a single, well-defined code path that handles both the workspace and member creation atomically.
