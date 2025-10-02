-- Row Level Security (RLS) Policies for Bricker
-- These policies ensure users can only access data they're authorized to see

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.databricks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can view profiles of workspace members
CREATE POLICY "Users can view workspace member profiles"
  ON public.users
  FOR SELECT
  USING (
    id IN (
      SELECT user_id
      FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- WORKSPACES TABLE POLICIES
-- ============================================================================

-- Users can view workspaces they're members of
CREATE POLICY "Users can view their workspaces"
  ON public.workspaces
  FOR SELECT
  USING (
    id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create workspaces
CREATE POLICY "Users can create workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Workspace owners and admins can update workspaces
CREATE POLICY "Owners and admins can update workspaces"
  ON public.workspaces
  FOR UPDATE
  USING (
    id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Only workspace owners can delete workspaces
CREATE POLICY "Owners can delete workspaces"
  ON public.workspaces
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- WORKSPACE MEMBERS TABLE POLICIES
-- ============================================================================

-- Users can view members of their workspaces
CREATE POLICY "Users can view workspace members"
  ON public.workspace_members
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Owners and admins can add members
CREATE POLICY "Owners and admins can add members"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update member roles
CREATE POLICY "Owners and admins can update members"
  ON public.workspace_members
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can remove members
CREATE POLICY "Owners and admins can remove members"
  ON public.workspace_members
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- DATA MODELS TABLE POLICIES
-- ============================================================================

-- Users can view models in their workspaces
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

-- Editors and admins can create models
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

-- Editors can update models in their workspaces
CREATE POLICY "Editors can update models"
  ON public.data_models
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Owners and admins can delete models
CREATE POLICY "Owners and admins can delete models"
  ON public.data_models
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- MODEL VERSIONS TABLE POLICIES
-- ============================================================================

-- Users can view versions of models they can access
CREATE POLICY "Users can view model versions"
  ON public.model_versions
  FOR SELECT
  USING (
    model_id IN (
      SELECT id
      FROM public.data_models
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- System automatically creates versions (editors via trigger)
CREATE POLICY "System can create model versions"
  ON public.model_versions
  FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id
      FROM public.data_models
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ============================================================================
-- TEMPLATES TABLE POLICIES
-- ============================================================================

-- Users can view public templates and workspace templates
CREATE POLICY "Users can view templates"
  ON public.templates
  FOR SELECT
  USING (
    is_public = true
    OR workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    OR workspace_id IS NULL -- System templates
  );

-- Editors can create templates in their workspaces
CREATE POLICY "Editors can create templates"
  ON public.templates
  FOR INSERT
  WITH CHECK (
    (
      workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'editor')
      )
      OR workspace_id IS NULL -- For public templates
    )
    AND created_by = auth.uid()
  );

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.templates
  FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.templates
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================================
-- SCRIPT GENERATIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own script generations
CREATE POLICY "Users can view own script generations"
  ON public.script_generations
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can view script generations in their workspaces
CREATE POLICY "Users can view workspace script generations"
  ON public.script_generations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create script generations in their workspaces
CREATE POLICY "Users can create script generations"
  ON public.script_generations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own script generations
CREATE POLICY "Users can update own script generations"
  ON public.script_generations
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own script generations
CREATE POLICY "Users can delete own script generations"
  ON public.script_generations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- DATABRICKS CONNECTIONS TABLE POLICIES
-- ============================================================================

-- Users can view connections in their workspaces
CREATE POLICY "Users can view workspace connections"
  ON public.databricks_connections
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Editors can create connections
CREATE POLICY "Editors can create connections"
  ON public.databricks_connections
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

-- Editors can update connections
CREATE POLICY "Editors can update connections"
  ON public.databricks_connections
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Owners and admins can delete connections
CREATE POLICY "Owners and admins can delete connections"
  ON public.databricks_connections
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- CONVERSATIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
  ON public.conversations
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can view conversations in their workspaces
CREATE POLICY "Users can view workspace conversations"
  ON public.conversations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create conversations in their workspaces
CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
  ON public.conversations
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
  ON public.conversations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view conversation messages"
  ON public.messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id
      FROM public.conversations
      WHERE user_id = auth.uid()
    )
  );

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id
      FROM public.conversations
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- CONFIGURATIONS TABLE POLICIES
-- ============================================================================

-- Users can view configurations in their workspaces
CREATE POLICY "Users can view workspace configurations"
  ON public.configurations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Editors can create configurations
CREATE POLICY "Editors can create configurations"
  ON public.configurations
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

-- Editors can update configurations
CREATE POLICY "Editors can update configurations"
  ON public.configurations
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Owners and admins can delete configurations
CREATE POLICY "Owners and admins can delete configurations"
  ON public.configurations
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- STORAGE POLICIES (for file uploads if needed)
-- ============================================================================

-- Allow authenticated users to upload files to their workspace folder
CREATE POLICY "Users can upload to workspace folders"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'workspaces'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to view files in their workspaces
CREATE POLICY "Users can view workspace files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'workspaces'
    AND (storage.foldername(name))[1] IN (
      SELECT workspace_id::text
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete files they uploaded
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'workspaces'
    AND owner = auth.uid()
  );
