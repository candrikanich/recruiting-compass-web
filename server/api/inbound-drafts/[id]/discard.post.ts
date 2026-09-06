/**
 * POST /api/inbound-drafts/:id/discard
 * Marks a pending inbound-email draft discarded. Idempotent and never
 * touches a draft that's already `confirmed` — discarding is a no-op
 * success there, since that draft is already linked to a real interaction.
 */
import { defineEventHandler, getRouterParam, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { resolveFamilyUnitId } from "~/server/utils/familyMembership";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "inbound-drafts/discard");
  try {
    const { id: userId } = await requireAuth(event);
    const draftId = getRouterParam(event, "id")!;
    if (!UUID_SHAPE.test(draftId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid draft id" });
    }

    const familyUnitId = await resolveFamilyUnitId(event, userId);
    const admin = useSupabaseAdmin();

    const { data: draft } = await admin
      .from("inbound_email_drafts")
      .select("id, family_unit_id, status")
      .eq("id", draftId)
      .maybeSingle();
    if (!draft || draft.family_unit_id !== familyUnitId) {
      throw createError({ statusCode: 404, statusMessage: "Draft not found" });
    }

    if (draft.status !== "pending") {
      return { ok: true };
    }

    const { error: updateError } = await admin
      .from("inbound_email_drafts")
      .update({ status: "discarded" })
      .eq("id", draftId);
    if (updateError) {
      logger.error("Failed to discard draft", updateError);
      throw createError({ statusCode: 500, statusMessage: "Failed to discard draft" });
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to discard inbound draft", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to discard draft" });
  }
});
