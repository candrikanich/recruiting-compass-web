-- Register the {{intendedMajor}} template variable so coach-outreach email/text
-- templates can embed the athlete's intended course of study.
--
-- The value lives on PlayerDetails.intended_major (types/models.ts), which is
-- persisted as user_preferences category='player' jsonb — the same storage
-- pattern as {{ncaaId}} (pref:player.ncaa_id) and {{playerPhone}}
-- (pref:player.phone). The resolver's `column` source_type covers both real
-- table columns (column:<table>.<col>) and pref:player.* paths — see
-- utils/templateResolver.ts resolveSourcePath(), which special-cases the
-- "pref:player." prefix to read ctx.prefs[key] regardless of source_type.
-- There is no 'pref' source_type in the CHECK constraint, so 'column' is the
-- correct value here (matches the ncaaId precedent).
--
-- The variable resolves to null/empty when the athlete hasn't filled in an
-- intended major (Settings > Academics), so it is safely omitted rather than
-- blocking send — is_required_default = false.
INSERT INTO public.template_variables
  (key, label, description, category, source_type, source_path, is_required_default, example, sort_order)
VALUES
  ('intendedMajor',
   'Intended Major',
   'Field of study the athlete plans to pursue, from Settings > Academics; renders as nothing until the athlete fills it in.',
   'academics', 'column', 'pref:player.intended_major', false,
   'Mechanical Engineering', 34)
ON CONFLICT (key) DO UPDATE SET
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  source_type = excluded.source_type,
  source_path = excluded.source_path,
  example = excluded.example,
  sort_order = excluded.sort_order;

-- Gate an optional "planning to study {{intendedMajor}}" clause onto the
-- academics bullet of the primary first-contact template (`intro-standard`).
-- Guarded so this is a no-op if the live body doesn't match the expected text
-- (already patched, or diverged) — idempotent re-run, matches the pattern
-- used by 20260827000001_school_questionnaire_completion.sql.
UPDATE public.communication_templates
SET body = replace(
      body,
      '{{gpaUnweighted}} unweighted GPA[[testLabel|, {{testLabel}}]][[testScore| {{testScore}}]]',
      '{{gpaUnweighted}} unweighted GPA[[testLabel|, {{testLabel}}]][[testScore| {{testScore}}]], planning to study[[intendedMajor| {{intendedMajor}}]]'
    )
WHERE slug = 'intro-standard'
  AND body LIKE '%{{gpaUnweighted}} unweighted GPA[[testLabel|, {{testLabel}}]][[testScore| {{testScore}}]]%'
  AND body NOT LIKE '%intendedMajor%';
