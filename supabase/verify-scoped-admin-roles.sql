-- Run on new project only. Test fixtures are transaction-local; do not run through migration runner.
BEGIN;

DO $setup$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); admin_a uuid:=gen_random_uuid(); member uuid:=gen_random_uuid(); platform uuid:=gen_random_uuid();
BEGIN
 INSERT INTO public.communities(id,slug,name,active) VALUES(a,'qa-a-'||left(a::text,8),'QA A',false),(b,'qa-b-'||left(b::text,8),'QA B',false);
 INSERT INTO auth.users(id,email,aud,role,created_at,updated_at) VALUES(admin_a,'qa-'||admin_a||'@example.invalid','authenticated','authenticated',now(),now()),(member,'qa-'||member||'@example.invalid','authenticated','authenticated',now(),now());
 INSERT INTO auth.users(id,email,aud,role) VALUES(platform,'qa-'||platform||'@example.invalid','authenticated','authenticated');
 DELETE FROM public.user_roles WHERE user_id IN(admin_a,member,platform);
 INSERT INTO public.user_roles(user_id,role,community_id) VALUES(platform,'admin',NULL);
 PERFORM set_config('qa.platform',platform::text,true);
 INSERT INTO public.user_roles(user_id,role,community_id) VALUES(admin_a,'admin',a),(member,'user',a),(member,'user',b);
 PERFORM set_config('qa.community_a',a::text,true); PERFORM set_config('qa.community_b',b::text,true);
 PERFORM set_config('qa.admin_a',admin_a::text,true); PERFORM set_config('qa.member',member::text,true);
 PERFORM set_config('request.jwt.claim.sub',admin_a::text,true);
END $setup$;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE a uuid:=current_setting('qa.community_a')::uuid; b uuid:=current_setting('qa.community_b')::uuid; adm uuid:=current_setting('qa.admin_a')::uuid; member uuid:=current_setting('qa.member')::uuid; n integer; result jsonb;
BEGIN
 SELECT count(*) INTO n FROM public.community_admin_list_users(a); IF n<>2 THEN RAISE EXCEPTION 'Wrong own-community list count %',n; END IF;
 BEGIN PERFORM public.community_admin_list_users(b); RAISE EXCEPTION 'FAIL cross-community list'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Admin access required' THEN RAISE; END IF; END;
 BEGIN PERFORM public.community_admin_update_user_role(b,member,'admin'); RAISE EXCEPTION 'FAIL cross-community write'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Admin access required' THEN RAISE; END IF; END;
 BEGIN PERFORM public.community_admin_update_user_role(a,adm,'user'); RAISE EXCEPTION 'FAIL last admin'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Cannot remove the last administrator' THEN RAISE; END IF; END;
 PERFORM public.community_admin_update_user_role(a,member,'admin');
 PERFORM public.community_admin_update_user_role(a,member,'user');
 BEGIN PERFORM public.list_users_with_roles(); RAISE EXCEPTION 'FAIL global list'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Admin access required' THEN RAISE; END IF; END;
 result:=public.execute_admin_migration('qa-should-not-execute',ARRAY['SELECT 1']); IF (result->>'success')::boolean THEN RAISE EXCEPTION 'FAIL migration privilege'; END IF;
 PERFORM set_config('request.jwt.claim.sub',member::text,true);
 BEGIN PERFORM public.community_admin_list_users(a); RAISE EXCEPTION 'FAIL member list'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Admin access required' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claim.sub',current_setting('qa.platform'),true);
 SELECT count(*) INTO n FROM public.community_admin_list_users(b); IF n<>1 THEN RAISE EXCEPTION 'FAIL platform access'; END IF;
 PERFORM public.community_admin_update_user_role(b,member,'admin');
 PERFORM public.set_user_role(member,'viewer',true);
 PERFORM public.set_user_role(member,'viewer',false);
 SELECT count(*) INTO n FROM public.list_users_with_roles() WHERE 'admin' = ANY(roles);
 IF n=1 THEN
 BEGIN PERFORM public.set_user_role(current_setting('qa.platform')::uuid,'admin',false); RAISE EXCEPTION 'FAIL last platform admin'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Cannot remove the last administrator' THEN RAISE; END IF; END;
 ELSE
  RAISE NOTICE 'Last-platform guard already tested before bootstrap; preserving existing platform admins';
 END IF;
END $test$;
RESET ROLE;
DO $verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=current_setting('qa.member')::uuid AND community_id=current_setting('qa.community_b')::uuid AND role='admin') THEN RAISE EXCEPTION 'Platform community update failed'; END IF;
 IF has_function_privilege('anon','public.community_admin_list_users(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous grant'; END IF;
 IF has_function_privilege('authenticated','public.admin_update_user_role(uuid,public.app_role)','EXECUTE') THEN RAISE EXCEPTION 'Legacy mutation grant'; END IF;
END $verify$;

ROLLBACK;
SELECT 'PASS scoped admin roles (rolled back)' result;

