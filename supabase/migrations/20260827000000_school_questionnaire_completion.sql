-- Recruiting-questionnaire completion, tracked per school.
--
-- The intro-standard outreach template claimed "I've completed your recruiting
-- questionnaire" for every send. That sentence must appear only when the player
-- actually completed the school's questionnaire. This migration:
--   1. adds an explicit per-school completion flag (+ timestamp),
--   2. backfills it from any questionnaire document already linked to a school
--      (the doc fallback — "completed" is implied by an uploaded copy),
--   3. registers the `questionnaireNote` computed template variable,
--   4. rewrites the intro-standard body to gate the sentence behind it.
--
-- The resolver renders `questionnaireNote` as the completion sentence when the
-- flag is true and as "" (collapsing the line) otherwise — see
-- utils/templateResolver.ts (OPTIONAL_EMPTY).

-- 1. Completion flag ---------------------------------------------------------
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS questionnaire_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS questionnaire_completed_at timestamptz;

-- 2. Doc-fallback backfill: a linked questionnaire document implies completion.
--    Documents link to a school directly (school_id) or via shared_with_schools[];
--    the document kind lives in the `type` enum column.
UPDATE public.schools s
SET questionnaire_completed = true,
    questionnaire_completed_at = COALESCE(s.questionnaire_completed_at, now())
WHERE s.questionnaire_completed = false
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.type = 'questionnaire'
      AND (d.school_id = s.id OR s.id = ANY(d.shared_with_schools))
  );

-- 3. Register the computed variable so the resolver emits it.
INSERT INTO public.template_variables
  (key, label, description, category, source_type, source_path, is_required_default, example, sort_order)
VALUES
  ('questionnaireNote',
   'Questionnaire note',
   'Completion sentence, shown only when the school''s recruiting questionnaire is marked complete; otherwise renders as nothing.',
   'program', 'computed', NULL, false,
   'I''ve completed your recruiting questionnaire. ', 95)
ON CONFLICT (key) DO UPDATE SET
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  source_type = excluded.source_type,
  source_path = excluded.source_path,
  example = excluded.example,
  sort_order = excluded.sort_order;

-- 4. Gate the sentence in every seeded body that hardcodes it.
UPDATE public.communication_templates
SET body = replace(
      body,
      'I''ve completed your recruiting questionnaire. I''d welcome any feedback',
      '{{questionnaireNote}}I''d welcome any feedback'
    )
WHERE body LIKE '%I''ve completed your recruiting questionnaire. I''d welcome any feedback%';
