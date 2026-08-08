/**
 * POST /api/athlete/messages
 *
 * Log a sent coach-outreach message (Phase 4). Transport is mailto/sms, so this
 * records the send optimistically on click — enough to power the programNote
 * dedupe and follow-up timing. Authorized via family membership so an athlete or
 * a linked parent composing on their behalf both log against the athlete.
 * family_unit_id is derived by the table's BEFORE-write trigger.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

type AthleteMessageInsert = Database["public"]["Tables"]["athlete_messages"]["Insert"];

const bodySchema = z.object({
  athleteUserId: z.string().uuid(),
  schoolId: z.string().uuid().nullable().optional(),
  coachId: z.string().uuid().nullable().optional(),
  templateSlug: z.string().max(100).nullable().optional(),
  channel: z.string().max(20).nullable().optional(),
  programNote: z.string().max(2000).nullable().optional(),
  updateHook: z.string().max(2000).nullable().optional(),
  subject: z.string().max(500).nullable().optional(),
  body: z.string().max(20000).nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/messages");
  const user = await requireAuth(event);

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid request body" });
  }
  const b = parsed.data;

  const targetId = await resolveTargetAthleteId(event, user.id, b.athleteUserId);
  const supabase = useSupabaseAdmin();

  const row: AthleteMessageInsert = {
    user_id: targetId,
    school_id: b.schoolId ?? null,
    coach_id: b.coachId ?? null,
    template_slug: b.templateSlug ?? null,
    channel: b.channel ?? null,
    program_note: b.programNote?.trim() || null,
    update_hook: b.updateHook?.trim() || null,
    subject: b.subject ?? null,
    body: b.body ?? null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("athlete_messages")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    logger.error("Failed to log athlete message", { error, athleteUserId: targetId });
    throw createError({ statusCode: 500, statusMessage: "Failed to log message" });
  }

  logger.info("Athlete message logged", { athleteUserId: targetId, id: data.id });
  return { success: true, id: data.id };
});
