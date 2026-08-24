-- Drop the positions table and the users FK columns that referenced it.
--
-- Positions are driven entirely client-side by the canonical positions registry
-- (utils/positions/canonical.ts on web, CanonicalPositions.swift on iOS). The
-- `positions` DB table and the `users.primary_position_id` / `secondary_position_id`
-- FK columns were read nowhere in either app. Free-text position is stored separately
-- in users.primary_position_custom / secondary_position_custom, which remain.
--
-- Verified before drop (prod xpxzhqghxecsjhvklsqg): 68 positions rows, 2 users with
-- primary_position_id set (0 secondary), and zero view / function / RLS-policy
-- dependencies beyond the two FK constraints. Dropping the columns discards the 2
-- unused values.

ALTER TABLE public.users DROP COLUMN IF EXISTS primary_position_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS secondary_position_id;
DROP TABLE IF EXISTS public.positions;
