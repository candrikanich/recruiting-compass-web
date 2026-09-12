import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export interface GuardianStatus {
  /** True while an unconfirmed guardian claim is outstanding — outbound features stay locked. */
  pending: boolean;
  /** Obfuscated for display; the full address is never returned to the player. */
  guardianEmailMasked: string | null;
  expiresAt: string | null;
  status: "pending" | "claimed" | "expired" | "revoked" | null;
}

/** j***@example.com — enough for the player to recognize the address, not to read it back. */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "…";
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
};

/**
 * Guardian-confirmation state for the signed-in player.
 *
 * Gated on the existence of a guardian_claims row rather than on guardian_consent_at being
 * null, deliberately: minors who joined through the older family-invite path predate the
 * consent columns, and keying off consent would retroactively lock accounts that were
 * never part of this flow.
 *
 * Never returns `token`. It is the guardian's authorization to consent, and handing it to
 * the player would let a minor confirm their own account.
 */
export default defineEventHandler(async (event): Promise<GuardianStatus> => {
  const logger = useLogger(event, "guardian/status");

  try {
    const user = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data: claim } = await supabase
      .from("guardian_claims")
      .select("guardian_email, status, expires_at")
      .eq("player_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!claim) {
      return {
        pending: false,
        guardianEmailMasked: null,
        expiresAt: null,
        status: null,
      };
    }

    return {
      pending: claim.status !== "claimed",
      guardianEmailMasked: maskEmail(claim.guardian_email),
      expiresAt: claim.expires_at,
      status: claim.status as GuardianStatus["status"],
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to read guardian status", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not load guardian status",
    });
  }
});
