/**
 * POST /api/admin/invitations
 * Mints a one-time, email-bound, 24h-expiring admin registration token.
 *
 * Issue #854: replaces the old static ADMIN_TOKEN_SECRET-derived token
 * (server/utils/adminToken.ts, now removed) — that token never expired,
 * wasn't bound to a recipient, and wasn't single-use, so anyone who ever
 * saw it could self-promote any account to admin, permanently. An existing
 * admin now mints one token per intended admin here; the token is returned
 * for the minting admin to share out-of-band (no email delivery — keeps
 * this fix right-sized).
 */
import { defineEventHandler, readBody, createError } from "h3";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { logAdminAction } from "~/server/utils/adminAudit";
import { emailSchema } from "~/utils/validation/validators";

const bodySchema = z.object({ email: emailSchema });

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "admin/invitations");
  try {
    const admin = await requireAdmin(event);

    const parseResult = bodySchema.safeParse(await readBody(event));
    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          parseResult.error.issues[0]?.message ?? "Invalid request body",
      });
    }
    const { email } = parseResult.data;

    const supabase = useSupabaseAdmin();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const { error } = await supabase.from("admin_invitations").insert({
      token,
      invited_email: email,
      invited_by: admin.id,
      expires_at: expiresAt,
    });

    if (error) {
      logger.error("Failed to mint admin invitation", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to mint admin invitation",
      });
    }

    logAdminAction(event, {
      action: "admin.invite",
      meta: { invitedEmail: email },
    });

    logger.info("Admin invitation minted", { invitedEmail: email });

    return { success: true, token, expiresAt };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to mint admin invitation", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to mint admin invitation",
    });
  }
});
