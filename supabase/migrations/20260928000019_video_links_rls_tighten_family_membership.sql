-- Corrective migration for 20260928000018 (already deployed) -- qodo review
-- on PR #946 found two real gaps in the widened INSERT/UPDATE policies:
--
-- 1. INSERT validated the caller's parent membership and the target
--    user_id's player role INDEPENDENTLY, never requiring that player to
--    belong to the SAME family_unit_id being inserted. A parent could
--    attach a video link to an unrelated athlete, or (owner branch) a
--    player could set an arbitrary family_unit_id.
-- 2. UPDATE's WITH CHECK validated the resulting owner or family
--    independently too, letting a parent reassign a link's user_id to any
--    user, or a player move/clear their own link's family_unit_id.
--
-- Fix: tie user_id and family_unit_id together in both WITH CHECK clauses --
-- the target player must actually belong to the target family via a real
-- family_members row, not just satisfy each column's constraint on its own.

DROP POLICY IF EXISTS "video_links_insert_owner_or_family_parent" ON "public"."video_links";
DROP POLICY IF EXISTS "video_links_update_owner_or_family_parent" ON "public"."video_links";

CREATE POLICY "video_links_insert_owner_or_family_parent" ON "public"."video_links"
    FOR INSERT WITH CHECK (
        (
            user_id = auth.uid()
            AND EXISTS (SELECT 1 FROM public.family_members
                        WHERE user_id = auth.uid() AND role = 'player')
            AND (
                family_unit_id IS NULL
                OR family_unit_id IN (
                    SELECT family_unit_id FROM public.family_members
                    WHERE user_id = auth.uid()
                )
            )
        )
        OR (
            family_unit_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM public.family_members
                        WHERE user_id = auth.uid()
                          AND family_unit_id = video_links.family_unit_id
                          AND role = 'parent')
            AND EXISTS (SELECT 1 FROM public.family_members
                        WHERE user_id = video_links.user_id
                          AND family_unit_id = video_links.family_unit_id
                          AND role = 'player')
        )
    );

CREATE POLICY "video_links_update_owner_or_family_parent" ON "public"."video_links"
    FOR UPDATE USING (
        user_id = auth.uid()
        OR family_unit_id IN (
            SELECT family_unit_id FROM public.family_members
            WHERE user_id = auth.uid() AND role = 'parent'
        )
    )
    WITH CHECK (
        (
            user_id = auth.uid()
            AND (
                family_unit_id IS NULL
                OR family_unit_id IN (
                    SELECT family_unit_id FROM public.family_members
                    WHERE user_id = auth.uid()
                )
            )
        )
        OR (
            family_unit_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM public.family_members
                        WHERE user_id = auth.uid()
                          AND family_unit_id = video_links.family_unit_id
                          AND role = 'parent')
            AND EXISTS (SELECT 1 FROM public.family_members
                        WHERE user_id = video_links.user_id
                          AND family_unit_id = video_links.family_unit_id
                          AND role = 'player')
        )
    );
