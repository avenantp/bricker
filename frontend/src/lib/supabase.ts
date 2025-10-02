import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          last_login: string | null;
          preferences: Record<string, any>;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Record<string, any>;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          preferences?: Record<string, any>;
          last_login?: string | null;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          github_repo: string | null;
          github_branch: string;
          settings: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          owner_id: string;
          github_repo?: string | null;
          github_branch?: string;
          settings?: Record<string, any>;
        };
        Update: {
          name?: string;
          description?: string | null;
          github_repo?: string | null;
          github_branch?: string;
          settings?: Record<string, any>;
        };
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
          joined_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'editor' | 'viewer';
        };
        Update: {
          role?: 'owner' | 'admin' | 'editor' | 'viewer';
        };
      };
      data_models: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          model_type: 'dimensional' | 'data_vault' | 'normalized' | 'custom' | null;
          nodes: any[];
          edges: any[];
          metadata: Record<string, any>;
          created_by: string;
          created_at: string;
          updated_at: string;
          is_archived: boolean;
        };
        Insert: {
          workspace_id: string;
          name: string;
          description?: string | null;
          model_type?: 'dimensional' | 'data_vault' | 'normalized' | 'custom' | null;
          nodes?: any[];
          edges?: any[];
          metadata?: Record<string, any>;
          created_by: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          model_type?: 'dimensional' | 'data_vault' | 'normalized' | 'custom' | null;
          nodes?: any[];
          edges?: any[];
          metadata?: Record<string, any>;
          is_archived?: boolean;
        };
      };
    };
  };
}
