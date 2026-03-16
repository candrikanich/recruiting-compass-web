import { defineEventHandler, createError, readBody } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const profileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "user/profile");
  try {
    const user = await requireAuth(event);
    const body = await readBody(event);
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid profile data",
        data: parsed.error.flatten(),
      });
    }

    if (Object.keys(parsed.data).length === 0) {
      throw createError({ statusCode: 400, statusMessage: "At least one field must be provided" });
    }

    const supabase = useSupabaseAdmin();
    const { error } = await supabase
      .from("users")
      .update(parsed.data)
      .eq("id", user.id);

    if (error) {
      logger.error("Failed to update user profile", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to update profile" });
    }

    logger.info("User profile updated", { userId: user.id });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to update user profile", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to update profile" });
  }
});
