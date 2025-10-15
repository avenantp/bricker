# Authentication & Authorization Guide

Complete guide to authentication and authorization in Uroq.

## Overview

Uroq uses **Supabase Auth** for authentication and **Row Level Security (RLS)** for authorization.

### Authentication Flow

```
User visits app
  ↓
Check if authenticated (useAuth hook)
  ↓
Not authenticated → Show AuthPage
  ↓
User signs up/signs in
  ↓
Supabase creates session
  ↓
Session stored in localStorage
  ↓
User redirected to main app
  ↓
Auto-load workspaces (useWorkspace hook)
  ↓
Display app with user data
```

## Authentication Methods

### 1. Email/Password

**Sign Up**:
```typescript
const { signUp } = useAuth();
await signUp('user@example.com', 'password123', 'John Doe');
```

**Sign In**:
```typescript
const { signIn } = useAuth();
await signIn('user@example.com', 'password123');
```

**Email Verification**:
- Supabase sends verification email automatically
- User clicks link to verify
- After verification, user can sign in

### 2. OAuth (GitHub)

**Sign In with GitHub**:
```typescript
const { signInWithGithub } = useAuth();
await signInWithGithub();
// Redirects to GitHub OAuth flow
// Returns to app at /auth/callback
```

### 3. Password Reset

**Request Reset**:
```typescript
const { resetPassword } = useAuth();
await resetPassword('user@example.com');
// User receives reset email
```

**Update Password**:
```typescript
const { updatePassword } = useAuth();
await updatePassword('newPassword123');
```

## Authorization Model

### Roles

Uroq uses workspace-level roles:

| Role | Permissions |
|------|-------------|
| **Owner** | Full control: manage workspace, add/remove members, delete workspace |
| **Admin** | Manage members, edit all models, manage configurations |
| **Editor** | Create and edit models, generate scripts, use AI assistant |
| **Viewer** | Read-only access to models and scripts |

### Role Assignment

```typescript
const { inviteMember } = useWorkspace();

// Invite user as editor
await inviteMember(workspaceId, userId, 'editor');
```

## Row Level Security (RLS)

### How RLS Works

1. **Every query is filtered** by user's authentication
2. **Policies define access rules** (who can read/write what)
3. **Runs on database level** (impossible to bypass from client)

### Example Policies

**Users can view their own profile**:
```sql
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);
```

**Users can view workspace data**:
```sql
CREATE POLICY "Users can view workspace models"
  ON public.data_models
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );
```

**Editors can create models**:
```sql
CREATE POLICY "Editors can create models"
  ON public.data_models
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );
```

## Frontend Implementation

### useAuth Hook

Located at: `frontend/src/hooks/useAuth.ts`

**Usage**:
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, session, loading, signIn, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### useWorkspace Hook

Located at: `frontend/src/hooks/useWorkspace.ts`

**Usage**:
```typescript
import { useWorkspace } from '@/hooks/useWorkspace';

function WorkspaceList() {
  const { workspaces, loading, createWorkspace } = useWorkspace();

  const handleCreate = async () => {
    await createWorkspace('My New Workspace', 'Description...');
  };

  return (
    <div>
      {workspaces.map(ws => (
        <div key={ws.id}>{ws.name}</div>
      ))}
      <button onClick={handleCreate}>Create Workspace</button>
    </div>
  );
}
```

### Protected Routes

The App component handles route protection:

```typescript
function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;

  return <MainApp />;
}
```

## Backend Integration

### Verifying User on Backend

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Verify JWT token from frontend
async function verifyUser(authHeader: string) {
  const token = authHeader.replace('Bearer ', '');

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Unauthorized');
  }

  return data.user;
}

// Example Express middleware
app.use('/api/protected', async (req, res, next) => {
  try {
    const user = await verifyUser(req.headers.authorization);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### Service Role vs Anon Key

| Key Type | Usage | Security |
|----------|-------|----------|
| **Anon Key** | Frontend, public access | Safe to expose, RLS enforced |
| **Service Role Key** | Backend, admin operations | SECRET! Bypasses RLS |

**Never use service role key on frontend!**

## Session Management

### Session Storage

Supabase stores sessions in:
- **localStorage** (default, persists across tabs/refreshes)
- **sessionStorage** (alternative, cleared on tab close)
- **Cookie** (for SSR)

### Auto Refresh

Sessions automatically refresh before expiring:
```typescript
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true, // Auto-refresh before expiry
    persistSession: true,   // Store in localStorage
  },
});
```

### Session Lifetime

- **Access Token**: 1 hour (default)
- **Refresh Token**: 30 days (default)
- Both configurable in Supabase dashboard

## Security Best Practices

### Frontend

1. **Never store passwords** - let Supabase handle it
2. **Use HTTPS** in production
3. **Validate inputs** before sending to API
4. **Clear sensitive data** on sign out
5. **Use environment variables** for API keys

```typescript
// ✅ Good
const apiUrl = import.meta.env.VITE_API_URL;

// ❌ Bad
const apiUrl = 'https://hardcoded-api.com';
```

### Backend

1. **Always verify JWT tokens**
2. **Use service role key only on server**
3. **Implement rate limiting**
4. **Log authentication attempts**
5. **Use prepared statements** for SQL

```typescript
// ✅ Good
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

// ❌ Bad (SQL injection risk)
const data = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Database

1. **Enable RLS on all tables**
2. **Test policies thoroughly**
3. **Use least privilege principle**
4. **Audit policy changes**
5. **Monitor for policy bypasses**

## Testing Authentication

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

test('useAuth returns null user when not authenticated', () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.user).toBeNull();
});
```

### Integration Tests

```typescript
import { supabase } from '@/lib/supabase';

test('user can sign up and sign in', async () => {
  // Sign up
  const { data: signUpData } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123',
  });
  expect(signUpData.user).toBeTruthy();

  // Sign in
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123',
  });
  expect(signInData.session).toBeTruthy();
});
```

### Manual Testing Checklist

- [ ] Sign up with email/password
- [ ] Verify email
- [ ] Sign in with verified account
- [ ] Sign out
- [ ] Sign in with GitHub OAuth
- [ ] Request password reset
- [ ] Reset password via email link
- [ ] Access denied when not authenticated
- [ ] Access granted after authentication
- [ ] Workspace switching works
- [ ] Create/edit/delete permissions respect roles
- [ ] Session persists across page refreshes
- [ ] Session expires after timeout

## Troubleshooting

### "User not found" error

**Cause**: Email not verified or account doesn't exist

**Solution**:
1. Check email for verification link
2. Resend verification email from Supabase dashboard
3. Verify account exists in `auth.users` table

### "Invalid JWT" error

**Cause**: Token expired or malformed

**Solution**:
1. Sign out and sign back in
2. Clear localStorage
3. Check token format in network tab

### RLS denying access

**Cause**: User doesn't have required permissions

**Solution**:
1. Check user's role in `workspace_members` table
2. Verify RLS policy conditions
3. Test policy with SQL query:
   ```sql
   SELECT * FROM public.data_models WHERE workspace_id = 'WORKSPACE_ID';
   ```

### Session not persisting

**Cause**: localStorage disabled or cookies blocked

**Solution**:
1. Enable localStorage in browser settings
2. Allow cookies for Supabase domain
3. Check browser privacy settings

## Advanced Topics

### Multi-Tenancy

Uroq uses **workspace-based multi-tenancy**:
- Each workspace is isolated
- Users can belong to multiple workspaces
- Data is filtered by workspace_id

### Audit Logging

Track authentication events:
```typescript
// Log sign-in
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user.id);
    // Send to analytics
  }
});
```

### Custom Claims

Add custom data to JWT:
```typescript
// On sign up
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe',
      organization: 'Acme Corp',
    },
  },
});

// Access in app
const metadata = user.user_metadata;
console.log(metadata.full_name); // "John Doe"
```

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT Debugging](https://jwt.io/)
- [OAuth 2.0 Spec](https://oauth.net/2/)

