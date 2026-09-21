import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { hydrateAthleteFromPendingDetails } from "~/server/utils/hydrateAthleteProfile";
import { markOnboardingComplete } from "~/server/utils/onboardingComplete";
import { requiresGuardianInvite } from "~/utils/age";
import { CURRENT_TERMS_VERSION } from "~/utils/legal";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/accept");
  try {
    const user = await requireAuth(event);
    const token = getRouterParam(event, "token");

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: "Token is required",
      });
    }

    const supabaseToken = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(supabaseToken);

    const { data: invitation } = await supabase
      .from("family_invitations")
      .select(
        "id, family_unit_id, invited_email, role, status, expires_at, invited_by, pending_player_details",
      )
      .eq("token", token)
      .single();

    if (!invitation) {
      throw createError({
        statusCode: 404,
        statusMessage: "Invitation not found",
      });
    }

    if (invitation.status !== "pending") {
      throw createError({
        statusCode: 409,
        statusMessage: "Invitation is no longer valid",
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw createError({
        statusCode: 410,
        statusMessage: "This invitation has expired",
      });
    }

    // Family invites are strictly email-bound: the authenticated user must
    // match the invited email exactly, otherwise a forwarded link could join
    // a stranger to the family and expose a minor's data.
    const emailMismatch =
      user.email?.trim().toLowerCase() !==
      invitation.invited_email.trim().toLowerCase();

    if (emailMismatch) {
      logger.warn("Invite acceptance blocked: email mismatch", {
        invitationId: invitation.id,
        userId: user.id,
      });
      throw createError({
        statusCode: 403,
        statusMessage:
          "This invite was sent to a different email address. Please sign in with the account that received the invite.",
      });
    }

    // The family_members insert and family_invitations status update both
    // happen atomically inside accept_family_invitation (SECURITY DEFINER),
    // idempotent if the caller is already a member. This uses the
    // invitation's own `role` column rather than trusting client input — a
    // raw UPDATE/INSERT grant here would let an invitee rewrite the issued
    // role (e.g. player -> parent) before accepting, since RLS USING/WITH
    // CHECK clauses can't compare old vs. new row values to keep it pinned.
    const { error: acceptError } = await supabase.rpc(
      "accept_family_invitation",
      { p_invitation_id: invitation.id },
    );

    if (acceptError) {
      logger.error("Failed to accept invitation", acceptError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to join family",
      });
    }

    // The invite link was emailed to invitation.invited_email and the
    // caller only reaches here after the emailMismatch check above passed —
    // clicking it already proves ownership of this address.
    const { error: verifyStampError } = await supabase
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("email_verified_at", null);

    if (verifyStampError) {
      logger.error("Failed to stamp email as verified", verifyStampError);
    }

    // Athlete PII (name, grad year, sport, position) is only released here —
    // after the authenticated caller has proven they are the invitee.
    let prefill:
      | {
          firstName: string;
          lastName: string;
          graduationYear?: number;
          sport?: string;
          position?: string;
          dateOfBirth?: string;
        }
      | undefined;

    // Whether the caller can skip the onboarding wizard entirely. A second
    // parent joining an existing family has nothing left to enter. An invited
    // player can skip only if the parent already staged BOTH fields the
    // wizard itself requires (graduation year + sport) — anything less falls
    // back to the wizard so the player is prompted for what's missing.
    let onboardingComplete = invitation.role === "parent";

    if (invitation.role === "player") {
      // Record guardian consent for minor (13–17) players: the inviting parent or
      // guardian (invited_by) accepted the Terms on the minor's behalf. Compliance
      // record only; non-fatal if it fails since membership is already established.
      const { data: acceptingUser } = await supabase
        .from("users")
        .select("date_of_birth")
        .eq("id", user.id)
        .maybeSingle();

      const dob = (acceptingUser as { date_of_birth?: string | null } | null)
        ?.date_of_birth;

      if (requiresGuardianInvite(dob)) {
        const { error: consentError } = await supabase
          .from("users")
          .update({
            guardian_consent_at: new Date().toISOString(),
            guardian_consent_by: invitation.invited_by,
            guardian_consent_terms_version: CURRENT_TERMS_VERSION,
          })
          .eq("id", user.id);

        if (consentError) {
          logger.error("Failed to record guardian consent", consentError);
        }
      }

      // Read from the invitation being accepted, not the family row — a
      // family can have more than one pending player invite at once, and
      // each invitation snapshots its own details at creation time (see
      // server/api/family/invite.post.ts, issue #898).
      const pendingDetails = invitation.pending_player_details as Record<
        string,
        unknown
      > | null;
      if (pendingDetails?.playerName) {
        const parts = (pendingDetails.playerName as string).trim().split(/\s+/);
        prefill = {
          firstName: parts[0] ?? "",
          lastName: parts.slice(1).join(" "),
          ...(pendingDetails.graduationYear
            ? { graduationYear: pendingDetails.graduationYear as number }
            : {}),
          ...(pendingDetails.sport
            ? { sport: pendingDetails.sport as string }
            : {}),
          ...(pendingDetails.position
            ? { position: pendingDetails.position as string }
            : {}),
          // Read independent of hydrateAthleteFromPendingDetails' fill-if-empty write to
          // users.date_of_birth below — the player should see the parent's original entry,
          // not whatever value the account ends up with.
          ...(typeof pendingDetails.playerDob === "string"
            ? { dateOfBirth: pendingDetails.playerDob }
            : {}),
        };
      }

      if (pendingDetails) {
        await hydrateAthleteFromPendingDetails(
          supabase,
          user.id,
          pendingDetails,
          logger,
        );
      }

      const graduationYear =
        typeof pendingDetails?.graduationYear === "number"
          ? (pendingDetails.graduationYear as number)
          : undefined;
      const hasRequiredFields = Boolean(graduationYear && pendingDetails?.sport);

      if (hasRequiredFields) {
        try {
          await markOnboardingComplete(supabase, user.id, graduationYear);
          onboardingComplete = true;
        } catch (err) {
          // Fail safe, not open: if the stamp didn't land, onboardingComplete
          // must stay false so the client falls back to the wizard instead of
          // sending an unstamped user to a page the global middleware will
          // immediately bounce them out of.
          logger.error(
            "Failed to mark onboarding complete for invited player",
            err,
          );
        }
      }
    } else {
      try {
        await markOnboardingComplete(supabase, user.id);
      } catch (err) {
        onboardingComplete = false;
        logger.error(
          "Failed to mark onboarding complete for invited parent",
          err,
        );
      }
    }

    logger.info("Invitation accepted", {
      invitationId: invitation.id,
      userId: user.id,
      onboardingComplete,
    });
    return {
      success: true,
      familyUnitId: invitation.family_unit_id,
      onboardingComplete,
      ...(prefill ? { prefill } : {}),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to accept invitation", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to accept invitation",
    });
  }
});
