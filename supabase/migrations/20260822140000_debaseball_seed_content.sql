-- Phase 4: de-baseball the DB-seeded coach template + timeline tasks.
-- Decision: tokenize now (per-sport polish later).
--
-- Templates are token-rendered, and {{sport}} already resolves in both apps
-- (template_variables.sport = 'computed', from the athlete's primary_sport), so
-- the one remaining baseball template uses {{sport}}.
--
-- Task text is rendered LITERALLY in both apps (no token resolver in the task
-- path), so {{sport}} would show raw braces — tasks use neutral wording instead.

-- 1. Coach template: last predefined template still baseball-worded.
UPDATE communication_templates
SET body = replace(body, 'baseball tradition', '{{sport}} tradition'),
    updated_at = now()
WHERE slug = 'strong-interest'
  AND body LIKE '%baseball tradition%';

-- 2. Timeline tasks: neutral, sport-agnostic wording.
UPDATE task
SET description = 'Attend at least one college camp in your sport', updated_at = now()
WHERE slug = 'attend-summer-camps-optional-but-beneficial';

UPDATE task
SET description = 'Create a strength, speed, and sport-specific training program', updated_at = now()
WHERE slug = 'establish-development-routine';

UPDATE task
SET title = 'Evaluate School Fit Beyond Athletics',
    description = 'Consider academics, location, cost, campus culture, not just athletics',
    failure_risk = 'Focusing only on athletics leads to poor school choice',
    updated_at = now()
WHERE slug = 'evaluate-school-fit-beyond-baseball';

UPDATE task
SET description = 'Mentally and physically prepare for college-level competition', updated_at = now()
WHERE slug = 'prepare-for-college-transition';
