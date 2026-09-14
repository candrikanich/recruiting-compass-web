-- Closes a race found live on QA: a guardian confirming a player's claim
-- (server/api/guardian/claim/[token]/accept.post.ts) landed in TWO separate
-- family_units. Two independent "check family_units.created_by_user_id, else
-- create one" callers -- plugins/auth.client.ts's SIGNED_IN listener (fires
-- automatically on every new session, calls /api/family/create) and this same
-- accept endpoint's own family-creation branch, both firing within the same
-- signup-then-confirm request -- both passed the SELECT before either INSERT
-- committed, so both created a family. The player only ended up in the accept
-- endpoint's family; the dashboard picked the OTHER (player-less) one as active.
--
-- Deliberately scoped to `created_by_user_id`, not a general one-family-per-user
-- constraint: parents legitimately belong to multiple family_units in this app
-- (dashboard.vue's parentAccessibleFamilies / activeFamily context-switch is
-- built for that). What must never happen twice is a single user being recorded
-- as the CREATOR of a family -- every "check existing, else create" caller reads
-- this same column, so a duplicate creator row is what let the race produce two
-- families for one guardian in the first place. idx_player_one_family (a
-- pre-existing, role-scoped constraint) is the nearest analogue and untouched.
create unique index if not exists idx_family_units_one_per_creator
  on public.family_units (created_by_user_id)
  where created_by_user_id is not null;
