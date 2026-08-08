-- Coach Outreach — Phase 4: athlete_messages send log.
--
-- Records each coach-outreach message the athlete sends (optimistically, on the
-- send click — transport is mailto/sms so delivery can't be confirmed). Powers
-- the programNote cross-program dedupe (the highest-value guardrail: coaches can
-- tell when they've been BCC'd) and follow-up timing warnings. Writes go through
-- a service-role server endpoint; RLS is family-scoped for any read path.

CREATE TABLE IF NOT EXISTS public.athlete_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_unit_id uuid REFERENCES public.family_units(id) ON DELETE CASCADE,
  school_id      uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  coach_id       uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  template_slug  text,
  channel        text,
  program_note   text,
  update_hook    text,
  subject        text,
  body           text,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Derive family_unit_id on write (school_id -> user fallback); reuses the generic
-- Phase-1 trigger function (never raises; server also stamps it explicitly).
DROP TRIGGER IF EXISTS trg_athlete_messages_derive_family_unit_id ON public.athlete_messages;
CREATE TRIGGER trg_athlete_messages_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.athlete_messages
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

-- Dedupe (per program) + timing (recent / nudge count) lookups.
CREATE INDEX IF NOT EXISTS athlete_messages_user_school_sent_idx
  ON public.athlete_messages (user_id, school_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS athlete_messages_user_sent_idx
  ON public.athlete_messages (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_athlete_messages_family_unit_id
  ON public.athlete_messages (family_unit_id);

-- Family-scoped RLS (single permissive policy per verb).
ALTER TABLE public.athlete_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS athlete_messages_select_family ON public.athlete_messages;
CREATE POLICY athlete_messages_select_family ON public.athlete_messages FOR SELECT
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS athlete_messages_insert_family ON public.athlete_messages;
CREATE POLICY athlete_messages_insert_family ON public.athlete_messages FOR INSERT
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS athlete_messages_update_family ON public.athlete_messages;
CREATE POLICY athlete_messages_update_family ON public.athlete_messages FOR UPDATE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()))
  WITH CHECK (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS athlete_messages_delete_family ON public.athlete_messages;
CREATE POLICY athlete_messages_delete_family ON public.athlete_messages FOR DELETE
  USING (family_unit_id IN (SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()));
