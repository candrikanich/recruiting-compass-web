-- Security Advisor remediation (Supabase)
-- Fixes: RLS disabled on public tables, function search_path mutable
-- Reference: https://supabase.com/docs/guides/database/database-linter

-- =============================================================================
-- 1. RLS: Ensure family_units has RLS enabled (policies already exist)
-- =============================================================================
ALTER TABLE public.family_units ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. RLS: school_status_history - enable RLS and restrict to family-visible schools
-- =============================================================================
ALTER TABLE public.school_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view school status history for their families"
  ON public.school_status_history
  FOR SELECT
  USING (
    school_id IN (
      SELECT s.id FROM public.schools s
      WHERE s.family_unit_id IN (
        SELECT fm.family_unit_id FROM public.family_members fm
        WHERE fm.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- 3. RLS: Backup tables - enable RLS with no permissive policies
--    Only service_role (bypasses RLS) can access; anon/authenticated see no rows.
-- =============================================================================
ALTER TABLE public.documents_backup_pre_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools_backup_pre_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches_backup_pre_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions_backup_pre_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_backup_pre_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics_backup_pre_family ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. Function search_path: set fixed search_path to prevent search_path injection
--    (SECURITY best practice for SECURITY DEFINER and trigger functions)
-- =============================================================================
ALTER FUNCTION public.get_user_family_ids() SET search_path = public;
ALTER FUNCTION public.get_primary_family_id() SET search_path = public;
ALTER FUNCTION public.is_parent_viewing_athlete(uuid) SET search_path = public;
ALTER FUNCTION public.get_accessible_athletes() SET search_path = public;
ALTER FUNCTION public.update_user_preferences_updated_at() SET search_path = public;
ALTER FUNCTION public.is_parent_viewing_linked_athlete(uuid) SET search_path = public;
ALTER FUNCTION public.is_data_owner(uuid) SET search_path = public;
ALTER FUNCTION public.validate_event_coaches() SET search_path = public;
ALTER FUNCTION public.validate_document_schools() SET search_path = public;
ALTER FUNCTION public.validate_rec_letter_schools() SET search_path = public;
ALTER FUNCTION public.safe_jsonb_extract(jsonb, text) SET search_path = public;
ALTER FUNCTION public.snapshot_data_ownership(uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.create_audit_log(uuid, character varying, character varying, uuid, character varying, text, jsonb, jsonb, inet, text, character varying, text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_expired_audit_logs() SET search_path = public;
ALTER FUNCTION public.expire_old_invitations() SET search_path = public;
ALTER FUNCTION public.get_athlete_status(uuid) SET search_path = public;
ALTER FUNCTION public.get_linked_user_ids() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.duplicate_data_on_unlink(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_social_posts_timestamp() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
