-- Tighten suggestion table INSERT policy (Security Advisor: permissive RLS)
-- Replace WITH CHECK (true) with service_role-only so anon/authenticated cannot insert.

DROP POLICY IF EXISTS "Service role can insert suggestions" ON public.suggestion;

CREATE POLICY "Service role can insert suggestions"
  ON public.suggestion
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
