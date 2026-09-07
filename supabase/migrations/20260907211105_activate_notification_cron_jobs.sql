-- The 4 notification cron jobs (20260907182459_notification_cron_auth_and_event_schedule)
-- were created via cron.schedule() upsert but landed inactive — 3 pre-existed disabled
-- from before the Supabase DB split, and cron.schedule() preserves an existing job's
-- active flag rather than resetting it; the newly-inserted notify-upcoming-events row
-- also came in inactive. Net effect: none of the 4 had ever fired
-- (cron.job_run_details was empty for all of them) despite the auth fix being live.
--
-- cron.job is not directly UPDATE-able (permission denied for table job) — pg_cron
-- exposes cron.alter_job() for this.
SELECT cron.alter_job(jobid, active := true)
FROM cron.job
WHERE jobname IN (
  'process-follow-up-reminders',
  'process-deadline-alerts',
  'send-weekly-digest',
  'notify-upcoming-events'
);
