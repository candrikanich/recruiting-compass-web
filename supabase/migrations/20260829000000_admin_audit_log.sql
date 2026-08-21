-- admin_audit_log — audit trail for admin actions (view-as, cron triggers,
-- etc). Originally applied to prod live via Supabase MCP during the Admin
-- Foundation work and never captured as a repo migration (drift discovered
-- while standing up the E2E test project, whose from-scratch rebuild lacked
-- the table). This file captures it so fresh environments match prod.
--
-- RLS enabled with NO policies: reads/writes go through the service-role
-- client (server/utils/adminAudit.ts), which bypasses RLS. No anon/authenticated
-- access by design.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
  ON public.admin_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON public.admin_audit_log USING btree (actor_admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON public.admin_audit_log USING btree (target_user_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
