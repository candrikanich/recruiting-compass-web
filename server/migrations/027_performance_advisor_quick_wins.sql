-- Performance Advisor quick wins: unindexed FKs + duplicate indexes
-- See docs/SUPABASE_PERFORMANCE_ADVISOR.md

-- =============================================================================
-- 1. Index foreign keys (improves JOINs and CASCADE performance)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_account_links_initiator_user_id ON public.account_links(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_task_task_id ON public.athlete_task(task_id);
CREATE INDEX IF NOT EXISTS idx_offers_coach_id ON public.offers(coach_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_letters_document_id ON public.recommendation_letters(document_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_letters_user_id ON public.recommendation_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_school_status_history_changed_by ON public.school_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_suggestion_related_school_id ON public.suggestion(related_school_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_related_task_id ON public.suggestion(related_task_id);

-- =============================================================================
-- 2. Drop duplicate indexes (keep one per set; reduces write cost and storage)
-- =============================================================================
-- coaches: keep idx_coaches_user_id, drop coaches_user_id_idx
DROP INDEX IF EXISTS public.coaches_user_id_idx;

-- users: duplicate (users_email_key, users_email_unique) - both are
-- constraint-backed; dropping one would require dropping the constraint.
-- Left as-is; no migration change.
