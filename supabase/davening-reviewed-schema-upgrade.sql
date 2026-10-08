-- Target: akmafwvxecexweqktgmw ONLY. Reviewed upgrade of empty destination schema.
-- Original announcements, lessons, named communities and owner grants excluded.
-- Existing role is preserved and scoped to the initial community.
-- Backup: ../outputs/davening-before-schema-20261008.json (private, not committed).
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.communities') IS NOT NULL OR to_regclass('public.tv_config') IS NOT NULL THEN
  RAISE EXCEPTION 'This one-time upgrade expects the inspected pre-community schema';
 END IF;
 IF EXISTS (SELECT 1 FROM public.settings) OR EXISTS (SELECT 1 FROM public.announcements) THEN
  RAISE EXCEPTION 'Unexpected content: inspect before upgrade';
 END IF;
END $$;
-- SOURCE: 20260830090000_announcement_order_home_visibility.sql
-- Canonical publication order and per-announcement home-page visibility.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS sort_order integer;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT true;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (ORDER BY pinned DESC, created_at DESC, id) * 10 AS position
  FROM public.announcements
)
UPDATE public.announcements AS announcement
SET sort_order = ranked.position
FROM ranked
WHERE announcement.id = ranked.id
  AND announcement.sort_order IS NULL;

ALTER TABLE public.announcements
  ALTER COLUMN sort_order SET DEFAULT 100000,
  ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS announcements_publication_order_idx
  ON public.announcements (sort_order, created_at DESC);

-- SOURCE: 20260906120000_announcement_design.sql
-- Per-announcement presentation settings managed from the admin screen.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS style jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_style_object_check;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_style_object_check
  CHECK (jsonb_typeof(style) = 'object');

-- SOURCE: 20260906133000_karovim_header_and_daily_lesson.sql
-- Optional Karovim logo header, plus the daily lesson published in the supplied flyer.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS home_header_variant text NOT NULL DEFAULT 'standard';

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_home_header_variant_check;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_home_header_variant_check
  CHECK (home_header_variant IN ('standard', 'karovim_logo'));


-- SOURCE: 20260906150000_home_widget_layout_and_media.sql
-- Admin-controlled home layout and announcement media.
ALTER TABLE public.home_widgets
  ADD COLUMN IF NOT EXISTS layout_width text NOT NULL DEFAULT 'full';

ALTER TABLE public.home_widgets
  DROP CONSTRAINT IF EXISTS home_widgets_layout_width_check;

ALTER TABLE public.home_widgets
  ADD CONSTRAINT home_widgets_layout_width_check
  CHECK (layout_width IN ('full', 'half'));

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS home_width text NOT NULL DEFAULT 'half';

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_path text;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_home_width_check;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_home_width_check
  CHECK (home_width IN ('full', 'half'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media',
  'community-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "community media public read" ON storage.objects;
CREATE POLICY "community media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "community media admin insert" ON storage.objects;
CREATE POLICY "community media admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media' AND public.is_admin());

DROP POLICY IF EXISTS "community media admin update" ON storage.objects;
CREATE POLICY "community media admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'community-media' AND public.is_admin());

DROP POLICY IF EXISTS "community media admin delete" ON storage.objects;
CREATE POLICY "community media admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-media' AND public.is_admin());

-- SOURCE: 20260907103000_karovim_logo_dimensions.sql
-- Shared responsive dimensions for the optional Karovim header logo.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS karovim_logo_mobile_width integer NOT NULL DEFAULT 230,
  ADD COLUMN IF NOT EXISTS karovim_logo_mobile_height integer NOT NULL DEFAULT 130,
  ADD COLUMN IF NOT EXISTS karovim_logo_desktop_width integer NOT NULL DEFAULT 480,
  ADD COLUMN IF NOT EXISTS karovim_logo_desktop_height integer NOT NULL DEFAULT 270;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_mobile_width_check,
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_mobile_height_check,
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_desktop_width_check,
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_desktop_height_check;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_karovim_logo_mobile_width_check
    CHECK (karovim_logo_mobile_width BETWEEN 140 AND 360),
  ADD CONSTRAINT settings_karovim_logo_mobile_height_check
    CHECK (karovim_logo_mobile_height BETWEEN 70 AND 240),
  ADD CONSTRAINT settings_karovim_logo_desktop_width_check
    CHECK (karovim_logo_desktop_width BETWEEN 240 AND 720),
  ADD CONSTRAINT settings_karovim_logo_desktop_height_check
    CHECK (karovim_logo_desktop_height BETWEEN 120 AND 420);

-- SOURCE: 20260907120000_karovim_logo_position.sql
-- Shared responsive offsets for positioning the optional Karovim header logo.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS karovim_logo_mobile_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS karovim_logo_mobile_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS karovim_logo_desktop_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS karovim_logo_desktop_offset_y integer NOT NULL DEFAULT 0;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_mobile_offset_x_check,
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_mobile_offset_y_check,
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_desktop_offset_x_check,
  DROP CONSTRAINT IF EXISTS settings_karovim_logo_desktop_offset_y_check;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_karovim_logo_mobile_offset_x_check
    CHECK (karovim_logo_mobile_offset_x BETWEEN -120 AND 120),
  ADD CONSTRAINT settings_karovim_logo_mobile_offset_y_check
    CHECK (karovim_logo_mobile_offset_y BETWEEN -80 AND 80),
  ADD CONSTRAINT settings_karovim_logo_desktop_offset_x_check
    CHECK (karovim_logo_desktop_offset_x BETWEEN -240 AND 240),
  ADD CONSTRAINT settings_karovim_logo_desktop_offset_y_check
    CHECK (karovim_logo_desktop_offset_y BETWEEN -120 AND 120);

-- SOURCE: 20260918120000_enable_realtime_for_display.sql
-- Publish the community tables on the realtime change feed.
--
-- The synagogue TV display stays on one page indefinitely, so it cannot rely on
-- a page load to pick up edits. Without membership in supabase_realtime a
-- postgres_changes subscription connects successfully but never receives an
-- event, which would look like a silent failure on the wall.
--
-- Only the tables the public display and the community screens read are added.
-- Nothing here touches RLS: realtime still applies the same row policies, so a
-- subscriber receives exactly the rows it is allowed to select.

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'settings',
    'minyanim',
    'minyan_categories',
    'announcements',
    'shiurim',
    'shiur_categories',
    'chavrutot',
    'home_widgets'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = target
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target);
    END IF;
  END LOOP;
END;
$$;

-- UPDATE and DELETE events carry only the primary key unless the table records
-- the full previous row. The display diffs incoming rows, so it needs them.
ALTER TABLE public.settings REPLICA IDENTITY FULL;
ALTER TABLE public.minyanim REPLICA IDENTITY FULL;
ALTER TABLE public.minyan_categories REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.shiurim REPLICA IDENTITY FULL;
ALTER TABLE public.shiur_categories REPLICA IDENTITY FULL;
ALTER TABLE public.chavrutot REPLICA IDENTITY FULL;
ALTER TABLE public.home_widgets REPLICA IDENTITY FULL;

-- SOURCE: 20260918150000_minyan_display_mode_timeline_cards.sql
-- Allow the "ציר זמן" (timeline) and "כרטיסיות" (cards) schedule layouts.
--
-- Shipped in the same change as the two layouts themselves, so the picker never
-- offers an option the database refuses. That mismatch is exactly what broke
-- "טבלה מרוכזת": the UI gained the option, the constraint did not, and the
-- choice silently failed to save (see 20260918140000).
--
-- The constraint is kept, not dropped, so a typo or a stale client still gets a
-- clear rejection instead of storing a value no build can render.

ALTER TABLE public.minyan_categories
  DROP CONSTRAINT IF EXISTS minyan_categories_display_mode_valid;

ALTER TABLE public.minyan_categories
  ADD CONSTRAINT minyan_categories_display_mode_valid
  CHECK (display_mode IN ('tabs', 'list', 'table', 'timeline', 'cards'));

COMMENT ON COLUMN public.minyan_categories.display_mode IS
  'Public schedule layout for this category: tabs, list, table, timeline or cards.';

-- SOURCE: 20260918160000_tv_control_center.sql
-- =====================================================================
-- TV control center: devices, logs, remote commands, shared board config.
--
-- Model (mirrors how digital-signage systems work):
--   * A TV identifies itself with a random secret it generates on first boot.
--     Only a SHA-256 of it is stored. The TV has no user account, so every
--     write it makes goes through a SECURITY DEFINER function that checks the
--     secret - nothing is writable by the anon key directly.
--   * A new TV shows a 6-digit pairing code; an admin types it in the site to
--     approve the device. Until then the TV still shows the board.
--   * Disconnections are detected on the SERVER side by missed heartbeats
--     (a TV that is offline cannot report that it is offline). When it comes
--     back it uploads the events it buffered, including why it was cut off.
--   * Commands go through a table only admins can insert into; the TV
--     listens via realtime. A broadcast channel would be open to anyone who
--     holds the public key.
--
-- Idempotent. Uses the built-in sha256(), so no extension is required.
-- =====================================================================

-- ------------------------------------------------------------- devices --
CREATE TABLE IF NOT EXISTS public.tv_devices (
  id                 uuid PRIMARY KEY,
  name               text NOT NULL DEFAULT 'מסך חדש',
  secret_hash        text NOT NULL,
  approved           boolean NOT NULL DEFAULT false,
  approved_at        timestamptz,
  pairing_code       text,
  pairing_expires_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz,
  last_boot_at       timestamptz,
  app_version        text,
  info               jsonb NOT NULL DEFAULT '{}'::jsonb,
  state              jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS tv_devices_pairing_code_key
  ON public.tv_devices (pairing_code) WHERE pairing_code IS NOT NULL;

-- --------------------------------------------------------------- events --
CREATE TABLE IF NOT EXISTS public.tv_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id   uuid NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  level       text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  kind        text NOT NULL,
  message     text NOT NULL DEFAULT '',
  details     jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS tv_events_device_time_idx ON public.tv_events (device_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS tv_events_time_idx ON public.tv_events (occurred_at DESC);

-- --------------------------------------------------------------- config --
CREATE TABLE IF NOT EXISTS public.tv_config (
  id         text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.tv_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------- commands --
CREATE TABLE IF NOT EXISTS public.tv_commands (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- NULL = every screen.
  device_id  uuid REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  command    text NOT NULL CHECK (command IN
               ('pause', 'resume', 'next', 'prev', 'goto', 'reload', 'theme', 'snapshot', 'message', 'identify')),
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS tv_commands_time_idx ON public.tv_commands (created_at DESC);

-- ------------------------------------------------------------ snapshots --
-- Deliberately NOT on the realtime feed: an image is far larger than a
-- change event should carry. The admin polls the row after asking for one.
CREATE TABLE IF NOT EXISTS public.tv_snapshots (
  device_id   uuid PRIMARY KEY REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  image       text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------- RLS --
ALTER TABLE public.tv_devices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_commands  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tv_devices, public.tv_events, public.tv_config, public.tv_commands, public.tv_snapshots
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.tv_devices   TO authenticated;
GRANT SELECT, DELETE         ON public.tv_events    TO authenticated;
GRANT SELECT                 ON public.tv_config    TO anon, authenticated;
GRANT UPDATE                 ON public.tv_config    TO authenticated;
GRANT SELECT                 ON public.tv_commands  TO anon, authenticated;
GRANT INSERT                 ON public.tv_commands  TO authenticated;
GRANT SELECT, DELETE         ON public.tv_snapshots TO authenticated;
GRANT ALL ON public.tv_devices, public.tv_events, public.tv_config, public.tv_commands, public.tv_snapshots
  TO service_role;

DROP POLICY IF EXISTS "tv devices admin" ON public.tv_devices;
CREATE POLICY "tv devices admin" ON public.tv_devices FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tv events admin read" ON public.tv_events;
CREATE POLICY "tv events admin read" ON public.tv_events FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "tv events admin delete" ON public.tv_events;
CREATE POLICY "tv events admin delete" ON public.tv_events FOR DELETE TO authenticated USING (public.is_admin());

-- The board's look is public anyway (it hangs on a wall); every TV reads it.
DROP POLICY IF EXISTS "tv config public read" ON public.tv_config;
CREATE POLICY "tv config public read" ON public.tv_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "tv config admin write" ON public.tv_config;
CREATE POLICY "tv config admin write" ON public.tv_config FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- TVs must read commands to act on them; only admins can issue them.
DROP POLICY IF EXISTS "tv commands read" ON public.tv_commands;
CREATE POLICY "tv commands read" ON public.tv_commands FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "tv commands admin insert" ON public.tv_commands;
CREATE POLICY "tv commands admin insert" ON public.tv_commands FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tv snapshots admin" ON public.tv_snapshots;
CREATE POLICY "tv snapshots admin" ON public.tv_snapshots FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Keep the commands table small: a TV only acts on fresh commands.
CREATE OR REPLACE FUNCTION public.tv_commands_prune()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM public.tv_commands WHERE created_at < now() - interval '2 days';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tv_commands_prune ON public.tv_commands;
CREATE TRIGGER tv_commands_prune AFTER INSERT ON public.tv_commands
  FOR EACH STATEMENT EXECUTE FUNCTION public.tv_commands_prune();

-- ------------------------------------------------------ device RPCs --
-- Shared check: the device exists and presented its own secret.
CREATE OR REPLACE FUNCTION public.tv_authenticate(p_device_id uuid, p_secret text)
RETURNS public.tv_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
BEGIN
  SELECT * INTO d FROM public.tv_devices WHERE id = p_device_id;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'unknown device' USING ERRCODE = 'P0002';
  END IF;
  IF d.secret_hash <> encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex') THEN
    RAISE EXCEPTION 'device secret mismatch' USING ERRCODE = '28000';
  END IF;
  RETURN d;
END;
$$;
REVOKE ALL ON FUNCTION public.tv_authenticate(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tv_new_pairing_code()
RETURNS text LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.tv_devices WHERE pairing_code = code);
  END LOOP;
  RETURN code;
END;
$$;
REVOKE ALL ON FUNCTION public.tv_new_pairing_code() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tv_register(p_device_id uuid, p_secret text, p_info jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
  pending int;
BEGIN
  IF p_device_id IS NULL OR length(coalesce(p_secret, '')) < 32 THEN
    RAISE EXCEPTION 'invalid device credentials';
  END IF;
  IF octet_length(coalesce(p_info, '{}'::jsonb)::text) > 4000 THEN
    p_info := '{}'::jsonb;
  END IF;

  SELECT * INTO d FROM public.tv_devices WHERE id = p_device_id;
  IF d.id IS NULL THEN
    -- Cap unpaired devices so the public key cannot flood the table.
    DELETE FROM public.tv_devices
      WHERE NOT approved AND coalesce(last_seen_at, created_at) < now() - interval '7 days';
    SELECT count(*) INTO pending FROM public.tv_devices WHERE NOT approved;
    IF pending >= 25 THEN
      RAISE EXCEPTION 'too many unpaired screens - pair or remove some in the admin site';
    END IF;
    INSERT INTO public.tv_devices (id, secret_hash, pairing_code, pairing_expires_at, info, app_version,
                                   last_seen_at, last_boot_at)
    VALUES (p_device_id, encode(sha256(convert_to(p_secret, 'UTF8')), 'hex'),
            public.tv_new_pairing_code(), now() + interval '24 hours',
            coalesce(p_info, '{}'::jsonb), left(p_info ->> 'version', 40), now(), now())
    RETURNING * INTO d;
  ELSE
    d := public.tv_authenticate(p_device_id, p_secret);
    UPDATE public.tv_devices SET
      info = coalesce(p_info, info),
      app_version = coalesce(left(p_info ->> 'version', 40), app_version),
      last_seen_at = now(),
      last_boot_at = now(),
      pairing_code = CASE WHEN approved THEN NULL
                          WHEN pairing_code IS NULL OR pairing_expires_at < now() THEN public.tv_new_pairing_code()
                          ELSE pairing_code END,
      pairing_expires_at = CASE WHEN approved THEN NULL
                                WHEN pairing_code IS NULL OR pairing_expires_at < now() THEN now() + interval '24 hours'
                                ELSE pairing_expires_at END
    WHERE id = p_device_id
    RETURNING * INTO d;
  END IF;

  RETURN jsonb_build_object('approved', d.approved, 'name', d.name, 'pairing_code', d.pairing_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.tv_heartbeat(p_device_id uuid, p_secret text, p_state jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
BEGIN
  d := public.tv_authenticate(p_device_id, p_secret);
  IF octet_length(coalesce(p_state, '{}'::jsonb)::text) > 8000 THEN
    p_state := jsonb_build_object('error', 'state too large');
  END IF;
  UPDATE public.tv_devices
    SET last_seen_at = now(), state = coalesce(p_state, '{}'::jsonb)
    WHERE id = p_device_id
    RETURNING * INTO d;
  RETURN jsonb_build_object('approved', d.approved, 'name', d.name, 'pairing_code', d.pairing_code,
                            'server_time', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.tv_log(p_device_id uuid, p_secret text, p_events jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  e jsonb;
  n integer := 0;
  at timestamptz;
BEGIN
  PERFORM public.tv_authenticate(p_device_id, p_secret);
  IF jsonb_typeof(p_events) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR e IN SELECT value FROM jsonb_array_elements(p_events) LIMIT 200 LOOP
    BEGIN
      at := (e ->> 'at')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      at := now();
    END;
    -- A TV whose clock is wrong must not write events into the far past/future.
    IF at IS NULL OR at < now() - interval '30 days' OR at > now() + interval '1 day' THEN
      at := now();
    END IF;
    INSERT INTO public.tv_events (device_id, occurred_at, level, kind, message, details)
    VALUES (
      p_device_id,
      at,
      CASE WHEN e ->> 'level' IN ('info', 'warn', 'error') THEN e ->> 'level' ELSE 'info' END,
      left(coalesce(e ->> 'kind', 'event'), 40),
      left(coalesce(e ->> 'message', ''), 1000),
      CASE WHEN jsonb_typeof(e -> 'details') = 'object' AND octet_length((e -> 'details')::text) <= 4000
           THEN e -> 'details' ELSE '{}'::jsonb END
    );
    n := n + 1;
  END LOOP;

  DELETE FROM public.tv_events WHERE device_id = p_device_id AND occurred_at < now() - interval '90 days';
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.tv_put_snapshot(p_device_id uuid, p_secret text, p_image text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.tv_authenticate(p_device_id, p_secret);
  IF p_image IS NULL OR p_image NOT LIKE 'data:image/%' OR length(p_image) > 900000 THEN
    RAISE EXCEPTION 'invalid snapshot';
  END IF;
  INSERT INTO public.tv_snapshots (device_id, image, captured_at) VALUES (p_device_id, p_image, now())
  ON CONFLICT (device_id) DO UPDATE SET image = EXCLUDED.image, captured_at = EXCLUDED.captured_at;
END;
$$;

-- --------------------------------------------------------- admin RPC --
CREATE OR REPLACE FUNCTION public.tv_claim(p_code text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT * INTO d FROM public.tv_devices
    WHERE pairing_code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g')
      AND NOT approved AND pairing_expires_at > now();
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'קוד הצימוד לא נמצא או שפג תוקפו' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.tv_devices SET
    approved = true, approved_at = now(),
    name = coalesce(nullif(btrim(p_name), ''), name),
    pairing_code = NULL, pairing_expires_at = NULL
  WHERE id = d.id
  RETURNING * INTO d;
  INSERT INTO public.tv_events (device_id, occurred_at, level, kind, message)
  VALUES (d.id, now(), 'info', 'paired', 'המסך צומד למערכת');
  RETURN jsonb_build_object('id', d.id, 'name', d.name);
END;
$$;

REVOKE ALL ON FUNCTION public.tv_register(uuid, text, jsonb)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tv_heartbeat(uuid, text, jsonb)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tv_log(uuid, text, jsonb)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tv_put_snapshot(uuid, text, text)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tv_claim(text, text)               FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tv_register(uuid, text, jsonb)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tv_heartbeat(uuid, text, jsonb)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tv_log(uuid, text, jsonb)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tv_put_snapshot(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tv_claim(text, text)              TO authenticated;

-- ------------------------------------------------------------ realtime --
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tv_devices', 'tv_events', 'tv_config', 'tv_commands'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;
ALTER TABLE public.tv_devices REPLICA IDENTITY FULL;
ALTER TABLE public.tv_config  REPLICA IDENTITY FULL;

-- SOURCE: 20260918200000_tv_hardening.sql
-- TV control center hardening (2026-09-18, Claude) - from the code review of
-- 20260918160000_tv_control_center.sql. Only replaces two functions; no
-- table or data changes. CREATE OR REPLACE keeps the existing grants.
--
-- 1. tv_heartbeat renews an expired pairing code. Before, only tv_register
--    (at boot) did, so a TV left unpaired for more than 24 hours kept showing
--    a code that tv_claim refused until someone power-cycled it.
--
-- 2. tv_log from a screen that is not paired yet accepts only its boot line.
--    Anyone holding the public key can register a "screen"; before, it could
--    then push hundreds of error events per call, each shown to every admin
--    as a toast with attacker-written text.

CREATE OR REPLACE FUNCTION public.tv_heartbeat(p_device_id uuid, p_secret text, p_state jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
BEGIN
  d := public.tv_authenticate(p_device_id, p_secret);
  IF octet_length(coalesce(p_state, '{}'::jsonb)::text) > 8000 THEN
    p_state := jsonb_build_object('error', 'state too large');
  END IF;
  UPDATE public.tv_devices SET
    last_seen_at = now(),
    state = coalesce(p_state, '{}'::jsonb),
    pairing_code = CASE WHEN approved THEN NULL
                        WHEN pairing_code IS NULL OR pairing_expires_at < now() THEN public.tv_new_pairing_code()
                        ELSE pairing_code END,
    pairing_expires_at = CASE WHEN approved THEN NULL
                              WHEN pairing_code IS NULL OR pairing_expires_at < now() THEN now() + interval '24 hours'
                              ELSE pairing_expires_at END
  WHERE id = p_device_id
  RETURNING * INTO d;
  RETURN jsonb_build_object('approved', d.approved, 'name', d.name, 'pairing_code', d.pairing_code,
                            'server_time', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.tv_log(p_device_id uuid, p_secret text, p_events jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
  e jsonb;
  n integer := 0;
  at timestamptz;
BEGIN
  d := public.tv_authenticate(p_device_id, p_secret);
  IF jsonb_typeof(p_events) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR e IN SELECT value FROM jsonb_array_elements(p_events) LIMIT 200 LOOP
    -- Not paired yet: nobody vouches for this screen. Keep only its boot line
    -- (so the admin can see it came up), as info, and at most 5 per call.
    IF NOT d.approved AND (coalesce(e ->> 'kind', '') <> 'boot' OR n >= 5) THEN
      CONTINUE;
    END IF;
    BEGIN
      at := (e ->> 'at')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      at := now();
    END;
    -- A TV whose clock is wrong must not write events into the far past/future.
    IF at IS NULL OR at < now() - interval '30 days' OR at > now() + interval '1 day' THEN
      at := now();
    END IF;
    INSERT INTO public.tv_events (device_id, occurred_at, level, kind, message, details)
    VALUES (
      p_device_id,
      at,
      CASE WHEN NOT d.approved THEN 'info'
           WHEN e ->> 'level' IN ('info', 'warn', 'error') THEN e ->> 'level' ELSE 'info' END,
      left(coalesce(e ->> 'kind', 'event'), 40),
      left(coalesce(e ->> 'message', ''), 1000),
      CASE WHEN jsonb_typeof(e -> 'details') = 'object' AND octet_length((e -> 'details')::text) <= 4000
           THEN e -> 'details' ELSE '{}'::jsonb END
    );
    n := n + 1;
  END LOOP;

  DELETE FROM public.tv_events WHERE device_id = p_device_id AND occurred_at < now() - interval '90 days';
  RETURN n;
END;
$$;

-- SOURCE: 20260922100000_communities_tenant_layer.sql
-- =====================================================================
-- Communities: one system, many synagogues.
--
-- Until now this was one synagogue's system by construction: tv_config is
-- a single row pinned by CHECK (id = 'default'), and every content table
-- holds rows that belong to nobody in particular. Two synagogues on this
-- database today would edit each other's board.
--
-- This adds the missing dimension. A synagogue is a ROW, not an install:
-- same code, same APK, same deploy for all of them.
--
-- Three rules this migration is built around:
--
--   1. Nothing breaks today. The site and the screens that are live right
--      now keep working while the client catches up: every new column
--      carries a default that is correct as long as there is exactly one
--      synagogue, and the existing data is moved into it.
--
--   2. When it becomes ambiguous, it FAILS - it does not guess. The moment
--      a second synagogue exists, sole_community() returns NULL and a write
--      that forgot to say which synagogue it means hits a NOT NULL error.
--      A loud error beats a row silently written to the wrong shul.
--
--   3. The boundary is here, not in the queries. An admin of one synagogue
--      cannot write to another's rows even with a hand-written request,
--      because the policy - not the client - decides.
--
-- Reading stays public, as it is today: prayer times on a wall are not a
-- secret. What is scoped is WRITING, and which rows a screen asks for.
--
-- Nobody gains power here: existing admins become admins of the first
-- synagogue only. Cross-synagogue (platform) admin is granted by hand,
-- deliberately, afterwards.
--
-- Idempotent.
-- =====================================================================

-- --------------------------------------------------------- the table --
CREATE TABLE IF NOT EXISTS public.communities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Short, stable, URL-safe. Used for links and for telling them apart in
  -- logs; the display name can change without breaking either.
  slug       text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name       text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.communities TO anon, authenticated;
GRANT ALL    ON public.communities TO service_role;

-- ------------------------------------------- the first one is the one --
-- Seeded from the settings row that is already there, keeping its id, so
-- that "the synagogue" and "its settings" are the same identifier and the
-- move is traceable afterwards.
INSERT INTO public.communities (id, slug, name)
SELECT s.id, 'main', s.name
FROM public.settings s
WHERE NOT EXISTS (SELECT 1 FROM public.communities)
ORDER BY s.created_at
LIMIT 1;

-- A database with no settings row at all (a fresh clone) still needs one.
INSERT INTO public.communities (slug, name)
SELECT 'main', 'בית הכנסת'
WHERE NOT EXISTS (SELECT 1 FROM public.communities);

-- ------------------------------------------------- who belongs where --
-- NULL community_id = platform-wide: this person administers every
-- synagogue. Granted by hand, never by this migration.
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS user_roles_community_idx ON public.user_roles (community_id, user_id);

-- Everyone who has a role today is given it in the first synagogue, and
-- only there. No existing account quietly becomes able to touch the others.
UPDATE public.user_roles
SET community_id = (SELECT id FROM public.communities ORDER BY created_at LIMIT 1)
WHERE community_id IS NULL;

-- --------------------------------------------------------- the rules --

/**
 * The only community there is - or NULL once that stops being true.
 *
 * This is what lets the site that is deployed right now keep inserting
 * rows without knowing that synagogues exist. It is deliberately NOT a
 * "pick a sensible one" function: the day a second synagogue is added it
 * returns NULL, every column that leans on it is NOT NULL, and a client
 * that has not been taught to say which synagogue it means gets an error
 * instead of writing into somebody else's board.
 *
 * Remove the DEFAULTs that use it once every writer passes community_id.
 */
CREATE OR REPLACE FUNCTION public.sole_community()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN (SELECT count(*) FROM public.communities WHERE active) = 1
              THEN (SELECT id FROM public.communities WHERE active)
         END;
$$;

/** Administers every synagogue. Rare, and granted by hand. */
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND community_id IS NULL
  );
$$;

/**
 * Administers THIS synagogue. Every write policy below asks this and
 * nothing else, so there is one place to read and one place to be wrong.
 */
CREATE OR REPLACE FUNCTION public.is_admin_of(_community uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT _community IS NOT NULL AND (
    public.is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND community_id = _community
    )
  );
$$;

/** The synagogues this person may administer, for the picker in the admin. */
CREATE OR REPLACE FUNCTION public.my_communities()
RETURNS TABLE (id uuid, slug text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id, c.slug, c.name
  FROM public.communities c
  WHERE c.active AND public.is_admin_of(c.id)
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION public.sole_community()        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin()     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_of(uuid)       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_communities()        FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sole_community()     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_of(uuid)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_communities()     TO authenticated;

DROP POLICY IF EXISTS "communities public read"         ON public.communities;
DROP POLICY IF EXISTS "communities platform admin write" ON public.communities;
CREATE POLICY "communities public read"
  ON public.communities FOR SELECT USING (true);
CREATE POLICY "communities platform admin write"
  ON public.communities FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ------------------------------------------- the column, on each table --
-- Same three steps everywhere: add it, fill it in from the first
-- synagogue, then forbid it being empty. Done in one pass so that no table
-- is left half-converted if this is run twice.
DO $$
DECLARE
  t text;
  first_id uuid := (SELECT id FROM public.communities ORDER BY created_at LIMIT 1);
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'settings', 'minyan_categories', 'minyanim', 'announcements',
    'shiur_categories', 'shiurim', 'chavrutot', 'chavruta_requests',
    'admin_messages', 'home_widgets', 'app_themes'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS community_id uuid
         REFERENCES public.communities(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET community_id = $1 WHERE community_id IS NULL', t)
      USING first_id;
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN community_id SET DEFAULT public.sole_community()', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN community_id SET NOT NULL', t);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (community_id)', t || '_community_idx', t);
  END LOOP;
END $$;

-- A synagogue has exactly one settings row - it is its profile.
CREATE UNIQUE INDEX IF NOT EXISTS settings_community_key ON public.settings (community_id);

-- ------------------------------------------------ the board's own row --
-- tv_config was pinned to a single row by construction. The pin comes off;
-- the synagogue becomes the key. The existing row keeps its 'default' id,
-- so a client that has not been updated yet still finds it.
ALTER TABLE public.tv_config DROP CONSTRAINT IF EXISTS tv_config_id_check;
ALTER TABLE public.tv_config ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.tv_config
  ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE;
UPDATE public.tv_config
SET community_id = (SELECT id FROM public.communities ORDER BY created_at LIMIT 1)
WHERE community_id IS NULL;
ALTER TABLE public.tv_config ALTER COLUMN community_id SET DEFAULT public.sole_community();
ALTER TABLE public.tv_config ALTER COLUMN community_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tv_config_community_key ON public.tv_config (community_id);

-- Every synagogue gets a board row, so the admin never opens an empty one.
INSERT INTO public.tv_config (id, community_id, config)
SELECT c.id::text, c.id, '{}'::jsonb
FROM public.communities c
WHERE NOT EXISTS (SELECT 1 FROM public.tv_config x WHERE x.community_id = c.id);

-- ---------------------------------------------------------- a screen --
-- Nullable on purpose: a screen out of the box belongs to nobody. It is
-- given its synagogue at the moment an admin types its pairing code, and
-- an unpaired screen has no board to show.
ALTER TABLE public.tv_devices
  ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE;
UPDATE public.tv_devices
SET community_id = (SELECT id FROM public.communities ORDER BY created_at LIMIT 1)
WHERE community_id IS NULL AND approved;
CREATE INDEX IF NOT EXISTS tv_devices_community_idx ON public.tv_devices (community_id);

-- ------------------------------------------------- writing, per shul --
-- Reading stays open: what is on the wall is public either way, and an
-- anonymous reader has no identity to scope by - the client asks for the
-- synagogue it wants. Writing is what moves into the database's hands.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('settings',          'settings admin write'),
    ('minyan_categories', 'minyan categories admin write'),
    ('minyanim',          'minyanim admin write'),
    ('announcements',     'announcements admin write'),
    ('shiur_categories',  'shiur categories admin write'),
    ('shiurim',           'shiurim admin write'),
    ('chavrutot',         'chavrutot admin write'),
    ('home_widgets',      'home widgets admin write')
  ) AS v(tbl, pol) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (public.is_admin_of(community_id))
         WITH CHECK (public.is_admin_of(community_id))', r.pol, r.tbl);
  END LOOP;
END $$;

-- app_themes: split into the four it was written as.
DROP POLICY IF EXISTS "Admins can create app themes" ON public.app_themes;
DROP POLICY IF EXISTS "Admins can update app themes" ON public.app_themes;
DROP POLICY IF EXISTS "Admins can delete app themes" ON public.app_themes;
CREATE POLICY "Admins can create app themes" ON public.app_themes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_of(community_id));
CREATE POLICY "Admins can update app themes" ON public.app_themes
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(community_id)) WITH CHECK (public.is_admin_of(community_id));
CREATE POLICY "Admins can delete app themes" ON public.app_themes
  FOR DELETE TO authenticated USING (public.is_admin_of(community_id));

-- chavruta_requests: the public may still submit one, to one synagogue.
DROP POLICY IF EXISTS "admin reads all chavruta requests"   ON public.chavruta_requests;
DROP POLICY IF EXISTS "admin updates chavruta requests"     ON public.chavruta_requests;
DROP POLICY IF EXISTS "admin deletes chavruta requests"     ON public.chavruta_requests;
CREATE POLICY "admin reads all chavruta requests" ON public.chavruta_requests
  FOR SELECT TO authenticated USING (public.is_admin_of(community_id));
CREATE POLICY "admin updates chavruta requests" ON public.chavruta_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(community_id)) WITH CHECK (public.is_admin_of(community_id));
CREATE POLICY "admin deletes chavruta requests" ON public.chavruta_requests
  FOR DELETE TO authenticated USING (public.is_admin_of(community_id));

-- admin_messages: written by the public, read by that synagogue's gabbai.
DROP POLICY IF EXISTS "admin reads messages"   ON public.admin_messages;
DROP POLICY IF EXISTS "admin updates messages" ON public.admin_messages;
DROP POLICY IF EXISTS "admin deletes messages" ON public.admin_messages;
CREATE POLICY "admin reads messages" ON public.admin_messages
  FOR SELECT TO authenticated USING (public.is_admin_of(community_id));
CREATE POLICY "admin updates messages" ON public.admin_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(community_id)) WITH CHECK (public.is_admin_of(community_id));
CREATE POLICY "admin deletes messages" ON public.admin_messages
  FOR DELETE TO authenticated USING (public.is_admin_of(community_id));

-- tv_config and tv_devices.
DROP POLICY IF EXISTS "tv config admin write" ON public.tv_config;
CREATE POLICY "tv config admin write" ON public.tv_config
  FOR UPDATE TO authenticated
  USING (public.is_admin_of(community_id)) WITH CHECK (public.is_admin_of(community_id));

DROP POLICY IF EXISTS "tv devices admin" ON public.tv_devices;
CREATE POLICY "tv devices admin" ON public.tv_devices
  FOR ALL TO authenticated
  USING (public.is_admin_of(community_id)) WITH CHECK (public.is_admin_of(community_id));

-- Roles: an admin hands out roles inside their own synagogue. Only a
-- platform admin can create another platform admin, which is the one power
-- that must not be reachable from inside a single synagogue.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles"   ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles"   ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_admin_of(community_id) OR public.is_platform_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_of(community_id));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin_of(community_id));

-- ------------------------------------------- pairing hands it over ----
-- The screen learns which synagogue it belongs to here, and only here:
-- from the admin who typed its code. Nothing about the network, the
-- address or the hardware takes part in that decision.
DROP FUNCTION IF EXISTS public.tv_claim(text, text);
CREATE OR REPLACE FUNCTION public.tv_claim(p_code text, p_name text, p_community uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
  target uuid := coalesce(p_community, public.sole_community());
BEGIN
  IF target IS NULL THEN
    RAISE EXCEPTION 'צריך לבחור לאיזה בית כנסת המסך שייך' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.is_admin_of(target) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO d FROM public.tv_devices
    WHERE pairing_code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g')
      AND NOT approved AND pairing_expires_at > now();
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'קוד הצימוד לא נמצא או שפג תוקפו' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.tv_devices SET
    approved = true, approved_at = now(),
    community_id = target,
    name = coalesce(nullif(btrim(p_name), ''), name),
    pairing_code = NULL, pairing_expires_at = NULL
  WHERE id = d.id
  RETURNING * INTO d;

  INSERT INTO public.tv_events (device_id, occurred_at, level, kind, message)
  VALUES (d.id, now(), 'info', 'paired', 'המסך צומד למערכת');
  RETURN jsonb_build_object('id', d.id, 'name', d.name, 'community_id', d.community_id);
END;
$$;

REVOKE ALL ON FUNCTION public.tv_claim(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tv_claim(text, text, uuid) TO authenticated;

-- ------------------------------------------ the screen asks for its own --
/**
 * Which synagogue a screen belongs to, proved by the secret it holds.
 *
 * The screen cannot be trusted to name its own synagogue - anyone can post
 * a community id. It proves who it is the same way it does for every other
 * write, and the server answers with where it belongs.
 */
CREATE OR REPLACE FUNCTION public.tv_community(p_device_id uuid, p_secret text)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
BEGIN
  -- The one place that knows how a screen proves itself, asked again here
  -- rather than restated - two copies of that check would drift.
  d := public.tv_authenticate(p_device_id, p_secret);
  IF NOT d.approved THEN
    RETURN NULL;
  END IF;
  RETURN d.community_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tv_community(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tv_community(uuid, text) TO anon, authenticated;

-- SOURCE: 20260922120000_add_communities.sql
-- =====================================================================
-- Two more synagogues, and the machinery to add the next one in a line.
--
-- Adding a synagogue must not be a checklist that someone can get wrong.
-- A synagogue without its settings row has no name, no address and no
-- coordinates, so its zmanim are somebody else's; one without a board row
-- opens an empty editor. Both are created here by a trigger, so they
-- cannot be forgotten - by me now or by the "add synagogue" button later.
--
-- The two new ones are created INACTIVE on purpose. sole_community()
-- counts only active ones, so the site and the screens that are deployed
-- right now - which do not yet know that synagogues exist - keep working
-- exactly as they did. They are switched on in the migration that follows
-- the client being able to handle them.
--
-- Idempotent.
-- =====================================================================

-- ------------------------------------- one person, several synagogues --
-- user_roles carried UNIQUE (user_id, role) from when there was one
-- synagogue, where it was exactly right: one admin row per person. With
-- several it is the wrong shape - it says a person may administer at most
-- one synagogue in the world, which is the opposite of what is being
-- built. The role is now unique per person PER SYNAGOGUE, and separately
-- a person may hold the platform-wide role once.
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_member_key
  ON public.user_roles (user_id, role, community_id) WHERE community_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_platform_key
  ON public.user_roles (user_id, role) WHERE community_id IS NULL;

-- --------------------------------------- a synagogue is never half-made --
CREATE OR REPLACE FUNCTION public.community_scaffold()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Its profile: the name it was given, and the defaults of the table for
  -- everything an admin has to set anyway (address, coordinates, offsets).
  INSERT INTO public.settings (community_id, name)
  VALUES (NEW.id, NEW.name)
  ON CONFLICT (community_id) DO NOTHING;

  -- Its board, so the editor never opens on nothing.
  INSERT INTO public.tv_config (id, community_id, config)
  VALUES (NEW.id::text, NEW.id, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_scaffold ON public.communities;
CREATE TRIGGER community_scaffold
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.community_scaffold();

-- ------------------------------------------------ adding one, by name --
/**
 * Creates a synagogue. Only somebody who already administers every
 * synagogue may add another, and the slug is derived here rather than
 * asked for, so two people cannot invent two spellings of the same one.
 */
CREATE OR REPLACE FUNCTION public.create_community(p_name text, p_slug text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  new_id uuid;
  base   text;
  try    text;
  n      int := 1;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform admin access required';
  END IF;
  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'צריך שם לבית הכנסת';
  END IF;

  -- A Hebrew name has no useful latin slug, so fall back to a readable
  -- one rather than mangling it into nothing.
  base := regexp_replace(lower(coalesce(p_slug, p_name)), '[^a-z0-9]+', '-', 'g');
  base := btrim(base, '-');
  IF length(base) < 3 THEN base := 'shul'; END IF;
  base := left(base, 34);

  try := base;
  WHILE EXISTS (SELECT 1 FROM public.communities WHERE slug = try) LOOP
    n := n + 1;
    try := base || '-' || n;
  END LOOP;

  INSERT INTO public.communities (slug, name) VALUES (try, btrim(p_name))
  RETURNING id INTO new_id;

  -- Whoever created it administers it, without a second step.
  INSERT INTO public.user_roles (user_id, role, community_id)
  VALUES (auth.uid(), 'admin', new_id)
  ON CONFLICT DO NOTHING;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_community(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_community(text, text) TO authenticated;


-- SOURCE: 20260922130000_admin_of_real_community.sql
-- =====================================================================
-- is_admin_of() answers about a synagogue that exists, or says no.
--
-- As written, a platform admin was "admin of" any uuid at all, including
-- one belonging to no synagogue. Nothing could be reached through it -
-- no row carries an id that is not in communities - so this closed no
-- hole. But a question about a synagogue that does not exist has one
-- honest answer, and a permission check that says yes to nonsense is a
-- check nobody can reason about later.
--
-- Idempotent.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin_of(_community uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT _community IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.communities WHERE id = _community)
     AND (
       public.is_platform_admin() OR EXISTS (
         SELECT 1 FROM public.user_roles
         WHERE user_id = auth.uid() AND role = 'admin' AND community_id = _community
       )
     );
$$;

-- SOURCE: 20260922140000_approved_requests_per_community.sql
-- =====================================================================
-- The public list of chavruta requests belongs to one synagogue.
--
-- This function reads chavruta_requests past RLS - that is its job: the
-- table itself is closed to the public, and this hands out only the
-- approved rows, with contact details blanked unless the person agreed to
-- share them. Which means it is also the one read on the site that a
-- policy cannot scope for us. It has to ask.
--
-- The argument defaults to the only synagogue there is, so the site that
-- is deployed right now keeps working until it is taught to pass one.
--
-- Idempotent.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.list_approved_chavruta_requests(
  p_community uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, name text, topic text, level text, intent text,
  study_format text, availability text, notes text,
  phone text, email text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id, r.name, r.topic, r.level, r.intent, r.study_format,
         r.availability, r.notes,
         CASE WHEN r.share_contact THEN r.phone ELSE '' END,
         CASE WHEN r.share_contact THEN r.email ELSE '' END,
         r.created_at
  FROM public.chavruta_requests r
  WHERE r.status = 'approved'
    AND r.community_id = coalesce(p_community, public.sole_community())
  ORDER BY r.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_approved_chavruta_requests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_approved_chavruta_requests(uuid) TO anon, authenticated;

-- The old no-argument form would now be ambiguous against the new one.
DROP FUNCTION IF EXISTS public.list_approved_chavruta_requests();

-- SOURCE: 20260922160000_tv_community_answers_quietly.sql
-- =====================================================================
-- "Which synagogue is this screen?" has an answer for an unknown screen.
--
-- tv_community leaned on tv_authenticate, which raises for a device it has
-- never seen - right for a write, wrong for this. Every screen asks this
-- question on its first boot, before it has registered, and got back a 500
-- and a red line in the console for asking something perfectly reasonable.
--
-- An unknown or unpaired screen belongs to no synagogue. That is a NULL,
-- not a failure. It still proves itself: a screen that gives the wrong
-- secret is told nothing, exactly as before.
--
-- Idempotent.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.tv_community(p_device_id uuid, p_secret text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.community_id
  FROM public.tv_devices d
  WHERE d.id = p_device_id
    AND d.approved
    AND d.secret_hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex');
$$;

REVOKE ALL ON FUNCTION public.tv_community(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tv_community(uuid, text) TO anon, authenticated;

-- SOURCE: 20260922180000_unique_per_community.sql
-- Uniqueness that means "once per synagogue", not "once in the world".
--
-- Three tables were given a community_id by the tenant layer but kept the
-- unique keys they were born with, back when there was one synagogue and
-- "the weekday tab" could only mean one thing:
--
--   minyan_categories.system_key   UNIQUE
--   shiur_categories.name          UNIQUE
--   home_widgets.key               UNIQUE
--
-- The second synagogue therefore could not have a weekday tab at all. Its
-- board read "לא הוגדרו מניינים להיום" - which is true, and says nothing -
-- and the server, when asked to create the tab, answered
-- "duplicate key value violates unique constraint". Not a data problem: a
-- rule from an earlier shape of the world, still being enforced.
--
-- This is the same mistake as user_roles_user_id_role_key, which stopped one
-- person administering two synagogues. Both were written when the answer to
-- "which synagogue?" was "the synagogue". The fix is the same: put the
-- synagogue in the key.
--
-- Widening a unique key can never fail on existing rows - anything unique
-- globally is unique within a community - so there is nothing to clean up
-- first.

ALTER TABLE public.minyan_categories DROP CONSTRAINT IF EXISTS minyan_categories_system_key_key;
ALTER TABLE public.shiur_categories  DROP CONSTRAINT IF EXISTS shiur_categories_name_key;
ALTER TABLE public.home_widgets      DROP CONSTRAINT IF EXISTS home_widgets_key_key;

-- system_key is nullable: a tab the gabbai invented has no system key, and
-- any number of those may exist. NULLs stay distinct from each other, which
-- is what the old constraint did too.
CREATE UNIQUE INDEX IF NOT EXISTS minyan_categories_community_system_key
  ON public.minyan_categories (community_id, system_key);

CREATE UNIQUE INDEX IF NOT EXISTS shiur_categories_community_name_key
  ON public.shiur_categories (community_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS home_widgets_community_key
  ON public.home_widgets (community_id, key);

-- SOURCE: 20260922190000_managing_several_synagogues.sql
-- Being the administrator of more than one synagogue.
--
-- Everything so far has been about a *screen* knowing which synagogue it
-- belongs to. This is the other side: a person, at a desk, who looks after
-- several, and has to be able to say which one they are editing - and to see
-- at a glance which one that is, because an edit that lands in the wrong
-- synagogue is not an error anybody notices. It simply appears on somebody
-- else's wall.

-- ---------------------------------------------------- one that is not live --
-- my_communities() listed only synagogues with active = true, so a synagogue
-- being prepared could not be selected at all - and preparing it before it
-- opens is the whole reason "switched off" exists. Between creating a
-- synagogue and opening it there was no way to put anything into it, which is
-- exactly backwards: check it on a real screen first, then open it.
--
-- It now returns whether each one is live, so the picker can say so rather
-- than hide it. Nothing here grants access: is_admin_of() still decides.
DROP FUNCTION IF EXISTS public.my_communities();

CREATE FUNCTION public.my_communities()
RETURNS TABLE (id uuid, slug text, name text, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id, c.slug, c.name, c.active
  FROM public.communities c
  WHERE public.is_admin_of(c.id)
  ORDER BY c.active DESC, c.name;
$$;

-- ------------------------------------------------------------ the overview --
-- What somebody running several of these needs on one page: which synagogues
-- exist, which are live, and how much is actually in each - because "switched
-- on with nothing in it" is the state that puts an empty board on a wall, and
-- it stays invisible until somebody walks into that shul.
--
-- The counts come from here rather than from a dozen queries in the browser:
-- one answer, and one place where "how many screens does it have" is defined.
DROP FUNCTION IF EXISTS public.communities_overview();

CREATE FUNCTION public.communities_overview()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  active boolean,
  screens integer,
  minyanim integer,
  announcements integer,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    c.id, c.slug, c.name, c.active,
    (SELECT count(*) FROM public.tv_devices d
       WHERE d.community_id = c.id AND d.approved)::integer,
    (SELECT count(*) FROM public.minyanim m
       WHERE m.community_id = c.id AND m.active)::integer,
    (SELECT count(*) FROM public.announcements a
       WHERE a.community_id = c.id)::integer,
    c.created_at
  FROM public.communities c
  WHERE public.is_admin_of(c.id)
  ORDER BY c.active DESC, c.name;
$$;

-- -------------------------------------------------- created switched off --
-- create_community() does not set `active`, and the column's default was
-- true, so a synagogue went live the instant it was named - before it had a
-- city, a minyan or a screen. The moment a second synagogue is live the
-- public site stops showing one synagogue and starts asking visitors which
-- one they want, so naming a synagogue was enough to change what every
-- visitor sees.
--
-- A new synagogue is now switched off. Opening it stays what it should be: a
-- separate, deliberate act, after somebody has looked at it.
ALTER TABLE public.communities ALTER COLUMN active SET DEFAULT false;

COMMENT ON COLUMN public.communities.active IS
  'Shown to the public. New synagogues start false: prepare first, open second.';

REVOKE ALL ON FUNCTION public.my_communities()       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.communities_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_communities()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.communities_overview() TO authenticated;

-- SOURCE: 20260923100000_minyan_overrides.sql
-- A minyan that is different on one day, without changing the minyan.
--
-- The timetable on the wall is the regular week. What it cannot say today is
-- "מנחה היום ב-13:00 ולא ב-13:30", or "ערבית מבוטלת היום". Until now the only
-- way to say either was to edit the minyan itself, which changes every other
-- day too - and then to remember to change it back. Nobody remembers to
-- change it back, so a board quietly carries last week's exception for a
-- month.
--
-- One row, one minyan, one date. No row is the normal case and costs nothing:
-- a board with no overrides behaves exactly as it did before this table
-- existed.
--
-- Deliberately *not* a second timetable. It holds only what differs, it is
-- keyed to a single date, and a row whose date has passed is dead weight
-- rather than a rule - which is what makes it safe to forget about.

CREATE TABLE IF NOT EXISTS public.minyan_overrides (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  minyan_id    uuid NOT NULL REFERENCES public.minyanim(id)    ON DELETE CASCADE,
  on_date      date NOT NULL,
  -- NULL keeps the minyan's own time: an override can be only a cancellation,
  -- or only a note ("היום בעזרת הנשים").
  at_time      time,
  cancelled    boolean NOT NULL DEFAULT false,
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- One exception per minyan per day. A second one would be two answers to
  -- "what time is mincha today", and the board would pick whichever came back
  -- first.
  CONSTRAINT minyan_overrides_one_per_day UNIQUE (minyan_id, on_date),

  -- A row that changes nothing is a row somebody will later read as meaning
  -- something.
  CONSTRAINT minyan_overrides_says_something
    CHECK (cancelled OR at_time IS NOT NULL OR btrim(note) <> '')
);

CREATE INDEX IF NOT EXISTS minyan_overrides_community_date_idx
  ON public.minyan_overrides (community_id, on_date);

ALTER TABLE public.minyan_overrides ENABLE ROW LEVEL SECURITY;

-- Read by everyone, like the timetable it belongs to: the board on the wall
-- has no account, and neither does somebody checking mincha from the street.
DROP POLICY IF EXISTS "minyan overrides public read" ON public.minyan_overrides;
CREATE POLICY "minyan overrides public read"
  ON public.minyan_overrides FOR SELECT USING (true);

DROP POLICY IF EXISTS "minyan overrides admin write" ON public.minyan_overrides;
CREATE POLICY "minyan overrides admin write"
  ON public.minyan_overrides FOR ALL TO authenticated
  USING (public.is_admin_of(community_id))
  WITH CHECK (public.is_admin_of(community_id));

GRANT SELECT ON public.minyan_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.minyan_overrides TO authenticated;

-- Housekeeping: yesterday's exception is not a rule and should not be read as
-- one. Kept for a week so that "what happened last Tuesday" is still
-- answerable, then removed. Called from the admin; nothing depends on it
-- having run.
CREATE OR REPLACE FUNCTION public.prune_minyan_overrides()
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH gone AS (
    DELETE FROM public.minyan_overrides
    WHERE on_date < (current_date - 7) AND public.is_admin_of(community_id)
    RETURNING 1
  )
  SELECT count(*)::integer FROM gone;
$$;

REVOKE ALL ON FUNCTION public.prune_minyan_overrides() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_minyan_overrides() TO authenticated;

-- SOURCE: 20260925010000_realtime_minyan_overrides.sql
-- One-day exceptions reach the wall live, like every other table it shows.
--
-- The TV subscribes to minyan_overrides (useBoardData), but the table was
-- never added to the realtime publication, so a gabbai cancelling tonight's
-- ma'ariv saw it on the website while the board kept the old time until it
-- happened to reload. Same two steps as 20260918120000_enable_realtime_for_display.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'minyan_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.minyan_overrides;
  END IF;
END;
$$;

ALTER TABLE public.minyan_overrides REPLICA IDENTITY FULL;

-- SOURCE: 20260926200000_shabbat_end_minutes.sql
-- When Shabbat and Yom Tov end: one number per synagogue, in its settings.
--
-- The TV board kept its own "צאת השבת" minutes (tv_config.config.shabbat.
-- endMinutesAfterSunset) and the website used a fixed 40, so a gabbai who set
-- 72 (ר"ת) on the board would have had the website show a different end.
-- It now lives with the other zmanim settings (candle lighting, nightfall),
-- and every screen reads it from here. The end shown is the later of
-- nightfall and sunset + these minutes (specialDays.holyDayEnd).
--
-- Default 40, as the board's was. The same range the board allowed (18-90).
-- A value a synagogue already set on its board is carried over.
-- Idempotent.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS shabbat_end_minutes integer NOT NULL DEFAULT 40;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_shabbat_end_minutes_check;
ALTER TABLE public.settings
  ADD CONSTRAINT settings_shabbat_end_minutes_check
  CHECK (shabbat_end_minutes BETWEEN 18 AND 90);

UPDATE public.settings s
SET shabbat_end_minutes = LEAST(90, GREATEST(18, (t.config -> 'shabbat' ->> 'endMinutesAfterSunset')::integer))
FROM public.tv_config t
WHERE t.community_id = s.community_id
  AND (t.config -> 'shabbat' ->> 'endMinutesAfterSunset') ~ '^[0-9]+$';

-- SOURCE: 20260926230000_minyan_season_dates.sql
-- A minyan for a season: בין הזמנים, summer or winter hours.
--
-- A tab (minyan_categories) already has visible_from / visible_until, but a
-- season usually adds a few minyanim to the ordinary list rather than
-- replacing it: "מניינים נוספים לימי בין הזמנים, שאר הזמנים כרגיל". So the
-- dates belong on the minyan too. Both are optional and inclusive days in
-- Israel; empty means always, which is every existing row.
ALTER TABLE public.minyanim
  ADD COLUMN IF NOT EXISTS active_from  date,
  ADD COLUMN IF NOT EXISTS active_until date;

ALTER TABLE public.minyanim
  DROP CONSTRAINT IF EXISTS minyanim_season_order;
ALTER TABLE public.minyanim
  ADD CONSTRAINT minyanim_season_order
  CHECK (active_from IS NULL OR active_until IS NULL OR active_from <= active_until);

COMMENT ON COLUMN public.minyanim.active_from  IS 'First day (Israel) this minyan is held; null = no start.';
COMMENT ON COLUMN public.minyanim.active_until IS 'Last day (Israel) this minyan is held; null = no end.';

-- SOURCE: 20260927100000_my_submissions.sql
-- "הפניות שלי": a member sees what they sent the gabbai - messages and
-- chavruta requests - and what became of them (read / approved / declined).
--
-- Neither table recorded who sent a row, so a member could not be shown their
-- own. Each row now carries its sender, set by the database from the session
-- (never from the request body, so nobody can file a message under someone
-- else's name), and a signed-in member may read their own rows. Everything
-- the gabbai could do before is unchanged. Rows sent before this have no
-- sender and stay visible to the gabbai only.

ALTER TABLE public.admin_messages
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.chavruta_requests
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS admin_messages_sender_idx ON public.admin_messages (sender_id) WHERE sender_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS chavruta_requests_sender_idx ON public.chavruta_requests (sender_id) WHERE sender_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.stamp_sender()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.sender_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_messages_stamp_sender ON public.admin_messages;
CREATE TRIGGER admin_messages_stamp_sender
  BEFORE INSERT ON public.admin_messages
  FOR EACH ROW EXECUTE FUNCTION public.stamp_sender();

DROP TRIGGER IF EXISTS chavruta_requests_stamp_sender ON public.chavruta_requests;
CREATE TRIGGER chavruta_requests_stamp_sender
  BEFORE INSERT ON public.chavruta_requests
  FOR EACH ROW EXECUTE FUNCTION public.stamp_sender();

DROP POLICY IF EXISTS "sender reads own messages" ON public.admin_messages;
CREATE POLICY "sender reads own messages" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (sender_id IS NOT NULL AND sender_id = auth.uid());

DROP POLICY IF EXISTS "sender reads own chavruta requests" ON public.chavruta_requests;
CREATE POLICY "sender reads own chavruta requests" ON public.chavruta_requests
  FOR SELECT TO authenticated
  USING (sender_id IS NOT NULL AND sender_id = auth.uid());

-- SOURCE: 20260928170000_screen_chooses_its_synagogue.sql
-- =====================================================================
-- A screen can be pointed at another synagogue, from the remote.
--
-- Until now the answer to "which synagogue is this screen?" came only from
-- the admin who typed its pairing code, and the screen itself was never
-- asked - which is right for pairing and wrong for a hall where one display
-- serves several minyanim, or for a gabbai standing under the board with a
-- remote in his hand and no computer.
--
-- So the screen may now move itself. It proves who it is with the same
-- secret it uses for everything else, and the choice is written to its own
-- row rather than kept on the box. That is the whole point of putting it
-- here: a reinstall wipes the box - deliberately, since cloud backup was
-- turned off after one restored a stale identity - and the choice has to
-- outlive that. It is also then visible in the control centre, so nobody
-- has to wonder why a screen is showing what it is showing.
--
-- What a screen may NOT do is pair itself, take a community that is not
-- there, or touch another screen's row. It may only move itself, and only
-- between synagogues that exist.
--
-- Idempotent.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.tv_set_community(
  p_device_id uuid,
  p_secret text,
  p_community_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d public.tv_devices;
  c public.communities;
BEGIN
  -- Raises for a wrong secret, as every writing device function does.
  d := public.tv_authenticate(p_device_id, p_secret);

  -- A screen that has not been paired yet has nothing to move. Pairing is
  -- still the admin's act, and this must not become a way around it.
  IF d.community_id IS NULL THEN
    RAISE EXCEPTION 'screen is not paired' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO c FROM public.communities WHERE id = p_community_id;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'no such synagogue' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tv_devices
     SET community_id = c.id
   WHERE id = p_device_id
   RETURNING * INTO d;

  -- Said out loud in the screen's own log, because a board that changes what
  -- it shows should never be a mystery to whoever reads the reports later.
  --
  -- occurred_at is spelled out: it is when the thing happened, normally sent
  -- by the screen, and the column takes no default. Leaving it out made the
  -- insert fail on NOT NULL and took the whole move down with it - which is
  -- at least the right way round, since the transaction meant no screen was
  -- left moved with nothing in its log to say so.
  INSERT INTO public.tv_events (device_id, occurred_at, level, kind, message, details)
  VALUES (p_device_id, now(), 'info', 'command',
          'המסך הועבר לבית הכנסת: ' || c.name,
          jsonb_build_object('community_id', c.id, 'slug', c.slug));

  RETURN jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name);
END;
$$;

REVOKE ALL ON FUNCTION public.tv_set_community(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tv_set_community(uuid, text, uuid) TO anon, authenticated;

-- SOURCE: 20260929180000_synagogue_logos.sql
-- Logos of a synagogue, and which one its site header shows.
--
-- The header could show the name and address, or one fixed picture - the
-- קרובים logo, the same file for every synagogue on the system. Each
-- synagogue now keeps its own logos (uploaded in its details, under "בתי
-- כנסת"), as many as it likes, and the header shows the one chosen in
-- "תצוגת דף הבית".
--
--   logos       [{ "id", "url", "path", "name" }], files in community-media/logos/
--   header_logo the id of the logo in the header; NULL = the built-in קרובים
--               logo, which is what every header in logo mode showed until now,
--               so nothing on any site changes by this migration.
--
-- home_header_variant keeps its two values ('standard' = name and address,
-- 'karovim_logo' = a logo); the constraint is unchanged.
-- Idempotent.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS logos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS header_logo text;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_logos_is_array;
ALTER TABLE public.settings
  ADD CONSTRAINT settings_logos_is_array CHECK (jsonb_typeof(logos) = 'array');

-- SOURCE: 20260929210000_tv_command_update.sql
-- "עדכון אפליקציה עכשיו": a command the admin can send to a screen.
--
-- From app 1.38 a box on Android 12+ updates itself silently at night
-- (android-tv AutoUpdate). This lets the admin ask for it now, from
-- "מסכים מחוברים", instead of waiting for the night. The board handles it in
-- TvApp ("update") by asking the app, through NativeBridge, to check, fetch
-- and install. The command list is a CHECK constraint, so it is widened here
-- together with the code that sends it. Idempotent.

ALTER TABLE public.tv_commands DROP CONSTRAINT IF EXISTS tv_commands_command_check;
ALTER TABLE public.tv_commands ADD CONSTRAINT tv_commands_command_check CHECK (command IN
  ('pause', 'resume', 'next', 'prev', 'goto', 'reload', 'theme', 'snapshot', 'message', 'identify', 'update'));

-- SOURCE: 20261001090000_logo_library.sql
-- A shared library of logos for the TV boards.
--
-- The TV header drew one logo from a file inside the code (Effi Capital), on
-- every synagogue's board, though it belongs to one of them. Logos are now
-- files uploaded by the gabbaim into one library, open to every synagogue on
-- the system; each board chooses which of them it shows (tv_config.config.logos,
-- a copy of the chosen entries, so a TV that is offline still has them).
--
--   url        the logo, as drawn on a light board
--   url_dark   optional: the same mark cut for a dark board (a dark wordmark
--              disappears on navy); the board picks the cut by its theme
--   path, path_dark  the files in community-media/logo-library/, so a logo
--              can be removed together with its files
--
-- Anyone reads it (the TV reads it without signing in; the files are public
-- anyway). Any admin adds to it - that is what makes it shared. Only whoever
-- uploaded a logo, or a platform admin, changes or removes it: another
-- synagogue's board may be showing it.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.logo_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  url text NOT NULL CHECK (url LIKE 'https://%'),
  path text,
  url_dark text CHECK (url_dark IS NULL OR url_dark LIKE 'https://%'),
  path_dark text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.logo_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logo library read" ON public.logo_library;
CREATE POLICY "logo library read" ON public.logo_library
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "logo library admin insert" ON public.logo_library;
CREATE POLICY "logo library admin insert" ON public.logo_library
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "logo library owner update" ON public.logo_library;
CREATE POLICY "logo library owner update" ON public.logo_library
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR (public.is_admin() AND created_by = auth.uid()))
  WITH CHECK (public.is_platform_admin() OR (public.is_admin() AND created_by = auth.uid()));

DROP POLICY IF EXISTS "logo library owner delete" ON public.logo_library;
CREATE POLICY "logo library owner delete" ON public.logo_library
  FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR (public.is_admin() AND created_by = auth.uid()));

GRANT SELECT ON public.logo_library TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.logo_library TO authenticated;

-- SOURCE: 20261001200000_links_stay_in_their_synagogue.sql
-- A row may point only at a row of its own synagogue.
--
-- Three links run between the tables each synagogue owns:
--   minyanim.category_id          -> minyan_categories   (delete: CASCADE)
--   minyan_overrides.minyan_id    -> minyanim            (delete: CASCADE)
--   shiurim.category_id           -> shiur_categories    (delete: SET NULL)
--
-- Each was a plain foreign key on the id alone, and a cascade runs past row
-- level security. So a minyan of synagogue B that pointed at a category of
-- synagogue A was deleted when A's gabbai deleted that category - by someone
-- with no rights over B at all. Nothing wrote such a link (none exists, checked
-- 2026-10-01), but nothing refused one either.
--
-- Now each link is on (id, community_id): the database itself refuses a link
-- across synagogues, so a delete can only ever reach rows of the synagogue it
-- was made in. The delete behaviour is as before.
--
-- One statement, so it is applied whole or not at all.
DO $$
DECLARE
  r record;
  c record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('minyanim',         'category_id', 'minyan_categories', 'CASCADE'),
    ('minyan_overrides', 'minyan_id',   'minyanim',          'CASCADE'),
    ('shiurim',          'category_id', 'shiur_categories',  'SET NULL (category_id)')
  ) AS v(child, col, parent, on_delete) LOOP
    -- The parent's (id, community_id) is what the child's pair points at.
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', r.parent)::regclass AND conname = r.parent || '_id_community_key'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (id, community_id)',
                     r.parent, r.parent || '_id_community_key');
    END IF;

    -- Every foreign key on the column alone goes, whatever it was named.
    FOR c IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
      WHERE con.conrelid = format('public.%I', r.child)::regclass
        AND con.contype = 'f'
        AND array_length(con.conkey, 1) = 1
        AND att.attname = r.col
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.child, c.conname);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.child, r.child || '_' || r.col || '_same_community_fkey');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I, community_id)
         REFERENCES public.%I (id, community_id) ON DELETE %s',
      r.child, r.child || '_' || r.col || '_same_community_fkey', r.col, r.parent, r.on_delete);
  END LOOP;
END $$;

-- SOURCE: 20261001210000_prayer_times_display.sql
-- How the website and the app show the prayer times, chosen by the gabbai in
-- one place (MinyanimAdmin, "איך יראו זמני התפילות"). The board has its own
-- answer in tv_config (prayerDays), because a wall nobody touches is not a
-- page somebody taps.
--
-- minyan_days    which days are shown:
--                  'day'        each day in its own tab, opening on today
--                  'week_today' the whole week, today on top
--                  'week_fixed' the whole week, in the tabs' own order
-- minyan_layout  how the prayers of a day are shown, for every day alike;
--                NULL keeps a layout per day (minyan_categories.display_mode),
--                which is how every synagogue was set until now.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS minyan_days text NOT NULL DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS minyan_layout text;

ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_minyan_days_valid;
ALTER TABLE public.settings
  ADD CONSTRAINT settings_minyan_days_valid
  CHECK (minyan_days IN ('day', 'week_today', 'week_fixed'));

ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_minyan_layout_valid;
ALTER TABLE public.settings
  ADD CONSTRAINT settings_minyan_layout_valid
  CHECK (minyan_layout IS NULL OR minyan_layout IN ('tabs', 'list', 'table', 'timeline', 'cards'));

-- SOURCE: 20261003200000_user_api_keys.sql
-- The gabbai's own Claude API key, kept with his account.
--
-- "עוזר חכם" reads a photo, a dictated sentence or a pasted message with
-- Claude. The key for that lived in one browser (localStorage): typed again
-- on every phone and computer, and gone with the browser's data. It is kept
-- here now, with the account: entered once under "מפתח API", there on every
-- device the gabbai signs in on, replaced or deleted there.
--
-- Each account reads and changes its own key only - not another gabbai's, not
-- a platform admin's through the app (the database itself, like any row, is
-- open to whoever runs the project). Only an admin may keep one: it is for
-- the admin's assistant.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.user_api_keys (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'anthropic' CHECK (provider IN ('anthropic')),
  api_key text NOT NULL CHECK (char_length(api_key) BETWEEN 20 AND 300 AND api_key !~ '\s'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own api key read" ON public.user_api_keys;
CREATE POLICY "own api key read" ON public.user_api_keys
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own api key insert" ON public.user_api_keys;
CREATE POLICY "own api key insert" ON public.user_api_keys
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_admin());

DROP POLICY IF EXISTS "own api key update" ON public.user_api_keys;
CREATE POLICY "own api key update" ON public.user_api_keys
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.is_admin());

DROP POLICY IF EXISTS "own api key delete" ON public.user_api_keys;
CREATE POLICY "own api key delete" ON public.user_api_keys
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.user_api_keys FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_api_keys TO authenticated;

-- SOURCE: 20261004130000_tv_config_versions.sql
-- Saved versions of each synagogue's board design.
--
-- Every time a board's design is saved, the version it replaces is kept here,
-- by the database itself (a trigger), so nothing depends on the editor
-- remembering to do it. The editor lists them and can put one back as a draft;
-- putting it on the screens is then an ordinary "שמור ושדר".
--
-- The 40 newest are kept per synagogue. Only that synagogue's admins can read
-- them; nobody writes them directly.

CREATE TABLE IF NOT EXISTS public.tv_config_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  config       jsonb NOT NULL,
  saved_at     timestamptz NOT NULL,
  saved_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  replaced_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tv_config_versions_community_idx
  ON public.tv_config_versions (community_id, replaced_at DESC);

ALTER TABLE public.tv_config_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tv_config_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tv_config_versions TO authenticated;
GRANT ALL ON public.tv_config_versions TO service_role;

DROP POLICY IF EXISTS "tv config versions admin read" ON public.tv_config_versions;
CREATE POLICY "tv config versions admin read" ON public.tv_config_versions
  FOR SELECT TO authenticated USING (public.is_admin_of(community_id));

CREATE OR REPLACE FUNCTION public.keep_tv_config_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.config IS DISTINCT FROM NEW.config AND OLD.community_id IS NOT NULL THEN
    INSERT INTO public.tv_config_versions (community_id, config, saved_at, saved_by)
    VALUES (OLD.community_id, OLD.config, OLD.updated_at, OLD.updated_by);
    DELETE FROM public.tv_config_versions v
    WHERE v.community_id = OLD.community_id
      AND v.id NOT IN (
        SELECT id FROM public.tv_config_versions
        WHERE community_id = OLD.community_id
        ORDER BY replaced_at DESC
        LIMIT 40
      );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.keep_tv_config_version() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tv_config_keep_version ON public.tv_config;
CREATE TRIGGER tv_config_keep_version
  BEFORE UPDATE ON public.tv_config
  FOR EACH ROW EXECUTE FUNCTION public.keep_tv_config_version();

-- Scaffold the initial community, created before the scaffold trigger existed.
INSERT INTO public.settings(community_id,name)
SELECT c.id,c.name FROM public.communities c
WHERE NOT EXISTS (SELECT 1 FROM public.settings s WHERE s.community_id=c.id);
INSERT INTO public.migration_logs(name,success)
VALUES ('20261008190000_davening_reviewed_schema_upgrade',true);
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT name, success FROM public.migration_logs WHERE name='20261008190000_davening_reviewed_schema_upgrade';
