-- Security fix: reactivate_school (20260828000005) has been callable by
-- ANY authenticated user (and, until a prior session's emergency live
-- revoke, by anon too) with zero authorization check on p_school_id and
-- zero verification that p_actor is the caller -- the function trusted
-- both blindly. That original migration never granted or revoked
-- EXECUTE at all, so the function kept Postgres's implicit default
-- PUBLIC grant from creation; a direct RPC call with an arbitrary
-- p_school_id/p_actor could reactivate any other family's school and
-- forge the audit trail (updated_by / school_status_history.changed_by).
--
-- Fix: verify the caller is a member of the school's family_unit_id
-- (same membership shape as "Users can update schools in their families",
-- the schools table's own RLS UPDATE policy) before touching anything,
-- and reject p_actor values other than auth.uid() rather than silently
-- trusting it -- kept as an explicit parameter (not derived internally)
-- to avoid a client-side signature change, but no longer trusted as
-- authoritative.

CREATE OR REPLACE FUNCTION "public"."reactivate_school"(
  "p_school_id" "uuid",
  "p_actor" "uuid"
)
RETURNS "public"."school_status"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = 'public', 'pg_temp'
AS $$
DECLARE
  prev text;
  restore_status public.school_status;
  v_family_unit_id uuid;
BEGIN
  IF p_actor IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized to act as another user' USING ERRCODE = '42501';
  END IF;

  SELECT family_unit_id INTO v_family_unit_id
  FROM public.schools
  WHERE id = p_school_id;

  IF v_family_unit_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_unit_id = v_family_unit_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized for this school' USING ERRCODE = '42501';
  END IF;

  -- Prior stage = previous_status of the most recent move INTO not_pursuing.
  SELECT previous_status INTO prev
  FROM public.school_status_history
  WHERE school_id = p_school_id
    AND new_status = 'not_pursuing'
  ORDER BY changed_at DESC
  LIMIT 1;

  -- Cast the stored text back to the enum; tolerate anything unexpected.
  BEGIN
    restore_status := prev::public.school_status;
  EXCEPTION WHEN OTHERS THEN
    restore_status := 'researching'::public.school_status;
  END;

  -- Only restore into a live progress stage; never a deprecated/off-ramp value.
  IF restore_status IS NULL
     OR restore_status NOT IN (
       'researching'::public.school_status,
       'contacted'::public.school_status,
       'visiting'::public.school_status,
       'offer_received'::public.school_status,
       'committed'::public.school_status
     ) THEN
    restore_status := 'researching'::public.school_status;
  END IF;

  UPDATE public.schools
  SET status = restore_status,
      status_changed_at = now(),
      updated_by = p_actor,
      updated_at = now()
  WHERE id = p_school_id;

  INSERT INTO public.school_status_history
    (school_id, previous_status, new_status, changed_by, changed_at, notes)
  VALUES
    (p_school_id, 'not_pursuing', restore_status::text, p_actor, now(),
     'Reactivated from not_pursuing');

  RETURN restore_status;
END;
$$;

REVOKE ALL ON FUNCTION "public"."reactivate_school"("uuid", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."reactivate_school"("uuid", "uuid") TO "authenticated";
