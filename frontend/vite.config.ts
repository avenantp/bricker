import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file from root directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    // Build optimizations
    build: {
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'flow': ['@xyflow/react'],
            'supabase': ['@supabase/supabase-js'],
            'editor': ['@monaco-editor/react'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    // Expose VITE_ prefixed variables from root .env to the client
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_DEV_MODE': JSON.stringify(env.VITE_DEV_MODE),
      'import.meta.env.VITE_DEV_ADMIN_ACCESS': JSON.stringify(env.VITE_DEV_ADMIN_ACCESS),
    },
  };
});
