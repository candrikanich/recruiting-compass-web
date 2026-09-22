import { defineEventHandler, readBody, createError } from "h3";
import { randomUUID } from "crypto";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { sendInviteEmail } from "~/server/utils/emailService";
import { getSafeRequestOrigin } from "~/server/utils/requestOrigin";
import { emailSchema } from "~/utils/validation/validators";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";
import type { Json } from "~/types/database";

// Wire shape iOS sends (Features/Family/Models/PendingPlayerDetails.swift) —
// separate first/last name, snake_case keys. Transformed on persist to match
// the canonical `family_units.pending_player_details` shape already written
// by server/api/family/player-details.post.ts and read by accept.post.ts /
// hydrateAthleteProfile.ts (a single combined `playerName` string).
const pendingPlayerDetailsSchema = z.object({
  first_name: z.string().trim().min(1),
  // iOS's onboarding invite step validates only first name — last name can be
  // sent as an empty string. Reject the request only if it's not a string.
  last_name: z.string().trim(),
  sport: z.string().trim().min(1).optional(),
  position: z.string().trim().min(1).optional(),
  graduation_year: z.number().int().optional(),
});

export const inviteBodySchema = z.object({
  email: emailSchema,
  role: z.enum(["player", "parent"], "role must be player or parent"),
  // Optional — only meaningful for a player-role invite. See issue #895: this
  // field previously wasn't declared at all, so Zod silently stripped it and
  // a parent's player details never persisted.
  pending_player_details: pendingPlayerDetailsSchema.optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite");
  try {
    const { id: userId } = await requireAuth(event);
    const rateLimitResult = await rateLimitByUser(event, userId, {
      requests: 10,
      window: "1 h",
    });
    throwIfRateLimited(rateLimitResult);

    const user = { id: userId };
    const rawBody = await readBody(event);
    const parseResult = inviteBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          parseResult.error.issues[0]?.message ?? "Invalid request body",
      });
    }
    const { email, role, pending_player_details: pendingPlayerDetails } =
      parseResult.data;

    const requestToken = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(requestToken);

    // Find the inviter's family. A parent can belong to multiple families
    // (the one they own plus any joined via a family code), so `.single()`
    // would throw on more than one row and wrongly reject the invite. Prefer
    // the family the inviter created; fall back to any membership.
    const { data: memberships } = (await supabase
      .from("family_members")
      .select("family_unit_id, family_units!inner(created_by_user_id)")
      .eq("user_id", user.id)) as {
      data:
        | {
            family_unit_id: string;
            family_units: { created_by_user_id: string | null } | null;
          }[]
        | null;
    };

    if (!memberships || memberships.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: "You are not a member of any family",
      });
    }

    const ownedMembership = memberships.find(
      (m) => m.family_units?.created_by_user_id === user.id,
    );
    const familyUnitId = (ownedMembership ?? memberships[0]).family_unit_id;

    // Check if the invited email is already a member. A plain `users`
    // lookup by an arbitrary email is blocked under RLS (self-or-family-
    // co-member-only), and the whole point here is someone who ISN'T yet a
    // co-member -- find_family_member_by_email() does the narrow existence
    // check server-side instead.
    const { data: existingMemberId, error: existingMemberError } =
      await supabase.rpc("find_family_member_by_email", {
        p_email: email,
        p_family_unit_id: familyUnitId,
      });

    if (existingMemberError) {
      logger.error(
        "Failed to check for existing family member",
        existingMemberError,
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create invitation",
      });
    }

    if (existingMemberId) {
      throw createError({
        statusCode: 409,
        statusMessage: "This person is already a member of your family",
      });
    }

    // Get inviter name and family name for the email (parallel)
    const [{ data: inviterProfile }, { data: family }] = await Promise.all([
      supabase.from("users").select("full_name").eq("id", user.id).single(),
      supabase
        .from("family_units")
        .select("family_name")
        .eq("id", familyUnitId)
        .single(),
    ]);

    const token = randomUUID();

    // Snapshot player details onto THIS invitation (not the family row), so a
    // family with more than one pending player invite at once doesn't have a
    // later invite's snapshot clobber an earlier one's (issue #898).
    // family_units.pending_player_details is the pre-invite staging draft the
    // parent fills in during onboarding (server/api/family/player-details.post.ts,
    // before any invitation exists to attach it to) — start from that draft
    // and overlay whatever this specific invite's wire payload carries (iOS's
    // ParentOnboardingWizardViewModel). Built before the insert so it lands
    // in the same write as the invitation row — a player invitation is never
    // created without its snapshot attempt, instead of a follow-up update
    // whose failure would silently leave an invitation acceptance can't
    // hydrate (issue #898 follow-up).
    let playerSnapshot: Record<string, unknown> | null = null;
    if (role === "player") {
      try {
        const { data: existingFamily } = await supabase
          .from("family_units")
          .select("pending_player_details")
          .eq("id", familyUnitId)
          .single();

        const familyDraft = (existingFamily?.pending_player_details ??
          null) as Record<string, unknown> | null;

        if (familyDraft || pendingPlayerDetails) {
          // iOS's savePlayerDetails() writes the family draft directly via the Supabase
          // client SDK using PendingPlayerDetails' own wire shape (first_name/last_name/
          // graduation_year, snake_case) rather than the canonical playerName/graduationYear
          // shape player-details.post.ts (web) writes — so a draft staged from iOS onboarding
          // and then invited via the dashboard's invite-only flow (no pendingPlayerDetails on
          // THIS request) needs its name/grad-year normalized here, or accept.post.ts's
          // `pendingDetails.playerName` gate never fires and the player never sees a prefill.
          const draftLastName =
            typeof familyDraft?.last_name === "string"
              ? familyDraft.last_name
              : "";
          const normalizedPlayerName = pendingPlayerDetails
            ? `${pendingPlayerDetails.first_name} ${pendingPlayerDetails.last_name}`.trim()
            : typeof familyDraft?.playerName === "string"
              ? familyDraft.playerName
              : typeof familyDraft?.first_name === "string"
                ? `${familyDraft.first_name} ${draftLastName}`.trim()
                : undefined;

          const normalizedGraduationYear =
            pendingPlayerDetails?.graduation_year ??
            (typeof familyDraft?.graduationYear === "number"
              ? familyDraft.graduationYear
              : typeof familyDraft?.graduation_year === "number"
                ? familyDraft.graduation_year
                : undefined);

          playerSnapshot = {
            ...(familyDraft ?? {}),
            ...(normalizedPlayerName ? { playerName: normalizedPlayerName } : {}),
            ...(normalizedGraduationYear !== undefined
              ? { graduationYear: normalizedGraduationYear }
              : {}),
            ...(pendingPlayerDetails?.sport
              ? { sport: pendingPlayerDetails.sport }
              : {}),
            ...(pendingPlayerDetails?.position
              ? { position: pendingPlayerDetails.position }
              : {}),
          };
        }
      } catch (playerDetailsErr) {
        logger.warn(
          "Failed to build pending player details snapshot — invitation will be created without them",
          playerDetailsErr,
        );
      }
    }

    const { data: invitation, error } = await supabase
      .from("family_invitations")
      .insert({
        family_unit_id: familyUnitId,
        invited_by: user.id,
        invited_email: email,
        role: role as "player" | "parent",
        token,
        ...(playerSnapshot
          ? { pending_player_details: playerSnapshot as Json }
          : {}),
      })
      .select("id")
      .single();

    if (error) {
      logger.error("Failed to create invitation", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create invitation",
      });
    }

    // Send invite email (non-blocking — don't fail if email fails)
    try {
      const emailResult = await sendInviteEmail({
        to: email,
        inviterName: inviterProfile?.full_name ?? "Your family",
        familyName: family?.family_name ?? "My Family",
        role: role as "player" | "parent",
        token,
        requestOrigin: getSafeRequestOrigin(event),
        context: {
          purpose: "invite",
          familyUnitId,
          entityType: "family_invitation",
          entityId: invitation.id,
        },
      });
      if (!emailResult.success) {
        logger.warn(
          "Failed to send invite email — invitation created but email not sent",
          { error: emailResult.error },
        );
      }
    } catch (err) {
      logger.warn(
        "Failed to send invite email — invitation created but email not sent",
        err,
      );
    }

    logger.info("Invitation created", {
      invitationId: invitation.id,
      role,
      familyUnitId,
    });
    return { success: true, invitationId: invitation.id };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to create invitation", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create invitation",
    });
  }
});
