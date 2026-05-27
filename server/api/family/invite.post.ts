import { defineEventHandler, readBody, createError } from "h3";
import { randomUUID } from "crypto";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { sendInviteEmail } from "~/server/utils/emailService";
import { emailSchema } from "~/utils/validation/validators";
import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit";

const inviteBodySchema = z.object({
  email: emailSchema,
  role: z.enum(["player", "parent"], "role must be player or parent"),
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
    const { email, role } = parseResult.data;

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

    // Send invite email (non-blocking — don't fail if email fails)
    try {
      const emailResult = await sendInviteEmail({
        to: email,
        inviterName: inviterProfile?.full_name ?? "Your family",
        familyName: family?.family_name ?? "My Family",
        role: role as "player" | "parent",
        token,
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
