-- #912: server/api/video-links/{index.post,[id].patch,[id].delete}.ts use
-- resolveActingAthleteId() so a parent can create/edit/delete their linked
-- athlete's video links (#555 parity), but the INSERT/UPDATE/DELETE RLS
-- policies only ever allowed user_id = auth.uid() (the player themselves).
-- Swapping those routes off the service-role client onto a session-scoped
-- one would silently reject every parent-triggered create/edit/delete.
-- Widen all three to match the existing SELECT policy's parent clause:
-- owning player, OR a parent in the same family_unit_id (and, for INSERT,
-- only into a row owned by an actual player in that family).

DROP POLICY IF EXISTS "video_links_insert_owner_player" ON "public"."video_links";
DROP POLICY IF EXISTS "video_links_update_owner_player" ON "public"."video_links";
DROP POLICY IF EXISTS "video_links_delete_owner_player" ON "public"."video_links";

CREATE POLICY "video_links_insert_owner_or_family_parent" ON "public"."video_links"
    FOR INSERT WITH CHECK (
        (
            user_id = auth.uid()
            AND EXISTS (SELECT 1 FROM public.family_members
                        WHERE user_id = auth.uid() AND role = 'player')
        )
        OR (
            family_unit_id IN (
                SELECT family_unit_id FROM public.family_members
                WHERE user_id = auth.uid() AND role = 'parent'
            )
            AND EXISTS (SELECT 1 FROM public.family_members
                        WHERE user_id = video_links.user_id AND role = 'player')
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
        user_id = auth.uid()
        OR family_unit_id IN (
            SELECT family_unit_id FROM public.family_members
            WHERE user_id = auth.uid() AND role = 'parent'
        )
    );

CREATE POLICY "video_links_delete_owner_or_family_parent" ON "public"."video_links"
    FOR DELETE USING (
        user_id = auth.uid()
        OR family_unit_id IN (
            SELECT family_unit_id FROM public.family_members
            WHERE user_id = auth.uid() AND role = 'parent'
        )
    );
