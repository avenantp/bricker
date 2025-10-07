-- Urck Business Database Schema with Teams/Companies and Subscriptions
-- This replaces the previous workspace-based schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  github_username TEXT,
  github_token TEXT, -- Encrypted GitHub personal access token
  settings JSONB DEFAULT '{}'::jsonb,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- SUBSCRIPTION PLANS & BILLING
-- =====================================================

-- Subscription plans (tier definitions)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'starter', 'professional', 'enterprise'
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  max_team_members INTEGER,
  max_projects INTEGER,
  max_workspaces INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, max_team_members, max_projects, max_workspaces, features) VALUES
  ('starter', 'Starter', 'Perfect for small teams getting started', 29.00, 290.00, 5, 10, 3, '["Basic support", "Email notifications", "Standard templates"]'::jsonb),
  ('professional', 'Professional', 'For growing teams with advanced needs', 99.00, 990.00, 25, 100, 10, '["Priority support", "Advanced templates", "API access", "Custom integrations", "SSO"]'::jsonb),
  ('enterprise', 'Enterprise', 'For large organizations', 299.00, 2990.00, -1, -1, -1, '["24/7 support", "Dedicated account manager", "Custom SLAs", "Advanced security", "Audit logs", "Custom deployment"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMPANIES (formerly workspaces)
-- =====================================================

-- Companies table (business entities)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),

  -- Billing & subscription
  subscription_plan_id UUID REFERENCES public.subscription_plans(id),
  subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'paused')) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  billing_email TEXT,

  -- GitHub defaults
  github_org TEXT, -- Default GitHub organization
  github_default_repo TEXT, -- Default repository name for metadata

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPANY MEMBERS (User roles within companies)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_members (
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'contributor', 'viewer')),
  permissions JSONB DEFAULT '{}'::jsonb, -- Custom permissions override
  invited_by UUID REFERENCES public.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id)
);

-- =====================================================
-- RLS POLICIES FOR COMPANIES & MEMBERS
-- =====================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view companies they are members of"
  ON public.companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update their companies"
  ON public.companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (created_by = auth.uid());

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their companies"
  ON public.company_members FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage members"
  ON public.company_members FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- WORKSPACES (formerly top-level, now under companies)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  owner_id UUID REFERENCES public.users(id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspaces in their companies"
  ON public.workspaces FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Contributors can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'contributor')
    )
  );

CREATE POLICY "Contributors can update workspaces"
  ON public.workspaces FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'contributor')
    )
  );

-- =====================================================
-- PROJECTS (Metadata - actual data stored in GitHub YAML)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- GitHub reference
  github_repo TEXT NOT NULL,
  github_branch TEXT DEFAULT 'main',
  github_path TEXT NOT NULL, -- e.g., 'metadata/projects/customer-pipeline.yml'
  github_sha TEXT, -- Latest commit SHA for this file

  -- Metadata
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  version TEXT DEFAULT '1.0.0',

  -- Access control
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')) DEFAULT 'private',
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES public.users(id),
  locked_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID NOT NULL REFERENCES public.users(id),
  owner_id UUID NOT NULL REFERENCES public.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,

  UNIQUE(github_repo, github_path)
);

-- =====================================================
-- PROJECT MEMBERS (for private project access)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  added_by UUID REFERENCES public.users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =====================================================
-- RLS POLICIES FOR PROJECTS
-- =====================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public projects are viewable by anyone in the company
-- Private projects are only viewable by members
CREATE POLICY "Users can view public projects in their companies"
  ON public.projects FOR SELECT
  USING (
    visibility = 'public' AND company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view private projects they have access to"
  ON public.projects FOR SELECT
  USING (
    visibility = 'private' AND (
      -- Owner can always view
      owner_id = auth.uid() OR
      -- Company admins can view
      company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ) OR
      -- Explicit project members can view
      id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Contributors can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'contributor')
    )
  );

-- Only unlocked projects can be updated, and only by owner or admins
CREATE POLICY "Owners and admins can update unlocked projects"
  ON public.projects FOR UPDATE
  USING (
    is_locked = FALSE AND (
      owner_id = auth.uid() OR
      company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners and admins can manage members"
  ON public.project_members FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- DATA MODELS (Metadata - actual data stored in GitHub YAML)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.data_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- GitHub reference
  github_repo TEXT NOT NULL,
  github_branch TEXT DEFAULT 'main',
  github_path TEXT NOT NULL, -- e.g., 'metadata/models/customer-dimension.yml'
  github_sha TEXT, -- Latest commit SHA for this file

  -- Metadata
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  model_type TEXT CHECK (model_type IN ('dimensional', 'data_vault', 'normalized', 'custom')),
  version TEXT DEFAULT '1.0.0',

  -- Access control
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')) DEFAULT 'private',
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES public.users(id),
  locked_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID NOT NULL REFERENCES public.users(id),
  owner_id UUID NOT NULL REFERENCES public.users(id),

  -- Status
  is_archived BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,

  UNIQUE(github_repo, github_path)
);

-- =====================================================
-- DATA MODEL MEMBERS (for private model access)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.data_model_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_model_id UUID REFERENCES public.data_models(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  added_by UUID REFERENCES public.users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_model_id, user_id)
);

-- =====================================================
-- RLS POLICIES FOR DATA MODELS
-- =====================================================

ALTER TABLE public.data_models ENABLE ROW LEVEL SECURITY;

-- Public data models are viewable by anyone in the company
CREATE POLICY "Users can view public data models in their companies"
  ON public.data_models FOR SELECT
  USING (
    visibility = 'public' AND company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

-- Private data models follow project access rules
CREATE POLICY "Users can view private data models they have access to"
  ON public.data_models FOR SELECT
  USING (
    visibility = 'private' AND (
      -- Owner can always view
      owner_id = auth.uid() OR
      -- Company admins can view
      company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ) OR
      -- Project members can view
      project_id IN (
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid()
      ) OR
      -- Explicit model members can view
      id IN (
        SELECT data_model_id FROM public.data_model_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Contributors can create data models"
  ON public.data_models FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'contributor')
    )
  );

-- Only unlocked models can be updated
CREATE POLICY "Owners and admins can update unlocked data models"
  ON public.data_models FOR UPDATE
  USING (
    is_locked = FALSE AND (
      owner_id = auth.uid() OR
      company_id IN (
        SELECT company_id FROM public.company_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ) OR
      id IN (
        SELECT data_model_id FROM public.data_model_members
        WHERE user_id = auth.uid() AND role = 'editor'
      )
    )
  );

ALTER TABLE public.data_model_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Model owners can manage members"
  ON public.data_model_members FOR ALL
  USING (
    data_model_id IN (
      SELECT id FROM public.data_models
      WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- CONFIGURATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('connection', 'cluster', 'job')),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view configurations in their companies"
  ON public.configurations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage configurations"
  ON public.configurations FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- AUDIT LOGS (Enterprise feature)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'contributor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.invitations FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to add company creator as owner
CREATE OR REPLACE FUNCTION public.add_company_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.add_company_owner();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_data_models_updated_at
  BEFORE UPDATE ON public.data_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON public.configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_companies_subscription_plan ON public.companies(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON public.companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_company_id ON public.workspaces(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_github_repo ON public.projects(github_repo, github_path);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_data_models_company_id ON public.data_models(company_id);
CREATE INDEX IF NOT EXISTS idx_data_models_project_id ON public.data_models(project_id);
CREATE INDEX IF NOT EXISTS idx_data_models_github_repo ON public.data_models(github_repo, github_path);
CREATE INDEX IF NOT EXISTS idx_data_model_members_data_model_id ON public.data_model_members(data_model_id);
CREATE INDEX IF NOT EXISTS idx_data_model_members_user_id ON public.data_model_members(user_id);
CREATE INDEX IF NOT EXISTS idx_configurations_company_id ON public.configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
