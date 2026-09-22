-- Unblocks server/api/athlete/status.get.ts for #912.
--
-- get_athlete_status was deliberately locked to service_role/postgres only
-- in 20260727000000 (no internal caller check -- any authenticated caller
-- could probe any athlete's status by UUID). A straight client swap needs
-- an in-function authorization check before it's safe to re-grant to
-- authenticated. Converted from `sql` to `plpgsql` to add the guard;
-- query body is otherwise unchanged. Reuses can_access_family_player_prefs
-- for the self-or-linked-player check, same shape as the other #912 RPCs
-- added this session (20260928000015, 20260929000001).

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
      WHEN (SELECT school_count FROM user_schools) > 0
      THEN (50 + ((SELECT interaction_count FROM school_interactions)::NUMERIC / (SELECT school_count FROM user_schools) * 50))
      ELSE 0::NUMERIC
    END,
    ((SELECT interaction_count FROM school_interactions)::NUMERIC * 10),
    50::NUMERIC,
    (SELECT created_at FROM latest_interaction),
    (SELECT school_count FROM user_schools),
    (SELECT task_count FROM completed_tasks);
END;
$$;

REVOKE ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") TO "authenticated";
