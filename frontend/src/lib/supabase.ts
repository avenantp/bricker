import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing',
  });
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

console.log('[Supabase] Initializing client with URL:', supabaseUrl);

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
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          price_monthly: number | null;
          price_yearly: number | null;
          max_team_members: number | null;
          max_projects: number | null;
          max_workspaces: number | null;
          features: any[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          description: string | null;
          logo_url: string | null;
          website: string | null;
          industry: string | null;
          company_size: string | null;
          subscription_plan_id: string | null;
          subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';
          trial_ends_at: string | null;
          subscription_starts_at: string | null;
          subscription_ends_at: string | null;
          billing_email: string | null;
          settings: Record<string, any>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug?: string | null;
          description?: string | null;
          subscription_plan_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          subscription_plan_id?: string | null;
          subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';
        };
      };
      company_members: {
        Row: {
          company_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'contributor' | 'viewer';
          permissions: Record<string, any>;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'contributor' | 'viewer';
          invited_by?: string | null;
        };
        Update: {
          role?: 'owner' | 'admin' | 'contributor' | 'viewer';
          permissions?: Record<string, any>;
        };
      };
      workspaces: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          github_repo: string | null;
          github_branch: string;
          settings: Record<string, any>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          name: string;
          description?: string | null;
          github_repo?: string | null;
          github_branch?: string;
          settings?: Record<string, any>;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          github_repo?: string | null;
          github_branch?: string;
          settings?: Record<string, any>;
        };
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      data_models: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
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
          project_id: string;
          company_id: string;
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
      invitations: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          role: 'admin' | 'contributor' | 'viewer';
          invited_by: string;
          token: string;
          status: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Record<string, any>;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
      };
    };
  };
}
