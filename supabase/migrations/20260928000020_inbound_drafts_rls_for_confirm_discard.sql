-- #912: server/api/inbound-drafts/[id]/{confirm,discard}.post.ts mutate
-- inbound_email_drafts.status, but 20260906000001 (its own comment) only
-- ever added a family-scoped SELECT policy -- "No INSERT/UPDATE/DELETE
-- policy yet ... confirm/discard mutations are added in Phase 2 alongside
-- the UI that calls them". That UI now exists. Swapping these routes off
-- the service-role client onto a session-scoped one needs the matching
-- UPDATE policy or every confirm/discard silently fails under RLS.
--
-- confirm.post.ts also reads raw_inbound_attachments (scoped to its own
-- already-verified draft_id) to materialize staged attachments into
-- `documents`. 20260924000000 deliberately left that table with no SELECT
-- policy at all ("only the webhook and confirm endpoint ... both via the
-- service-role client"), written on the assumption confirm.post.ts would
-- always use service-role. Add a family-scoped SELECT policy mirroring
-- inbound_email_drafts' own, so the session-scoped client can still read it.

CREATE POLICY "inbound_email_drafts family update" ON "public"."inbound_email_drafts"
    FOR UPDATE USING (
        family_unit_id IN (
            SELECT family_unit_id FROM public.family_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        family_unit_id IN (
            SELECT family_unit_id FROM public.family_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "raw_inbound_attachments family read" ON "public"."raw_inbound_attachments"
    FOR SELECT USING (
        family_unit_id IN (
            SELECT family_unit_id FROM public.family_members
            WHERE user_id = auth.uid()
        )
    );
