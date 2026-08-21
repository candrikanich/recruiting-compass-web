-- pg_net is required by trigger_push_notification() (fires on notifications
-- INSERT and calls net.http_post to the push edge function). Prod has it
-- enabled; a from-scratch rebuild (the E2E test project) did not, so every
-- notification insert failed with `schema "net" does not exist`, cascading into
-- interactions/offers/task-completion inserts and blowing past the E2E timeout.
--
-- Idempotent; prod already has it. net.http_post is async (queues, returns
-- immediately), so a failing/unreachable target never blocks the insert.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
