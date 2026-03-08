import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/change-password");
  try {
    const user = await requireAuth(event);
    const body = await readBody(event);

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message ?? parsed.error.message ?? "Invalid request";
      throw createError({
        statusCode: 400,
        statusMessage: firstError,
      });
    }

    const { currentPassword, newPassword } = parsed.data;

    if (!user.email) {
      throw createError({ statusCode: 400, statusMessage: "User account has no email address" });
    }

    const supabase = useSupabaseAdmin();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw createError({ statusCode: 401, statusMessage: "Current password is incorrect" });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      logger.error("Failed to update password", updateError);
      throw createError({ statusCode: 500, statusMessage: "Failed to update password" });
    }

    logger.info("Password changed successfully");
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error changing password", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to change password" });
  }
});
