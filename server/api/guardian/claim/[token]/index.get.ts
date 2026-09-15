import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

/**
 * Resolve a guardian claim for the confirmation page.
 *
 * Unauthenticated by design — the guardian arrives from an email link and may not have an
 * account yet. The token is the bearer credential, so this returns only what the page has
 * to render (who is asking, and whether the claim is still open) and never the player's
 * contact details or anything else about their account.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "guardian/claim/get");

  try {
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

    const { data: player } = await supabase
      .from("users")
      .select("full_name, date_of_birth, graduation_year")
      .eq("id", claim.player_user_id)
      .maybeSingle();

    return {
      guardianEmail: claim.guardian_email,
      playerName: player?.full_name ?? "Your athlete",
      playerDateOfBirth: player?.date_of_birth ?? null,
      playerGraduationYear: player?.graduation_year ?? null,
      expiresAt: claim.expires_at,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to resolve guardian claim", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not load this confirmation link",
    });
  }
});
