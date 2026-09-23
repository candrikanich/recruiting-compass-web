import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { useLogger } from "~/server/utils/logger";

// Whole flow (existing-family checks, code+token generation, race recovery,
// membership insert, usage log) lives in create_family_for_user() -- a
// SECURITY DEFINER RPC, not sequential RLS-scoped queries. Two reasons:
// generating a collision-free code/token requires reading EVERY family's
// row, which no ordinary RLS policy can safely grant to a session-scoped
// client; and the create-race recovery path (23505 on
// idx_family_units_one_per_creator, read-back, upsert membership) needs to
// stay atomic within one transaction, not split across separate
// session-scoped queries.
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/create");
  try {
    await requireAuth(event);
    const token = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(token);

    const { data, error } = await supabase
      .rpc("create_family_for_user")
      .single();

    if (error || !data) {
      logger.error("Family creation failed", error);
      throw createError({
        statusCode: 500,
        message: "Failed to create family",
      });
    }

    logger.info("Family created", {
      familyId: data.family_id,
      familyCode: data.family_code,
      alreadyExisted: data.already_existed,
    });

    return {
      success: true,
      familyId: data.family_id,
      familyCode: data.family_code,
      familyName: data.family_name,
      ...(data.already_existed ? { message: "Family already exists" } : {}),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to create family", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create family",
    });
  }
});
