-- Unblocks server/api/athlete/phase/advance.post.ts for #912.
--
-- users has no family-shared UPDATE policy (correctly -- see
-- 20260928000015's reasoning, same table), so the current_phase/
-- phase_milestone_data write has nowhere to go under RLS as a raw
-- .update() call for a parent-triggered advance of their linked athlete.
--
-- Column-scoped (current_phase/phase_milestone_data/updated_at only), same
-- shape as set_athlete_status_score (20260928000015). Reuses
-- can_access_family_player_prefs for authorization rather than reinventing
-- the check; the completed-tasks read this route also needs already has an
-- RPC (get_athlete_completed_task_ids, 20260928000015) covering the same
-- self-or-linked-player shape.

CREATE OR REPLACE FUNCTION "public"."set_athlete_phase"(
  "p_athlete_id" "uuid",
  "p_next_phase" "text",
  "p_phase_milestone_data" "jsonb"
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
BEGIN
  IF NOT (p_athlete_id = auth.uid() OR public.can_access_family_player_prefs(p_athlete_id)) THEN
    RAISE EXCEPTION 'not authorized to set phase for %', p_athlete_id USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
  SET current_phase = p_next_phase,
      phase_milestone_data = p_phase_milestone_data,
      updated_at = now()
  WHERE id = p_athlete_id;
END;
$$;

REVOKE ALL ON FUNCTION "public"."set_athlete_phase"("uuid", "text", "jsonb") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."set_athlete_phase"("uuid", "text", "jsonb") TO "authenticated";
