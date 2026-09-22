-- Qodo review fixes for PR #976 (20260929000030):
--
-- 1/2. The broad family INSERT/SELECT policies added in 20260929000030 let
--    any family member forge arbitrary notification content (title/message,
--    reaching the push-notification trigger) or read a player's full
--    notification history (message content, delivery/read state) via a
--    direct Supabase call -- way more than the narrow existence-check the
--    generator's dedupe logic actually needs. Drop both broad policies;
--    replace with two SECURITY DEFINER RPCs scoped to exactly what
--    notificationGenerator.ts needs: an existence check (no row content)
--    and an insert of caller/generator-controlled fields only. Self-owned
--    access is untouched -- the pre-existing notifications_insert_own /
--    "Users can view own notifications" policies still cover the athlete
--    calling directly.
--
-- 3. The recommendation_letters change in 20260929000030 resurrected
--    "Users can view own and linked recommendation letters" (the legacy
--    get_linked_user_ids()-based policy), which 20260815000000 had
--    deliberately DROPPED during the account_links cutover -- and worse,
--    widened it to can_access_family_player_prefs(user_id), which ignores
--    the row's own family_unit_id and would let any family member read a
--    letter belonging to a different family_unit_id row for the same
--    player (e.g. a player in two families). The already-correct,
--    never-touched "Users can view recommendation letters in their
--    families" policy (20260808000000, family_unit_id-scoped) already
--    covers generateRecommendationNotifications -- this was an
--    unnecessary and incorrect change. Drop the resurrected policy.

DROP POLICY IF EXISTS "Family can insert player-owned notifications" ON public.notifications;
DROP POLICY IF EXISTS "Family can view player-owned notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own and linked recommendation letters" ON public.recommendation_letters;

CREATE OR REPLACE FUNCTION public.family_notification_exists(
  p_user_id uuid,
  p_related_entity_id uuid,
  p_related_entity_type text,
  p_type text,
  p_scheduled_for date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (p_user_id = auth.uid() OR public.can_access_family_player_prefs(p_user_id)) THEN
    RAISE EXCEPTION 'not authorized to read notifications for %', p_user_id USING ERRCODE = '42501';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = p_user_id
      AND related_entity_id = p_related_entity_id
      AND related_entity_type = p_related_entity_type
      AND type = p_type
      AND scheduled_for = p_scheduled_for
  );
END;
$$;

REVOKE ALL ON FUNCTION public.family_notification_exists(uuid, uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_notification_exists(uuid, uuid, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_family_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text,
  p_related_entity_type text,
  p_related_entity_id uuid,
  p_scheduled_for date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT (p_user_id = auth.uid() OR public.can_access_family_player_prefs(p_user_id)) THEN
    RAISE EXCEPTION 'not authorized to create notifications for %', p_user_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications
    (user_id, type, title, message, priority, related_entity_type, related_entity_id, scheduled_for)
  VALUES
    (p_user_id, p_type, p_title, p_message, p_priority, p_related_entity_type, p_related_entity_id, p_scheduled_for)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_family_notification(uuid, text, text, text, text, text, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insert_family_notification(uuid, text, text, text, text, text, uuid, date) TO authenticated;
