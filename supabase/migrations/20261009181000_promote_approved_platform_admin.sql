-- Explicitly approved account; preserves password and community memberships.
BEGIN;
DO $promote$
DECLARE target_id uuid;
BEGIN
 SELECT id INTO STRICT target_id FROM auth.users WHERE lower(email)='jj1212t@gmail.com';
 INSERT INTO public.user_roles(user_id,role,community_id,created_by)
 VALUES(target_id,'admin',NULL,target_id)
 ON CONFLICT(user_id,role) WHERE community_id IS NULL DO NOTHING;
END $promote$;
INSERT INTO public.migration_logs(name,statements_count,success)
VALUES('20261009181000_promote_approved_platform_admin',1,true);
COMMIT;
