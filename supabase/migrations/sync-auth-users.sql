-- Sync existing auth.users to public.users table
-- This handles users that authenticated before the trigger was set up

INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
