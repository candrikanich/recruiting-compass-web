-- Unblocks server/api/athlete/status/recalculate.post.ts for #912. Two gaps
-- blocked a straight client swap:
--
-- 1. athlete_task's SELECT policy gates on get_linked_user_ids(), which only
--    recognizes the legacy account_links table, not family_members -- the
--    same gap tracked in #926 for athlete/phase.get.ts. A parent acting on
--    a family_members-only-linked child would see zero completed tasks
--    under RLS, silently breaking (not leaking) their status calculation.
-- 2. users has no family-shared UPDATE policy (correctly -- that table also
--    holds email/role/consent/PII, a blanket grant is a bigger attack
--    surface than this route needs), so the status_score/status_label write
--    has nowhere to go under RLS as a raw .update() call.
--
-- Two narrow SECURITY DEFINER RPCs, both reusing can_access_family_player_prefs
-- (added in 20260821000010 for the same self-or-linked-player shape) rather
-- than reinventing the authorization check.

CREATE OR REPLACE FUNCTION "public"."get_athlete_completed_task_ids"("p_athlete_id" "uuid")
RETURNS "uuid"[]
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
BEGIN
  IF NOT (p_athlete_id = auth.uid() OR public.can_access_family_player_prefs(p_athlete_id)) THEN
    RAISE EXCEPTION 'not authorized to read tasks for %', p_athlete_id USING ERRCODE = '42501';
  END IF;

  RETURN ARRAY(
    SELECT task_id FROM public.athlete_task
    WHERE athlete_id = p_athlete_id AND status = 'completed'
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."get_athlete_completed_task_ids"("uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."get_athlete_completed_task_ids"("uuid") TO "authenticated";

-- Column-scoped (status_score/status_label/updated_at only) so a parent
-- recalculating a linked athlete's status can't reach any other users
-- column via this path -- same reasoning as set_athlete_profile_photo
-- (20260821000200).
CREATE OR REPLACE FUNCTION "public"."set_athlete_status_score"("p_athlete_id" "uuid", "p_score" integer, "p_label" "text")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
BEGIN
  IF NOT (p_athlete_id = auth.uid() OR public.can_access_family_player_prefs(p_athlete_id)) THEN
    RAISE EXCEPTION 'not authorized to set status score for %', p_athlete_id USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
  SET status_score = p_score, status_label = p_label, updated_at = now()
  WHERE id = p_athlete_id;
END;
$$;

REVOKE ALL ON FUNCTION "public"."set_athlete_status_score"("uuid", integer, "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."set_athlete_status_score"("uuid", integer, "text") TO "authenticated";
