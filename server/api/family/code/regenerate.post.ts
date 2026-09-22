import { defineEventHandler, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { useLogger } from "~/server/utils/logger";
import { validateBody } from "~/server/utils/validation";

export const regenerateCodeSchema = z.object({
  familyId: z.string().uuid(),
});

// Owner check, code generation, and the update all go through
// regenerate_family_code(), a SECURITY DEFINER RPC, not sequential
// RLS-scoped queries: family_units_update's RLS authorizes any family
// member, not just the creator, so a raw UPDATE under a session-scoped
// client would let any member regenerate the code -- the owner-only rule
// is currently enforced only at the app layer. Generating a collision-free
// code also needs to read every family's row, same as join_family_by_code.
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/code/regenerate");
  try {
    const user = await requireAuth(event);
    const { familyId } = await validateBody(event, regenerateCodeSchema);
    const token = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(token);

    const { data: newCode, error } = await supabase.rpc(
      "regenerate_family_code",
      { p_family_id: familyId },
    );

    if (error) {
      if (error.message === "NOT_FAMILY_OWNER") {
        throw createError({
          statusCode: 403,
          message: "Only the family owner can regenerate the code",
        });
      }
      logger.error("Failed to regenerate family code", error);
      throw createError({
        statusCode: 500,
        message: "Failed to regenerate code",
      });
    }

    logger.info("Family code regenerated", { familyId, userId: user.id });
    return {
      success: true,
      familyCode: newCode,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to regenerate family code", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to regenerate family code",
    });
  }
});
