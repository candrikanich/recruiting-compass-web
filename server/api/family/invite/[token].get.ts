import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/token");
  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  const supabase = useSupabaseAdmin();

  try {
    const { data: invitation } = await supabase
      .from("family_invitations")
      .select("id, role, status, expires_at, family_unit_id")
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
        statusMessage: "This invitation is no longer valid",
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw createError({
        statusCode: 410,
        statusMessage: "This invitation has expired",
      });
    }

    const { data: familyUnit } = await supabase
      .from("family_units")
      .select("family_name, pending_player_details")
      .eq("id", invitation.family_unit_id)
      .single();

    // Build prefill from parent-entered player details (only for player invitees)
    let prefill:
      | {
          firstName: string;
          lastName: string;
          graduationYear?: number;
          sport?: string;
          position?: string;
        }
      | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingDetails = (familyUnit as any)?.pending_player_details;
    if (invitation.role === "player" && pendingDetails?.playerName) {
      const parts = (pendingDetails.playerName as string).trim().split(/\s+/);
      prefill = {
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" "),
        ...(pendingDetails.graduationYear
          ? { graduationYear: pendingDetails.graduationYear }
          : {}),
        ...(pendingDetails.sport ? { sport: pendingDetails.sport } : {}),
        ...(pendingDetails.position
          ? { position: pendingDetails.position }
          : {}),
      };
    }

    logger.info("Invitation token lookup", { invitationId: invitation.id });
    return {
      invitationId: invitation.id,
      role: invitation.role,
      familyName: familyUnit?.family_name ?? "My Family",
      ...(prefill ? { prefill } : {}),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to fetch invitation", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch invitation",
    });
  }
});
