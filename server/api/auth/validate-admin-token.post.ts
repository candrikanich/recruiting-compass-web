/**
 * POST /api/auth/validate-admin-token
 * Validates an admin registration token
 *
 * Request body: { token: string, email: string }
 * Response: { valid: boolean, message?: string }
 *
 * This endpoint is called during signup when a user selects the "Admin" role.
 * Issue #854: previously compared against a single static, permanent,
 * unbound token derived from ADMIN_TOKEN_SECRET (server/utils/adminToken.ts,
 * now removed) — validates against a per-invitation, email-bound, expiring
 * row in admin_invitations instead. Read-only check (the actual grant +
 * single-use consumption happens in admin-profile.post.ts).
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { emailSchema } from "~/utils/validation/validators";

// Tokens are minted via randomUUID() (server/api/admin/invitations.post.ts),
// so a real UUID shape, not just a non-empty string. .trim() first: the
// token field is a manually-typed/pasted text input on the admin signup
// form (pages/admin/signup.vue) -- that page only checks trimmed length for
// its own non-empty guard but sends the raw untrimmed value, so incidental
// copy-paste whitespace must not 400 a legitimate token.
const validateAdminTokenSchema = z.object({
  token: z.string().trim().uuid(),
  email: emailSchema,
});

interface ValidateAdminTokenResponse {
  valid: boolean;
  message?: string;
}

export default defineEventHandler(
  async (event): Promise<ValidateAdminTokenResponse> => {
    const logger = useLogger(event, "auth/validate-admin-token");
    try {
      const rawBody = await readBody(event);
      const parsed = validateAdminTokenSchema.safeParse(rawBody);
      if (!parsed.success) {
        logger.warn("Admin token validation attempt with malformed body", {
          issue: parsed.error.issues[0]?.message,
        });
        throw createError({
          statusCode: 400,
          statusMessage:
            parsed.error.issues[0]?.message ?? "Invalid request body",
        });
      }
      const { token, email } = parsed.data;

      const supabase = useSupabaseAdmin();
      const { data: invitation, error: lookupError } = await supabase
        .from("admin_invitations")
        .select("invited_email, expires_at, consumed_at")
        .eq("token", token)
        .maybeSingle();

      // Supabase returns query failures as { error }, it doesn't throw — a
      // swallowed error here would report a valid invitation as "invalid
      // token" instead of the actual service failure (review finding).
      if (lookupError) {
        logger.error("Admin invitation lookup failed", lookupError);
        throw createError({
          statusCode: 500,
          statusMessage: "Token validation failed",
        });
      }

      const isValid =
        !!invitation &&
        invitation.consumed_at === null &&
        new Date(invitation.expires_at) > new Date() &&
        invitation.invited_email.trim().toLowerCase() ===
          email.trim().toLowerCase();

      if (!isValid) {
        logger.warn("Invalid admin token provided during signup");
        return {
          valid: false,
          message: "Invalid admin registration token",
        };
      }

      logger.info("Admin token validated successfully");

      return {
        valid: true,
      };
    } catch (error) {
      logger.error("Admin token validation failed", error);

      // Re-throw HTTP errors
      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        statusMessage: "Token validation failed",
      });
    }
  },
);
