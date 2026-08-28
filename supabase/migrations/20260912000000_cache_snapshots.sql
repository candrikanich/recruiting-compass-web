-- cache_snapshots — durable L2 read-through cache for serverless routes.
--
-- Why Postgres instead of Redis-only:
--   Vercel isolates are ephemeral. Upstash Redis is optional infra (missing
--   env = no L1). A small snapshot table lets the public-profile hot path
--   survive Redis being down without re-joining 6 origin tables on every hit.
--
-- This is NOT tenant data. Rows are derived public payloads keyed by cache_key.
-- RLS enabled with NO policies: only the service-role client (which bypasses
-- RLS) can read/write. Same pattern as admin_audit_log.
--
-- First consumer: public player profiles (namespace = 'public_profile',
-- cache_key = 'pubprof:v1:' || user_id). College search / dashboard snapshots
-- can reuse this table later without a new migration.

CREATE TABLE IF NOT EXISTS public.cache_snapshots (
  cache_key text PRIMARY KEY,
  namespace text NOT NULL,
  payload jsonb NOT NULL,
  etag text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cache_snapshots_namespace_idx
  ON public.cache_snapshots (namespace);

CREATE INDEX IF NOT EXISTS cache_snapshots_expires_at_idx
  ON public.cache_snapshots (expires_at);

ALTER TABLE public.cache_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cache_snapshots FROM anon, authenticated;
GRANT ALL ON TABLE public.cache_snapshots TO service_role;

-- Drop L2 snapshot when the source profile row changes so unpublish/edits
-- cannot serve a stale assembled payload from Postgres after Redis TTL.
CREATE OR REPLACE FUNCTION public.invalidate_public_profile_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user uuid;
BEGIN
  target_user := COALESCE(NEW.user_id, OLD.user_id);
  IF target_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  DELETE FROM public.cache_snapshots
  WHERE cache_key = 'pubprof:v1:' || target_user::text;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS player_profiles_invalidate_cache_snapshot
  ON public.player_profiles;

CREATE TRIGGER player_profiles_invalidate_cache_snapshot
  AFTER UPDATE OR DELETE ON public.player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_public_profile_snapshot();
