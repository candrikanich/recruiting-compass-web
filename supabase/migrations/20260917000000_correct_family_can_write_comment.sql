-- Corrects an overclaim in the family_can_write() comment (20260916000000)
-- and adds the missing updated_at trigger on app_config. No behaviour change
-- to family_can_write() itself.

comment on function public.family_can_write(uuid) is
  'NULL family_unit_id => true. This is a known gap, not a proof of safety: '
  'video_links and events (nullable family_unit_id, no derive trigger) and '
  'any multi-family-parent write that fails to derive a single '
  'family_unit_id can reach this branch and bypass the gate. Tracked as a '
  'Phase 1 prerequisite — see '
  'planning/2026-09-03-pricing-model-and-entitlement-plumbing-spec.md Open '
  'Items.';

alter function public.touch_family_subscriptions_updated_at() rename to touch_updated_at;

create trigger app_config_touch_updated_at
  before update on public.app_config
  for each row execute function public.touch_updated_at();
