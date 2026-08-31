import { defineEventHandler, createError, readBody } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "user/nux-progress");
  try {
    const user = await requireAuth(event);
    const body = await readBody(event);
    const { nux_progress } = body ?? {};

    if (!nux_progress || typeof nux_progress !== "object") {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid nux_progress payload",
      });
    }

    const supabase = useSupabaseAdmin();
    const { error } = await supabase
      .from("users")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ nux_progress } as any)
      .eq("id", user.id);

    if (error) {
      logger.error("Failed to update nux_progress", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update nux progress",
      });
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to update nux_progress", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update nux progress",
    });
  }
});
