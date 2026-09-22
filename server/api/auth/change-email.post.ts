import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { emailSchema } from "~/utils/validation/validators";

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  currentPassword: z.string().min(1),
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
  const logger = useLogger(event, "auth/change-email");
  try {
    const user = await requireAuth(event);
    const body = await readBody<{ newEmail: string; currentPassword: string }>(
      event,
    );

    const parsed = changeEmailSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn("Validation failed for change-email", parsed.error.issues);
      throw createError({ statusCode: 400, statusMessage: "Invalid request" });
    }

    const { newEmail, currentPassword } = parsed.data;

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

    if (signInError) {
      throw createError({
        statusCode: 401,
        statusMessage: "Current password is incorrect",
      });
    }

    const supabase = useSupabaseAdmin();

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email: newEmail,
      },
    );

    if (updateError) {
      logger.error("Failed to update email", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update email",
      });
    }

    logger.info("Email change initiated, verification email sent");
    return { success: true, message: "Verification email sent to new address" };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error changing email", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to change email",
    });
  }
});
