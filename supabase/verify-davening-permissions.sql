-- Run only through the verified NEW project connection: akmafwvxecexweqktgmw.
-- Test changes are rolled back. Never run as a migration or mark as applied.
BEGIN;
INSERT INTO public.communities(slug,name,active)
VALUES ('qa-isolation-20261008','בדיקת בידוד זמנית',false);
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM auth.users WHERE lower(email)='jj1212t@gmail.com'),true);
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE main_id uuid; other_id uuid; changed integer;
BEGIN
  SELECT id INTO main_id FROM public.communities WHERE slug='main';
  SELECT id INTO other_id FROM public.communities WHERE slug='qa-isolation-20261008';
  IF NOT coalesce(public.is_admin_of(main_id),false) THEN RAISE EXCEPTION 'Own community access failed'; END IF;
  IF public.is_admin_of(other_id) THEN RAISE EXCEPTION 'Cross-community access granted'; END IF;
  UPDATE public.tv_config SET config=jsonb_build_object('qa','temporary') WHERE community_id=main_id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Board save failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tv_config_versions WHERE community_id=main_id) THEN
    RAISE EXCEPTION 'Version backup failed';
  END IF;
  UPDATE public.tv_config SET config=jsonb_build_object('qa','forbidden') WHERE community_id=other_id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>0 THEN RAISE EXCEPTION 'Cross-community write allowed'; END IF;
END $qa$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE anon;
DO $qa$ DECLARE changed integer; BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.tv_config) THEN RAISE EXCEPTION 'Public board read failed'; END IF;
  BEGIN
    UPDATE public.tv_config SET config='{}'::jsonb;
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF changed<>0 THEN RAISE EXCEPTION 'Anonymous write allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $qa$;
ROLLBACK;
SELECT 'PASS: admin save, version, tenant isolation, anonymous protection; test changes rolled back' AS result;
