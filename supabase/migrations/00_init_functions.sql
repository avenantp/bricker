--
-- Uroq Database Functions
-- All stored procedures and functions for the Uroq application
--

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Generate tokens
CREATE OR REPLACE FUNCTION public.generate_api_token()
RETURNS character varying
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_api_token_prefix()
RETURNS character varying
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'uroq_' || substring(md5(random()::text), 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS character varying
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_email_verification_token()
RETURNS character varying
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_password_reset_token()
RETURNS character varying
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;

-- Hash API token
CREATE OR REPLACE FUNCTION public.hash_api_token(p_token character varying)
RETURNS character varying
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(extensions.digest(p_token, 'sha256'), 'hex');
END;
$$;

-- =============================================================================
-- SOFT DELETE FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete(
    p_table_name text,
    p_record_id uuid,
    p_deleted_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $_$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  v_sql := format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_deleted_by, p_record_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$_$;

CREATE OR REPLACE FUNCTION public.restore_deleted(
    p_table_name text,
    p_record_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $_$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  v_sql := format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_record_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$_$;

CREATE OR REPLACE FUNCTION public.permanent_delete(
    p_table_name text,
    p_record_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $_$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  v_sql := format(
    'DELETE FROM %I WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_record_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$_$;

CREATE OR REPLACE FUNCTION public.cleanup_soft_deleted_records(
    p_table_name text,
    p_days_old integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_sql TEXT;
  v_deleted_count INTEGER;
BEGIN
  v_sql := format(
    'DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL ''%s days''',
    p_table_name,
    p_days_old
  );

  EXECUTE v_sql;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Soft delete cascading functions
CREATE OR REPLACE FUNCTION public.soft_delete_dataset(
    p_dataset_id uuid,
    p_deleted_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_columns_count INTEGER;
BEGIN
  UPDATE datasets
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_dataset_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Dataset not found or already deleted');
  END IF;

  UPDATE columns SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE dataset_id = p_dataset_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_columns_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'dataset_id', p_dataset_id,
    'columns_deleted', v_columns_count
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_project(
    p_project_id uuid,
    p_deleted_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_workspaces_count INTEGER;
BEGIN
  UPDATE projects
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Project not found or already deleted');
  END IF;

  UPDATE workspaces SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE project_id = p_project_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_workspaces_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'workspaces_deleted', v_workspaces_count
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_account(
    p_account_id uuid,
    p_deleted_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_projects_count INTEGER;
  v_workspaces_count INTEGER;
  v_datasets_count INTEGER;
BEGIN
  UPDATE accounts
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Account not found or already deleted');
  END IF;

  UPDATE projects SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_projects_count = ROW_COUNT;

  UPDATE workspaces SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_workspaces_count = ROW_COUNT;

  UPDATE datasets SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_datasets_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'account_id', p_account_id,
    'projects_deleted', v_projects_count,
    'workspaces_deleted', v_workspaces_count,
    'datasets_deleted', v_datasets_count
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- USAGE TRACKING FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_usage_counter(
    p_account_id uuid,
    p_resource_type character varying,
    p_amount integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
AS $_$
DECLARE
  v_column TEXT;
BEGIN
  v_column := CASE p_resource_type
    WHEN 'users' THEN 'current_user_count'
    WHEN 'projects' THEN 'current_project_count'
    WHEN 'datasets' THEN 'current_dataset_count'
    WHEN 'ai_requests' THEN 'current_monthly_ai_requests'
    WHEN 'storage' THEN 'current_storage_mb'
    ELSE NULL
  END;

  IF v_column IS NULL THEN
    RAISE EXCEPTION 'Invalid resource type: %', p_resource_type;
  END IF;

  EXECUTE format('UPDATE accounts SET %I = %I + $1, updated_at = NOW() WHERE id = $2', v_column, v_column)
  USING p_amount, p_account_id;

  RETURN true;
END;
$_$;

CREATE OR REPLACE FUNCTION public.decrement_usage_counter(
    p_account_id uuid,
    p_resource_type character varying,
    p_amount integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
AS $_$
DECLARE
  v_column TEXT;
BEGIN
  v_column := CASE p_resource_type
    WHEN 'users' THEN 'current_user_count'
    WHEN 'projects' THEN 'current_project_count'
    WHEN 'datasets' THEN 'current_dataset_count'
    WHEN 'ai_requests' THEN 'current_monthly_ai_requests'
    WHEN 'storage' THEN 'current_storage_mb'
    ELSE NULL
  END;

  IF v_column IS NULL THEN
    RAISE EXCEPTION 'Invalid resource type: %', p_resource_type;
  END IF;

  EXECUTE format('UPDATE accounts SET %I = GREATEST(%I - $1, 0), updated_at = NOW() WHERE id = $2', v_column, v_column)
  USING p_amount, p_account_id;

  RETURN true;
END;
$_$;

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Universal trigger function to automatically update updated_at timestamp';

CREATE OR REPLACE FUNCTION public.update_account_user_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_counter(NEW.account_id, 'users', 1);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      PERFORM decrement_usage_counter(NEW.account_id, 'users', 1);
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      PERFORM increment_usage_counter(NEW.account_id, 'users', 1);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_active = true THEN
      PERFORM decrement_usage_counter(OLD.account_id, 'users', 1);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_account_project_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_counter(NEW.account_id, 'projects', 1);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      PERFORM decrement_usage_counter(NEW.account_id, 'projects', 1);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      PERFORM increment_usage_counter(NEW.account_id, 'projects', 1);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      PERFORM decrement_usage_counter(OLD.account_id, 'projects', 1);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_account_dataset_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_counter(NEW.account_id, 'datasets', 1);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      PERFORM decrement_usage_counter(NEW.account_id, 'datasets', 1);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      PERFORM increment_usage_counter(NEW.account_id, 'datasets', 1);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      PERFORM decrement_usage_counter(OLD.account_id, 'datasets', 1);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_dataset_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_dataset_fqn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fully_qualified_name := get_dataset_fqn(NEW.connection_id, NEW.schema, NEW.name);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dataset_fqn(
    p_connection_id uuid,
    p_schema character varying,
    p_name character varying
)
RETURNS character varying
LANGUAGE plpgsql
AS $$
DECLARE
  v_connection_name VARCHAR;
  v_fqn VARCHAR;
BEGIN
  SELECT name INTO v_connection_name
  FROM connections
  WHERE id = p_connection_id;

  v_fqn := COALESCE(v_connection_name, 'unknown') || '.'
        || COALESCE(p_schema, 'default') || '.'
        || p_name;

  RETURN v_fqn;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_project_owner_to_project_users()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO project_users (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.add_project_owner_to_project_users() IS 'Add project owner to project_users table automatically';

CREATE OR REPLACE FUNCTION public.add_workspace_owner_to_workspace_users()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO workspace_users (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.add_workspace_owner_to_workspace_users() IS 'Add workspace owner to workspace_users table automatically';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- DIAGRAM FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_dataset_to_diagram(
    p_diagram_id uuid,
    p_dataset_id uuid,
    p_location jsonb DEFAULT NULL::jsonb,
    p_user_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO diagram_datasets (
    diagram_id,
    dataset_id,
    location,
    created_by
  ) VALUES (
    p_diagram_id,
    p_dataset_id,
    COALESCE(p_location, '{}'::jsonb),
    p_user_id
  )
  ON CONFLICT (diagram_id, dataset_id) DO UPDATE
  SET location = COALESCE(p_location, diagram_datasets.location)
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_dataset_from_diagram(
    p_diagram_id uuid,
    p_dataset_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM diagram_datasets
  WHERE diagram_id = p_diagram_id
    AND dataset_id = p_dataset_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

COMMENT ON FUNCTION public.remove_dataset_from_diagram(p_diagram_id uuid, p_dataset_id uuid) IS 'Removes a dataset from a diagram';

-- =============================================================================
-- API TOKEN FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_api_token(
    p_token character varying,
    p_ip_address character varying DEFAULT NULL::character varying,
    p_user_agent text DEFAULT NULL::text
)
RETURNS TABLE(
    token_id uuid,
    account_id uuid,
    user_id uuid,
    scopes jsonb,
    is_valid boolean,
    error_message text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_token_hash VARCHAR;
  v_token_record api_tokens;
BEGIN
  v_token_hash := hash_api_token(p_token);

  SELECT * INTO v_token_record
  FROM api_tokens
  WHERE token_hash = v_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, NULL::JSONB, false, 'Invalid token'::TEXT;
    RETURN;
  END IF;

  IF NOT v_token_record.is_active THEN
    RETURN QUERY SELECT
      v_token_record.id,
      v_token_record.account_id,
      v_token_record.user_id,
      v_token_record.scopes,
      false,
      'Token has been revoked'::TEXT;
    RETURN;
  END IF;

  IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at < NOW() THEN
    UPDATE api_tokens
    SET is_active = false,
        revoked_at = NOW(),
        revoke_reason = 'Token expired'
    WHERE id = v_token_record.id;

    RETURN QUERY SELECT
      v_token_record.id,
      v_token_record.account_id,
      v_token_record.user_id,
      v_token_record.scopes,
      false,
      'Token has expired'::TEXT;
    RETURN;
  END IF;

  UPDATE api_tokens
  SET last_used_at = NOW(),
      usage_count = usage_count + 1,
      last_used_ip = COALESCE(p_ip_address, last_used_ip),
      last_used_user_agent = COALESCE(p_user_agent, last_used_user_agent)
  WHERE id = v_token_record.id;

  RETURN QUERY SELECT
    v_token_record.id,
    v_token_record.account_id,
    v_token_record.user_id,
    v_token_record.scopes,
    true,
    NULL::TEXT;
END;
$$;

-- Additional helper functions can be added here...
