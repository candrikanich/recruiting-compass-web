/**
 * GET /api/inbound-drafts
 * Lists the caller's family's inbound-email drafts. Defaults to `pending`
 * only; pass `?status=all` for the full history (confirmed + discarded too).
 */
import { defineEventHandler, getQuery, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { resolveFamilyUnitId } from "~/server/utils/familyMembership";

const VALID_STATUSES = ["pending", "confirmed", "discarded", "all"] as const;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "inbound-drafts/list");
  try {
    const { id: userId } = await requireAuth(event);
    const familyUnitId = await resolveFamilyUnitId(event, userId);
    const admin = useSupabaseAdmin();

    const rawStatus = getQuery(event).status;
    if (
      rawStatus !== undefined &&
      !VALID_STATUSES.includes(rawStatus as (typeof VALID_STATUSES)[number])
    ) {
      throw createError({ statusCode: 400, statusMessage: "Invalid status" });
    }
    const status = rawStatus as (typeof VALID_STATUSES)[number] | undefined;

    let query = admin
      .from("inbound_email_drafts")
      .select("*")
      .eq("family_unit_id", familyUnitId);
    if (status !== "all") {
      query = query.eq("status", status ?? "pending");
    }
    const { data: drafts, error: draftsError } = await query.order(
      "created_at",
      {
        ascending: false,
      },
    );
    if (draftsError) {
      logger.error("Failed to list inbound drafts", draftsError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load drafts",
      });
    }

    return { drafts: drafts ?? [] };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to list inbound drafts", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load drafts",
    });
  }
});
