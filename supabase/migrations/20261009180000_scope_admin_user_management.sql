-- Target: akmafwvxecexweqktgmw only. No existing account or role data is rewritten.
BEGIN;
CREATE OR REPLACE FUNCTION public.community_admin_list_users(p_community_id uuid)
RETURNS TABLE(id uuid,email text,name text,created_at timestamptz,last_sign_in_at timestamptz,role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_of(p_community_id) THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN QUERY SELECT u.id,u.email::text,coalesce(u.raw_user_meta_data->>'name',p.display_name,'')::text,u.created_at,u.last_sign_in_at,
 (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id=u.id AND ur.community_id=p_community_id ORDER BY CASE WHEN ur.role='admin' THEN 0 ELSE 1 END LIMIT 1)
 FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
 WHERE u.deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=u.id AND ur.community_id=p_community_id)
 ORDER BY u.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.community_admin_create_user(p_community_id uuid, p_email text, p_password text, p_name text DEFAULT ''::text, p_role app_role DEFAULT 'user'::app_role)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_id uuid := gen_random_uuid();
  v_email text := lower(btrim(p_email));
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_of(p_community_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF v_email IS NULL OR v_email = '' OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Password must contain at least 8 characters';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('admin','user') THEN RAISE EXCEPTION 'Invalid community role'; END IF;
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(), NULL, NULL,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', coalesce(p_name, '')),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', NULL, now(), now()
  );

  INSERT INTO public.user_roles (user_id, role, community_id, created_by) VALUES (v_id, p_role, p_community_id, auth.uid());
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.community_admin_update_user_role(p_community_id uuid,p_user_id uuid,p_role public.app_role)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_of(p_community_id) THEN RAISE EXCEPTION 'Admin access required'; END IF;
 -- Serialize role transitions per community, including the last-admin invariant.
 PERFORM 1 FROM public.communities WHERE id=p_community_id FOR UPDATE;
 IF NOT public.is_admin_of(p_community_id) THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF p_role IS NULL OR p_role NOT IN ('admin','user') THEN RAISE EXCEPTION 'Invalid community role'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND community_id=p_community_id) THEN RAISE EXCEPTION 'User not found in this community'; END IF;
 IF p_role<>'admin' AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND community_id=p_community_id AND role='admin')
 AND (SELECT count(*) FROM public.user_roles WHERE community_id=p_community_id AND role='admin')<=1 THEN RAISE EXCEPTION 'Cannot remove the last administrator'; END IF;
 DELETE FROM public.user_roles WHERE user_id=p_user_id AND community_id=p_community_id AND role<>p_role;
 INSERT INTO public.user_roles(user_id,role,community_id,created_by) VALUES(p_user_id,p_role,p_community_id,auth.uid())
 ON CONFLICT(user_id,role,community_id) WHERE community_id IS NOT NULL DO NOTHING;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.list_users_with_roles()
 RETURNS TABLE(user_id uuid, email text, display_name text, created_at timestamp with time zone, roles app_role[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    p.display_name,
    u.created_at,
    COALESCE(
      ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::public.app_role[]
    ) AS roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.community_id IS NULL
  GROUP BY u.id, u.email, p.display_name, u.created_at
  ORDER BY u.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_user_role(_target_user_id uuid, _role app_role, _grant boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF NOT _grant AND _role='admin'
    AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target_user_id AND role='admin' AND community_id IS NULL)
    AND (SELECT count(*) FROM public.user_roles WHERE role='admin' AND community_id IS NULL)<=1 THEN RAISE EXCEPTION 'Cannot remove the last administrator'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role, created_by, community_id)
    VALUES (_target_user_id, _role, auth.uid(), NULL)
    ON CONFLICT (user_id, role) WHERE community_id IS NULL DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = _role AND community_id IS NULL;
  END IF;

  RETURN json_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_admin_migration(p_name text, p_statements text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_statement text;
  v_count integer := coalesce(array_length(p_statements, 1), 0);
BEGIN
  IF v_uid IS NULL OR NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF coalesce(btrim(p_name), '') = '' OR v_count = 0 THEN RAISE EXCEPTION 'Migration name and statements are required'; END IF;
  FOREACH v_statement IN ARRAY p_statements LOOP
    IF coalesce(btrim(v_statement), '') = '' THEN CONTINUE; END IF;
    IF v_statement ~* '^\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION|ALTER\s+SYSTEM|DROP\s+DATABASE|DROP\s+ROLE|CREATE\s+ROLE|COPY\s+.+PROGRAM)' THEN
      RAISE EXCEPTION 'Blocked migration statement';
    END IF;
    EXECUTE v_statement;
  END LOOP;
  INSERT INTO public.migration_logs (name, statements_count, executed_by, success) VALUES (p_name, v_count, v_uid, true);
  RETURN jsonb_build_object('success', true, 'name', p_name, 'statements_count', v_count);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.migration_logs (name, statements_count, executed_by, success, error)
  VALUES (coalesce(nullif(btrim(p_name), ''), 'unnamed'), v_count, v_uid, false, SQLERRM);
  RETURN jsonb_build_object('success', false, 'name', p_name, 'error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_migration_history()
 RETURNS TABLE(id uuid, name text, statements_count integer, executed_at timestamp with time zone, success boolean, error text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT ml.id, ml.name, ml.statements_count, ml.executed_at, ml.success, ml.error
  FROM public.migration_logs ml WHERE public.is_platform_admin()
  ORDER BY ml.executed_at DESC LIMIT 200
$function$
;


-- Retire unscoped legacy CRUD. Service-role maintenance remains possible.
REVOKE ALL ON FUNCTION public.admin_create_user(text,text,text,public.app_role),public.admin_list_users(),public.admin_update_user_role(uuid,public.app_role),public.admin_delete_user(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.community_admin_list_users(uuid),public.community_admin_create_user(uuid,text,text,text,public.app_role),public.community_admin_update_user_role(uuid,uuid,public.app_role),public.set_user_role(uuid,public.app_role,boolean),public.list_users_with_roles(),public.execute_admin_migration(text,text[]),public.get_migration_history() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.community_admin_list_users(uuid),public.community_admin_create_user(uuid,text,text,text,public.app_role),public.community_admin_update_user_role(uuid,uuid,public.app_role),public.set_user_role(uuid,public.app_role,boolean),public.list_users_with_roles(),public.execute_admin_migration(text,text[]),public.get_migration_history() TO authenticated;

INSERT INTO public.migration_logs(name,statements_count,success) VALUES ('20261009180000_scope_admin_user_management',7,true);
COMMIT;

