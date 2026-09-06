/**
 * POST /api/inbound-drafts/:id/confirm
 * Turns a pending inbound-email draft into a real `interactions` row.
 * Requires `schoolId` in the body only when the draft has no matched school
 * (interactions.school_id is NOT NULL). Idempotent — re-confirming an
 * already-confirmed draft returns its existing interaction without
 * duplicating it.
 */
import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const confirmBodySchema = z.object({
  schoolId: z.string().regex(UUID_SHAPE, "Invalid UUID").optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "inbound-drafts/confirm");
  try {
    const { id: userId } = await requireAuth(event);
    const draftId = getRouterParam(event, "id")!;
    const parsed = confirmBodySchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0]?.message ?? "Invalid request",
      });
    }

    const admin = useSupabaseAdmin();

    const { data: membership } = await admin
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: draft } = await admin
      .from("inbound_email_drafts")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    if (!draft || draft.family_unit_id !== membership.family_unit_id) {
      throw createError({ statusCode: 404, statusMessage: "Draft not found" });
    }

    if (draft.status === "confirmed") {
      return { ok: true, interactionId: draft.confirmed_interaction_id };
    }

    let schoolId = draft.matched_school_id;
    if (!schoolId) {
      if (!parsed.data.schoolId) {
        throw createError({
          statusCode: 422,
          statusMessage: "schoolId is required — this draft has no matched school",
        });
      }
      // schools is family-scoped; the admin client bypasses RLS, so confirm
      // the caller-supplied schoolId actually belongs to their own family
      // before letting it into the interaction insert.
      const { data: school } = await admin
        .from("schools")
        .select("id")
        .eq("id", parsed.data.schoolId)
        .eq("family_unit_id", draft.family_unit_id)
        .maybeSingle();
      if (!school) {
        throw createError({ statusCode: 422, statusMessage: "Invalid schoolId" });
      }
      schoolId = school.id;
    }

    const { data: interaction, error: insertError } = await admin
      .from("interactions")
      .insert({
        family_unit_id: draft.family_unit_id,
        school_id: schoolId,
        coach_id: draft.matched_coach_id,
        type: "email",
        direction: "inbound",
        subject: draft.subject,
        content: draft.body_text,
        occurred_at: draft.occurred_at,
        logged_by: userId,
      })
      .select("id")
      .single();
    if (insertError || !interaction) {
      logger.error("Failed to create interaction from draft", insertError);
      throw createError({ statusCode: 500, statusMessage: "Failed to confirm draft" });
    }

    const { error: updateError } = await admin
      .from("inbound_email_drafts")
      .update({ status: "confirmed", confirmed_interaction_id: interaction.id })
      .eq("id", draftId);
    if (updateError) {
      logger.error("Failed to mark draft confirmed", updateError);
      throw createError({ statusCode: 500, statusMessage: "Failed to confirm draft" });
    }

    return { ok: true, interactionId: interaction.id };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to confirm inbound draft", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to confirm draft" });
  }
});
