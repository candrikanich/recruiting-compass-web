-- Fix: the push trigger (20260315000003_add_push_trigger.sql) posted to the
-- send-push-notification edge function WITHOUT an Authorization header, but that
-- function has verify_jwt=true. Every push was rejected with 401 Invalid JWT and
-- nothing was ever delivered. Add the (public) anon key as a Bearer token so the
-- request clears the gateway. The function uses its own SERVICE_ROLE_KEY env
-- internally, so caller privilege does not matter — anon is sufficient and safe
-- to embed (it already ships in the iOS binary).
-- Reapplied on new prod project (lrzsenidegcqhwzwncve) post Supabase DB split — URL/key
-- updated to this project's own values (original migration targeted the old shared project).

CREATE OR REPLACE FUNCTION public.trigger_push_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
  BEGIN
    PERFORM net.http_post(
      url     := 'https://lrzsenidegcqhwzwncve.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyenNlbmlkZWdjcWh3enduY3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDYwNjQsImV4cCI6MjEwNDIyMjA2NH0.n4U7rOY7n5OZWM4c3dZbyLAKPi7OU7_h1XA1FcI1wXI'
      ),
      body    := to_jsonb(NEW)
    );
    RETURN NEW;
  END;
  $function$;
