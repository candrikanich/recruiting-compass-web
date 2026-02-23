import { useLogger } from "~/server/utils/logger";
import { validateBody } from "~/server/utils/validation";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createSafeErrorResponse } from "~/server/utils/errorHandler";
import { helpFeedbackSchema } from "~/utils/validation/schemas";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "help/feedback");

  try {
    const user = await requireAuth(event);
    const body = await validateBody(event, helpFeedbackSchema);
    const supabase = useSupabaseAdmin();

    const { error } = await supabase.from("help_feedback").insert({
      page: body.page,
      helpful: body.helpful,
      user_id: user.id,
    });

    if (error) {
      logger.error("Failed to save help feedback", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to save feedback" });
    }

    logger.info("Help feedback saved", { page: body.page, helpful: body.helpful });

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    const safe = createSafeErrorResponse(err, "help/feedback");
    throw createError({ statusCode: safe.statusCode, statusMessage: safe.statusMessage });
  }
});
