import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { generateFamilyCode } from "~/server/utils/familyCode";
import { generateInboundToken } from "~/server/utils/familyInboundToken";
import { CURRENT_TERMS_VERSION } from "~/utils/legal";
import type { Database } from "~/types/database";

/**
 * A parent/guardian confirms a 13-17 player's self-started account.
 *
 * The mirror of family/invite/[token]/accept: there the guardian invited the player and
 * the player accepts; here the player asked and the guardian accepts. Both converge on the
 * same end state — a family unit containing both, and guardian_consent_* stamped on the
 * minor recording who consented and to which Terms version.
 *
 * Requires an authenticated guardian: consent has to be attributable to a real account,
 * not to whoever opened the link.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "guardian/claim/accept");

  try {
    const guardian = await requireAuth(event);
    const token = getRouterParam(event, "token");
    if (!token) {
      throw createError({ statusCode: 400, statusMessage: "Token is required" });
    }

    const supabase = useSupabaseAdmin();
    const { data: claim } = await supabase
      .from("guardian_claims")
      .select("id, player_user_id, guardian_email, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!claim) {
      throw createError({ statusCode: 404, statusMessage: "Link not found" });
    }
    if (claim.status === "claimed") {
      throw createError({
        statusCode: 409,
        statusMessage: "This account has already been confirmed",
      });
    }
    if (claim.status !== "pending") {
      throw createError({
        statusCode: 410,
        statusMessage: "This link is no longer valid",
      });
    }
    if (new Date(claim.expires_at) < new Date()) {
      throw createError({
        statusCode: 410,
        statusMessage: "This link has expired",
      });
    }

    // Email-bound like the family-invite accept: the signed-in guardian must be the
    // address the player named. Without this a forwarded link would let any account
    // consent on a minor's behalf, which is the one thing this flow exists to prevent.
    if (
      guardian.email?.trim().toLowerCase() !==
      claim.guardian_email.trim().toLowerCase()
    ) {
      logger.warn("Guardian claim attempted by a non-matching account");
      throw createError({
        statusCode: 403,
        statusMessage: `This link was sent to ${claim.guardian_email}. Sign in with that email to confirm.`,
      });
    }

    // A guardian confirming a second child already has a family — reuse it rather than
    // stranding siblings in separate units.
    const { data: existingMembership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", guardian.id)
      .maybeSingle();

    let familyUnitId = existingMembership?.family_unit_id ?? null;

    if (!familyUnitId) {
      const familyCode = await generateFamilyCode(supabase);
      const inboundToken = await generateInboundToken(supabase);
      const { data: newFamily, error: familyError } = await supabase
        .from("family_units")
        .insert({
          created_by_user_id: guardian.id,
          family_name: "My Family",
          family_code: familyCode,
          code_generated_at: new Date().toISOString(),
          inbound_token: inboundToken,
        } as Database["public"]["Tables"]["family_units"]["Insert"])
        .select("id")
        .single();

      if (familyError || !newFamily) {
        logger.error("Failed to create family unit for guardian", familyError);
        throw createError({
          statusCode: 500,
          statusMessage: "Could not set up your family",
        });
      }
      familyUnitId = newFamily.id;

      const { error: guardianMemberError } = await supabase
        .from("family_members")
        .insert({
          family_unit_id: familyUnitId,
          user_id: guardian.id,
          role: "parent",
        } as Database["public"]["Tables"]["family_members"]["Insert"]);

      if (guardianMemberError) {
        logger.error("Failed to add guardian to family", guardianMemberError);
        throw createError({
          statusCode: 500,
          statusMessage: "Could not set up your family",
        });
      }
    }

    // Membership before consent: family_members is what the DB gate accepts as a permanent
    // link (it is expiry-proof, unlike the claim), so establishing it first means the
    // consent UPDATE below cannot be rejected once the claim is marked claimed.
    const { error: memberError } = await supabase
      .from("family_members")
      .insert({
        family_unit_id: familyUnitId,
        user_id: claim.player_user_id,
        role: "player",
      } as Database["public"]["Tables"]["family_members"]["Insert"]);

    if (memberError) {
      logger.error("Failed to add player to family", memberError);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not connect your athlete",
      });
    }

    const { error: consentError } = await supabase
      .from("users")
      .update({
        guardian_consent_at: new Date().toISOString(),
        guardian_consent_by: guardian.id,
        guardian_consent_terms_version: CURRENT_TERMS_VERSION,
      })
      .eq("id", claim.player_user_id);

    if (consentError) {
      // Unlike the invite flow, this record is not incidental here: it is the proof that
      // the account was ever allowed to exist. Fail loudly rather than leaving a confirmed
      // player with no consent on file.
      logger.error("Failed to record guardian consent", consentError);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not record your confirmation",
      });
    }

    const { error: claimError } = await supabase
      .from("guardian_claims")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
        claimed_by: guardian.id,
      })
      .eq("id", claim.id);

    if (claimError) {
      logger.error("Failed to close guardian claim", claimError);
    }

    logger.info("Guardian claim accepted", { familyUnitId });
    return { success: true, familyUnitId };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to accept guardian claim", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not confirm this account",
    });
  }
});
