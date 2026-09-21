import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { resolveGuardianLock } from "~/server/utils/guardianGate";

export interface GuardianStatus {
  /** True when outbound features are locked — mirrors assertGuardianConfirmed exactly. */
  locked: boolean;
  /**
   * @deprecated Alias of `locked`, kept for the deployed iOS client's `GuardianStatus.pending`
   * decode — that build enforces restrictions off this field, not `locked`, so it MUST mirror
   * `locked` exactly (PR #839). A prior change (#845) narrowed this to `claim.status ===
   * "pending"`, which unlocks the deployed client whenever `locked` is true but the claim has
   * expired/was never created — an enforcement bypass. Use `claimOutstanding` for "is there a
   * live unconfirmed claim right now" instead. Remove `pending` once iOS ships a
   * `locked`-reading build.
   */
  pending: boolean;
  /** True only while the latest guardian claim is itself outstanding and unexpired. Display-only — never gates enforcement. */
  claimOutstanding: boolean;
  /** Obfuscated for display; the full address is never returned to the player. */
  guardianEmailMasked: string | null;
  expiresAt: string | null;
  status: "none" | "pending" | "claimed" | "expired" | "revoked";
}

/** A stored "pending" claim whose expires_at has elapsed is effectively expired, even if no cron has flipped the row yet. */
const effectiveStatus = (claim: {
  status: string;
  expires_at: string;
}): GuardianStatus["status"] => {
  if (
    claim.status === "pending" &&
    new Date(claim.expires_at).getTime() <= Date.now()
  ) {
    return "expired";
  }
  return claim.status as GuardianStatus["status"];
};

/** p****@example.com — enough for the player to recognize the address, not to read it back. */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "…";
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
};

/**
 * Guardian-confirmation state for the signed-in player.
 *
 * `locked` is computed identically to server/utils/guardianGate.ts's
 * assertGuardianConfirmed (both call resolveGuardianLock) — keyed on
 * `users.guardian_consent_at`, with a family-membership override for a minor already
 * sitting alongside a parent, not on whether a guardian_claims row exists. `status`
 * is presentation-only, telling the dashboard banner which message to show ("invite
 * a parent" vs. "waiting on confirmation" vs. nothing) — it must never be used to
 * decide whether something is locked.
 *
 * Never returns `token`. It is the guardian's authorization to consent, and handing
 * it to the player would let a minor confirm their own account.
 */
export default defineEventHandler(async (event): Promise<GuardianStatus> => {
  const logger = useLogger(event, "guardian/status");

  try {
    const authUser = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data: user } = await supabase
      .from("users")
      .select("role, date_of_birth, guardian_consent_at")
      .eq("id", authUser.id)
      .maybeSingle();

    const locked = await resolveGuardianLock(supabase, user, authUser.id);

    const { data: claim } = await supabase
      .from("guardian_claims")
      .select("guardian_email, status, expires_at")
      .eq("player_user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!claim) {
      return {
        locked,
        pending: locked,
        claimOutstanding: false,
        guardianEmailMasked: null,
        expiresAt: null,
        status: "none",
      };
    }

    const status = effectiveStatus(claim);

    return {
      locked,
      pending: locked,
      claimOutstanding: status === "pending",
      guardianEmailMasked: maskEmail(claim.guardian_email),
      expiresAt: claim.expires_at,
      status,
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
