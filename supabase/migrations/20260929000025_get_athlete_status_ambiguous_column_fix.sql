-- get_athlete_status() (20260929000002_get_athlete_status_authz.sql) has
-- been completely broken on EVERY environment -- prod, QA, and E2E --
-- since it was converted from `language sql` to `language plpgsql` today
-- to add an authz guard. Two bugs, both from that conversion (a plain SQL
-- function doesn't hit either):
--
-- 1. `school_count` is both a RETURNS TABLE output column name and a CTE
--    column alias inside the function body. PL/pgSQL implicitly declares
--    OUT parameters as variables in scope for the whole function, so every
--    bare reference to `school_count` inside the query became ambiguous --
--    "could refer to either a PL/pgSQL variable or a table column"
--    (confirmed live against all three projects). Fixed by qualifying each
--    reference with its source CTE (`user_schools.school_count`).
-- 2. COUNT(*)/COUNT(DISTINCT ...) return bigint, but the declared output
--    columns are integer -- the same varchar/text-style RETURN QUERY type
--    mismatch found in create_family_for_user() this session, here between
--    bigint and integer. Fixed with explicit ::integer casts on
--    school_count and completed_task_count.
--
-- This is a real production bug (every GET /api/athlete/status call,
-- which powers the dashboard status score, has been 500ing since
-- 20260929000002 first shipped), not just E2E -- confirmed by reproducing
-- live against prod and QA before writing this fix. Query body is
-- otherwise byte-for-byte unchanged from 20260929000002.
CREATE OR REPLACE FUNCTION "public"."get_athlete_status"("p_user_id" "uuid")
RETURNS TABLE("task_completion_rate" numeric, "interaction_frequency_score" numeric, "coach_interest_score" numeric, "academic_standing_score" numeric, "last_interaction_date" timestamp with time zone, "school_count" integer, "completed_task_count" integer)
LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  IF NOT (p_user_id = auth.uid() OR public.can_access_family_player_prefs(p_user_id)) THEN
    RAISE EXCEPTION 'not authorized to read status for %', p_user_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH user_data AS (
    SELECT current_phase FROM public.users WHERE id = p_user_id
  ),
  grade_level_map AS (
    SELECT
      CASE
        WHEN (SELECT current_phase FROM user_data) = 'freshman' THEN 9
        WHEN (SELECT current_phase FROM user_data) = 'sophomore' THEN 10
        WHEN (SELECT current_phase FROM user_data) = 'junior' THEN 11
        ELSE 12
      END AS grade_level
  ),
  required_tasks AS (
    SELECT COUNT(DISTINCT id) as task_count
    FROM public.task
    WHERE grade_level = (SELECT grade_level FROM grade_level_map)
      AND required = true
  ),
  completed_tasks AS (
    SELECT COUNT(DISTINCT task_id) as task_count
    FROM public.athlete_task
    WHERE athlete_id = p_user_id AND status = 'completed'
  ),
  latest_interaction AS (
    SELECT created_at
    FROM public.interactions
    WHERE logged_by = p_user_id
    ORDER BY created_at DESC
    LIMIT 1
  ),
  user_schools AS (
    SELECT COUNT(*) as school_count
    FROM public.schools
    WHERE user_id = p_user_id
  ),
  school_interactions AS (
    SELECT COUNT(DISTINCT school_id) as interaction_count
    FROM public.interactions
    WHERE logged_by = p_user_id
  )
  SELECT
    CASE
      WHEN (SELECT task_count FROM required_tasks) > 0
      THEN ((SELECT task_count FROM completed_tasks)::NUMERIC / (SELECT task_count FROM required_tasks) * 100)
      ELSE 0::NUMERIC
    END,
    CASE
      WHEN (SELECT user_schools.school_count FROM user_schools) > 0
      THEN (50 + ((SELECT interaction_count FROM school_interactions)::NUMERIC / (SELECT user_schools.school_count FROM user_schools) * 50))
      ELSE 0::NUMERIC
    END,
    ((SELECT interaction_count FROM school_interactions)::NUMERIC * 10),
    50::NUMERIC,
    (SELECT created_at FROM latest_interaction),
    (SELECT user_schools.school_count FROM user_schools)::integer,
    (SELECT task_count FROM completed_tasks)::integer;
END;
$$;
