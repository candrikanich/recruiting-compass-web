import { defineEventHandler, readBody, createError } from "h3";
import { randomUUID } from "crypto";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { sendInviteEmail } from "~/server/utils/emailService";
import { getSafeRequestOrigin } from "~/server/utils/requestOrigin";
import { emailSchema } from "~/utils/validation/validators";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";

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

    const supabase = useSupabaseAdmin();

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

    // Check if the invited email is already a member
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_unit_id", familyUnitId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingMember) {
        throw createError({
          statusCode: 409,
          statusMessage: "This person is already a member of your family",
        });
      }
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

    const { data: invitation, error } = await supabase
      .from("family_invitations")
      .insert({
        family_unit_id: familyUnitId,
        invited_by: user.id,
        invited_email: email,
        role: role as "player" | "parent",
        token,
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

    // Persist player details the inviting parent already has, so the player
    // isn't re-asked for them on accept (hydrated in accept.post.ts /
    // hydrateAthleteProfile.ts). Only meaningful for a player-role invite —
    // non-blocking, same pattern as the invite email below: the invitation
    // itself is the primary action and must not fail because this did.
    //
    // NOTE: pending_player_details is stored per-family, not per-invitation.
    // If a family has more than one pending player invite at once, the later
    // write here overwrites the earlier one — a pre-existing limitation of
    // this storage shape (also true of server/api/family/player-details.post.ts).
    // Tracked separately; not fixed in this endpoint.
    if (pendingPlayerDetails && role === "player") {
      try {
        const { data: existingFamily } = await supabase
          .from("family_units")
          .select("pending_player_details")
          .eq("id", familyUnitId)
          .single();

        const { error: playerDetailsError } = await supabase
          .from("family_units")
          .update({
            pending_player_details: {
              // Preserve fields staged by player-details.post.ts (e.g.
              // playerDob, gender) that this invite payload doesn't carry.
              ...((existingFamily?.pending_player_details as Record<
                string,
                unknown
              > | null) ?? {}),
              playerName:
                `${pendingPlayerDetails.first_name} ${pendingPlayerDetails.last_name}`.trim(),
              ...(pendingPlayerDetails.graduation_year
                ? { graduationYear: pendingPlayerDetails.graduation_year }
                : {}),
              ...(pendingPlayerDetails.sport
                ? { sport: pendingPlayerDetails.sport }
                : {}),
              ...(pendingPlayerDetails.position
                ? { position: pendingPlayerDetails.position }
                : {}),
            },
          })
          .eq("id", familyUnitId);

        if (playerDetailsError) {
          logger.warn(
            "Failed to persist pending player details — invitation created without them",
            { error: playerDetailsError },
          );
        }
      } catch (playerDetailsErr) {
        logger.warn(
          "Failed to persist pending player details — invitation created without them",
          playerDetailsErr,
        );
      }
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
