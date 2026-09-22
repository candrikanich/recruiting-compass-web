import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// #912: stays on the service-role client -- updateUserById() below is a
// Supabase Auth Admin API call (GoTrue's /admin/users/:id), not a
// PostgREST table query. RLS and createServerSupabaseUserClient() don't
// apply to Auth Admin endpoints at all; they always require the
// service-role key, for any caller. Manual authz already covers this
// route: requireAuth() gates it, and the current-password re-check via a
// fresh anonClient.auth.signInWithPassword() confirms the caller before
// any admin write.
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/change-password");
  try {
    const user = await requireAuth(event);
    const body = await readBody<{
      currentPassword: string;
      newPassword: string;
    }>(event);

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn("Validation failed for change-password", parsed.error.issues);
      throw createError({ statusCode: 400, statusMessage: "Invalid request" });
    }

    const { currentPassword, newPassword } = parsed.data;

    if (!user.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "User account has no email address",
      });
    }

    const anonClient = createClient(
      process.env.NUXT_PUBLIC_SUPABASE_URL!,
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    const supabase = useSupabaseAdmin();

    if (signInError) {
      throw createError({
        statusCode: 401,
        statusMessage: "Current password is incorrect",
      });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      },
    );

    if (updateError) {
      logger.error("Failed to update password", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update password",
      });
    }

    logger.info("Password changed successfully");
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error changing password", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to change password",
    });
  }
});
