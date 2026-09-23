/**
 * POST /api/inbound-drafts/:id/confirm
 * Turns a pending inbound-email draft into a real `interactions` row. The
 * caller reviews the parsed draft first (#678) and may override any of the
 * fields below before confirming; anything omitted falls back to the value
 * the parser found. Requires `schoolId` in the body only when the draft has
 * no matched school (interactions.school_id is NOT NULL). Idempotent —
 * re-confirming an already-confirmed draft returns its existing interaction
 * without duplicating it.
 */
import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { useLogger } from "~/server/utils/logger";
import { resolveAthleteId } from "~/server/utils/resolveAthleteId";

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTERACTION_TYPES = [
  "email",
  "text",
  "phone_call",
  "in_person_visit",
  "virtual_meeting",
  "camp",
  "showcase",
  "tweet",
  "dm",
  "game",
  "unofficial_visit",
  "official_visit",
  "interest",
  "other",
] as const;
export const confirmBodySchema = z.object({
  schoolId: z.string().regex(UUID_SHAPE, "Invalid UUID").optional(),
  coachId: z.string().regex(UUID_SHAPE, "Invalid UUID").nullable().optional(),
  type: z.enum(INTERACTION_TYPES).optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  occurredAt: z.string().optional(),
  subject: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "inbound-drafts/confirm");
  try {
    const { id: userId } = await requireAuth(event);
    const draftId = getRouterParam(event, "id")!;
    if (!UUID_SHAPE.test(draftId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid draft id" });
    }
    const parsed = confirmBodySchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0]?.message ?? "Invalid request",
      });
    }

    const token = extractRequestToken(event);
    const admin = createServerSupabaseUserClient(token);

    const { data: draft } = await admin
      .from("inbound_email_drafts")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    if (!draft) {
      throw createError({ statusCode: 404, statusMessage: "Draft not found" });
    }

    if (draft.status === "confirmed") {
      return { ok: true, interactionId: draft.confirmed_interaction_id };
    }
    if (draft.status === "discarded") {
      throw createError({
        statusCode: 422,
        statusMessage: "Cannot confirm a discarded draft",
      });
    }
    if (!draft.matched_school_id && !parsed.data.schoolId) {
      throw createError({
        statusCode: 422,
        statusMessage:
          "schoolId is required — this draft has no matched school",
      });
    }

    // Interaction creation and draft confirmation happen inside one
    // SECURITY DEFINER RPC, not a client-side insert followed by an update
    // -- a caller-supplied interaction id can't be trusted as proof it was
    // created for this draft (any family member could insert their own
    // interaction and pass its id in). The RPC creates the interaction
    // itself from these fields, so `interactions.source_draft_id` is only
    // ever set from the row the RPC just locked, never from client input.
    // It also closes the observable race where two concurrent confirms
    // both pass the status check above -- its own UPDATE is WHERE status =
    // 'pending', server-side.
    const { data: rpcResult, error: rpcError } = await admin
      .rpc("confirm_inbound_draft", {
        p_draft_id: draftId,
        p_school_id: parsed.data.schoolId ?? null,
        p_coach_id: parsed.data.coachId ?? null,
        p_coach_id_set: parsed.data.coachId !== undefined,
        p_type: parsed.data.type ?? null,
        p_direction: parsed.data.direction ?? null,
        p_subject: parsed.data.subject ?? null,
        p_subject_set: parsed.data.subject !== undefined,
        p_content: parsed.data.content ?? null,
        p_content_set: parsed.data.content !== undefined,
        p_occurred_at: parsed.data.occurredAt ?? null,
      })
      .single();
    if (rpcError || !rpcResult) {
      logger.error("Failed to confirm draft", rpcError);
      const statusMessage = rpcError?.message ?? "";
      if (statusMessage.includes("schoolId is required")) {
        throw createError({ statusCode: 422, statusMessage });
      }
      if (statusMessage === "invalid schoolId") {
        throw createError({ statusCode: 422, statusMessage: "Invalid schoolId" });
      }
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to confirm draft",
      });
    }

    const interactionId = rpcResult.interaction_id;
    if (!interactionId) {
      // Only reachable if the RPC's idempotent-replay branch somehow
      // returned a confirmed draft with no interaction id, which its own
      // logic never produces -- kept as a type-narrowing guard, not a
      // reachable runtime path.
      logger.error("confirm_inbound_draft returned no interaction id", {
        draftId,
      });
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to confirm draft",
      });
    }

    // Materialize any attachments staged with this draft (Phase 3 Task 3)
    // into real `documents` rows now that an `interactions` row exists to
    // hang them off of. No re-upload — same storage object the webhook
    // already wrote, just a new DB row referencing it.
    const { data: stagedAttachments, error: stagedAttachmentsError } =
      await admin
        .from("raw_inbound_attachments")
        .select("filename, content_type, storage_path")
        .eq("draft_id", draftId);
    if (stagedAttachmentsError) {
      logger.error(
        "Failed to load staged inbound attachments",
        stagedAttachmentsError,
      );
    } else if (stagedAttachments && stagedAttachments.length > 0) {
      const { data: interactionRow } = await admin
        .from("interactions")
        .select("school_id")
        .eq("id", interactionId)
        .single();
      const schoolId = interactionRow?.school_id;
      // Documents are athlete-owned regardless of who confirms the draft —
      // a parent confirming must not park the attachment on their own
      // (unlisted) Documents page. `uploaded_by` stays the actual confirming
      // user; only `user_id` (the list-scoping owner) is resolved to the
      // athlete. Inherits resolveAthleteId's known .maybeSingle() gap on
      // multi-athlete families (tracked separately) — same helper every
      // other family-scoped write path already uses.
      const athleteUserId = await resolveAthleteId(userId, admin);
      const documentInserts = stagedAttachments.map((attachment) => ({
        type: "coach_attachment" as const,
        interaction_id: interactionId,
        family_unit_id: draft.family_unit_id,
        school_id: schoolId,
        user_id: athleteUserId,
        uploaded_by: userId,
        file_url: admin.storage
          .from("documents")
          .getPublicUrl(attachment.storage_path).data.publicUrl,
        file_type: attachment.content_type,
        title: attachment.filename,
      }));
      const { error: documentsError } = await admin
        .from("documents")
        .insert(documentInserts);
      if (documentsError) {
        // Attachments stay staged and are picked up by the retention purge;
        // never fail confirm over a document-linking error — the
        // interaction itself already exists and confirm is idempotent.
        logger.error(
          "Failed to create documents from staged inbound attachments",
          documentsError,
        );
      }
    }

    return {
      ok: true,
      interactionId,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to confirm inbound draft", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to confirm draft",
    });
  }
});
