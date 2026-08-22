-- Register the computed {{prepBaseballLink}} template variable so coach-outreach
-- email/text templates can embed the athlete's Prep Baseball Report profile URL.
--
-- The value is derived in useTemplateResolver from the player-prefs
-- prep_baseball_state (2-letter code) + prep_baseball_id (name-slug); it is
-- omitted when either is missing, so the variable renders as nothing rather
-- than a broken link.
INSERT INTO public.template_variables
  (key, label, description, category, source_type, source_path, is_required_default, example, sort_order)
VALUES
  ('prepBaseballLink',
   'Prep Baseball Link',
   'Prep Baseball Report profile URL; renders as nothing unless the athlete has set both their state and profile name.',
   'player', 'computed', NULL, false,
   'https://www.prepbaseballreport.com/profiles/OH/owen-andrikanich', 46)
ON CONFLICT (key) DO UPDATE SET
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  source_type = excluded.source_type,
  source_path = excluded.source_path,
  example = excluded.example,
  sort_order = excluded.sort_order;
