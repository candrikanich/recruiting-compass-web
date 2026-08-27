/**
 * POST /api/player/profile/contacts/:id/resolve
 * Marks an inbound lead resolved (with the interaction the player minted) or
 * dismissed. Family scope resolved server-side from the caller's
 * family_members row. Idempotent: a lead already resolved returns its
 * existing interaction_id without overwriting.
 */
import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

// A permissive UUID-shape check rather than Zod's strict `.uuid()`, which
// enforces the RFC4122 version/variant nibbles and rejects otherwise
// well-formed ids (e.g. test fixtures, some generators).
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const resolveBodySchema = z
  .object({
    status: z.enum(["resolved", "dismissed"]),
    interactionId: z.string().regex(UUID_SHAPE, "Invalid UUID").optional(),
  })
  .refine((v) => v.status !== "resolved" || !!v.interactionId, {
    message: "interactionId is required when resolving",
    path: ["interactionId"],
  });

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile/contacts/resolve");
  try {
    const { id: userId } = await requireAuth(event);
    const leadId = getRouterParam(event, "id")!;
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid lead id" });
    }

    const parsed = resolveBodySchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0]?.message ?? "Invalid request",
      });
    }

    const admin = useSupabaseAdmin();

    const { data: membership, error: membershipError } = await admin
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();
    if (membershipError && membershipError.code !== "PGRST116") {
      logger.error("Failed to resolve family membership", membershipError);
      throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
    }
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: lead, error: leadErr } = await admin
      .from("profile_contacts")
      .select("id, status, interaction_id, family_unit_id")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr) {
      logger.error("Failed to load lead", leadErr);
      throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
    }
    if (!lead || lead.family_unit_id !== membership.family_unit_id) {
      throw createError({ statusCode: 404, statusMessage: "Lead not found" });
    }

    // Double-convert guard: never overwrite an existing resolution.
    if (lead.status === "resolved") {
      return { ok: true, status: "resolved", interactionId: lead.interaction_id };
    }

    const { error: updErr } = await admin
      .from("profile_contacts")
      .update({
        status: parsed.data.status,
        interaction_id: parsed.data.interactionId ?? null,
      })
      .eq("id", leadId);
    if (updErr) {
      logger.error("Failed to update lead status", updErr);
      throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
    }

    return {
      ok: true,
      status: parsed.data.status,
      interactionId: parsed.data.interactionId ?? null,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to resolve lead", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
  }
});
