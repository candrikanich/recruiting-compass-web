-- Pipeline formalization phase 1b: reconcile existing rows to the canonical
-- 5-stage funnel (researching -> contacted -> visiting -> offer_received ->
-- committed) + off-ramp not_pursuing. See
-- planning/2026-08-21-school-status-pipeline-spec.md.
--
-- No school_status_history rows are written here: this is a one-time bulk data
-- reconciliation, not a user-driven status change, and there is no natural
-- actor (changed_by is NOT NULL FK to auth.users). Trigger-driven and manual
-- changes continue to write history normally.

-- 'interested' is an affinity, not a progress stage -> move to the favorite flag.
-- Interested rows WITH interactions already became 'contacted' via
-- 20260828000002; the conditional keeps this idempotent. Remaining interested
-- rows (no interactions) drop back to 'researching'.
update public.schools s
set is_favorite = true,
    status = case
      when exists (select 1 from public.interactions i where i.school_id = s.id)
        then 'contacted'::public.school_status
      else 'researching'::public.school_status
    end,
    updated_at = now()
where s.status = 'interested'::public.school_status;

-- Collapse recruiting/visit granularity into the single 'visiting' stage.
update public.schools
set status = 'visiting'::public.school_status,
    updated_at = now()
where status in (
  'recruited'::public.school_status,
  'camp_invite'::public.school_status,
  'official_visit_invited'::public.school_status,
  'official_visit_scheduled'::public.school_status
);

-- Collapse the web-only 'declined' off-ramp into 'not_pursuing'.
update public.schools
set status = 'not_pursuing'::public.school_status,
    updated_at = now()
where status = 'declined'::public.school_status;
