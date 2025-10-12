// Environment configuration
export const config = {
  // API settings
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',

  // Supabase settings
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  // Development mode settings
  isDev: import.meta.env.DEV,
  devMode: import.meta.env.VITE_DEV_MODE === 'true',
  devAdminAccess: import.meta.env.VITE_DEV_ADMIN_ACCESS === 'true',
} as const;

// Helper functions for dev mode
export const isDevMode = () => config.devMode || config.isDev;
export const hasDevAdminAccess = () => config.devAdminAccess && isDevMode();

// Debug helper
if (isDevMode()) {
  console.log('[Uroq] Running in development mode');
  if (hasDevAdminAccess()) {
    console.log('[Uroq] Dev admin access enabled - all features unlocked');
  }
}
