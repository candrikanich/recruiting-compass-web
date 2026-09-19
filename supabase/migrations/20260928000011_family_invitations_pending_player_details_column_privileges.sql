-- family_invitations_select (00000000000000_baseline.sql) authorizes every
-- authenticated member of the invitation's family, and RLS can't restrict
-- individual columns -- so any family member could query PostgREST directly
-- and read pending_player_details (name, birth date, gender, sport) for
-- every invitation, even though accept.post.ts only intends to release that
-- snapshot to the verified invitee after acceptance.
--
-- Revoke column-level SELECT on pending_player_details for anon/authenticated.
-- Server reads/writes go through useSupabaseAdmin() (service_role), whose
-- grant is untouched by this revoke.
REVOKE SELECT ("pending_player_details") ON "public"."family_invitations"
  FROM "anon", "authenticated";
