# Supabase Setup Guide for Bricker

This guide walks you through setting up Supabase for the Bricker application.

## Prerequisites

- Supabase account (free tier works)
- Database access (provided by Supabase)

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `bricker` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your users
4. Click "Create new project"
5. Wait for provisioning to complete (~2 minutes)

## Step 2: Run Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Create a new query
4. Copy and paste contents of `schema.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Verify tables were created:
   - Go to **Table Editor**
   - You should see: `users`, `workspaces`, `workspace_members`, `data_models`, etc.

## Step 3: Apply Row Level Security Policies

1. In SQL Editor, create another new query
2. Copy and paste contents of `rls-policies.sql`
3. Click **Run**
4. Verify RLS is enabled:
   - Go to **Authentication** > **Policies**
   - You should see policies for each table

## Step 4: Configure Authentication

### Enable Email Authentication

1. Go to **Authentication** > **Providers**
2. **Email** should be enabled by default
3. Configure email settings:
   - **Enable email confirmations**: ON (recommended)
   - **Secure email change**: ON
   - **Enable email OTP**: Optional

### Enable GitHub OAuth (Optional)

1. Create GitHub OAuth App:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Click "New OAuth App"
   - **Application name**: `Bricker`
   - **Homepage URL**: `http://localhost:5173` (dev) or your domain
   - **Authorization callback URL**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Click "Register application"
   - Copy **Client ID** and generate **Client Secret**

2. In Supabase:
   - Go to **Authentication** > **Providers**
   - Enable **GitHub**
   - Paste **Client ID** and **Client Secret**
   - Click **Save**

## Step 5: Create Storage Bucket (Optional)

For file uploads (YAML exports, templates, etc.):

1. Go to **Storage**
2. Click "Create a new bucket"
3. **Name**: `workspaces`
4. **Public bucket**: OFF (private)
5. Click **Create bucket**

## Step 6: Get API Credentials

1. Go to **Settings** > **API**
2. Copy the following:
   - **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
   - **Anon (public) key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (KEEP SECRET!)

3. Add to your `.env` file:
   ```env
   # Frontend (.env in root or frontend/.env.local)
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

   # Backend
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   ```

## Step 7: Test Authentication

1. Start your frontend: `npm run dev --workspace=frontend`
2. Open `http://localhost:5173`
3. You should see the authentication page
4. Try signing up with an email
5. Check your email for verification link
6. Click link to verify
7. Sign in with your credentials
8. You should be redirected to the main app

## Step 8: Verify Database Access

### Test Creating a Workspace

1. After signing in, click "Create Workspace"
2. Enter a name and description
3. Click "Create"
4. Verify in Supabase:
   - Go to **Table Editor** > `workspaces`
   - You should see your new workspace
   - Go to `workspace_members`
   - You should see yourself as "owner"

### Test RLS Policies

Try these SQL queries in the SQL Editor to verify RLS:

```sql
-- Should return only YOUR workspaces
SELECT * FROM public.workspaces;

-- Should return only YOUR user profile
SELECT * FROM public.users;

-- Should return only workspaces you're a member of
SELECT w.*, wm.role
FROM public.workspaces w
JOIN public.workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid();
```

## Troubleshooting

### "relation does not exist" error

**Problem**: Tables weren't created

**Solution**:
1. Check SQL Editor for errors when running `schema.sql`
2. Ensure you're using PostgreSQL 13+ (Supabase default)
3. Run each CREATE TABLE statement individually

### RLS policies blocking access

**Problem**: Can't read/write data even when authenticated

**Solution**:
1. Verify user is authenticated: `SELECT auth.uid();` should return your user ID
2. Check policy conditions in `rls-policies.sql`
3. Temporarily disable RLS for debugging:
   ```sql
   ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
   ```
4. Re-enable after debugging:
   ```sql
   ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
   ```

### Email confirmations not working

**Problem**: Not receiving verification emails

**Solution**:
1. Check spam folder
2. Verify email provider settings in Supabase dashboard
3. For development, disable email confirmation:
   - **Authentication** > **Providers** > **Email**
   - Toggle OFF "Enable email confirmations"
   - **Warning**: Only for development!

### GitHub OAuth not working

**Problem**: GitHub sign-in fails

**Solution**:
1. Verify callback URL matches exactly:
   - GitHub OAuth App: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - No trailing slashes or extra characters
2. Ensure Client ID and Secret are correct
3. Check Supabase logs: **Authentication** > **Logs**

## Production Checklist

Before deploying to production:

- [ ] Enable email confirmations
- [ ] Set up custom SMTP (not Supabase's default mailer)
- [ ] Configure custom domain for auth redirects
- [ ] Review and tighten RLS policies
- [ ] Enable database backups (Supabase dashboard)
- [ ] Set up monitoring and alerts
- [ ] Rotate service role key if exposed
- [ ] Configure rate limiting for auth endpoints
- [ ] Set up database connection pooling
- [ ] Enable Point-in-Time Recovery (Pro plan)

## Advanced Configuration

### Custom Email Templates

1. Go to **Authentication** > **Email Templates**
2. Customize:
   - **Confirm signup**: Welcome email
   - **Magic Link**: Passwordless login
   - **Change Email Address**: Email change confirmation
   - **Reset Password**: Password reset email

### Database Migrations

For future schema changes, use Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Create migration
supabase migration new add_new_table

# Apply migration
supabase db push
```

### Realtime Subscriptions (Optional)

Enable realtime for collaborative editing:

```sql
-- Enable realtime for data_models table
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_models;
```

Then in frontend:

```typescript
const subscription = supabase
  .channel('data_models')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'data_models',
    filter: `workspace_id=eq.${workspaceId}`
  }, (payload) => {
    console.log('Model updated:', payload);
  })
  .subscribe();
```

## Security Best Practices

1. **Never commit service role key** to version control
2. **Use anon key on frontend**, service key on backend only
3. **Always use RLS** - never disable in production
4. **Validate all inputs** on both client and server
5. **Use prepared statements** to prevent SQL injection
6. **Rotate keys periodically** (every 90 days recommended)
7. **Monitor auth logs** for suspicious activity
8. **Use HTTPS only** in production
9. **Enable MFA** for admin accounts
10. **Implement rate limiting** on sensitive endpoints

## Useful SQL Queries

### Find all workspaces for a user
```sql
SELECT w.*
FROM public.workspaces w
JOIN public.workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = 'USER_UUID_HERE';
```

### Count models per workspace
```sql
SELECT w.name, COUNT(dm.id) as model_count
FROM public.workspaces w
LEFT JOIN public.data_models dm ON w.id = dm.workspace_id
GROUP BY w.id, w.name;
```

### Find users with admin role
```sql
SELECT u.email, w.name as workspace, wm.role
FROM public.users u
JOIN public.workspace_members wm ON u.id = wm.user_id
JOIN public.workspaces w ON wm.workspace_id = w.id
WHERE wm.role = 'admin';
```

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Bricker Issues**: https://github.com/your-org/bricker/issues

