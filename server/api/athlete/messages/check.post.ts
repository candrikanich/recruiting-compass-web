/**
 * POST /api/athlete/messages/check
 *
 * Pre-send validation for coach outreach (Phase 4). Returns:
 *  - programNoteReused: the athlete's program note was already sent to a DIFFERENT
 *    program (rule #6, the anti-BCC guardrail — blocking). Only evaluated when a
 *    programNote is supplied (structured authored capture, 5e).
 *  - recentContact / daysSinceLastContact: last message to THIS program (warn <7d).
 *  - messageCountToSchool: prior messages to this program (warn on repeated nudging).
 *
 * Authorized via family membership (resolveTargetAthleteId) so the check is correct
 * whether the athlete or a linked parent is composing.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const bodySchema = z.object({
  athleteUserId: z.string().uuid(),
  schoolId: z.string().uuid().nullable().optional(),
  programNote: z.string().nullable().optional(),
});

const DAY_MS = 86_400_000;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/messages/check");
  const user = await requireAuth(event);

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid request body" });
  }
  const { athleteUserId, schoolId, programNote } = parsed.data;

  const targetId = await resolveTargetAthleteId(event, user.id, athleteUserId);
  const supabase = useSupabaseAdmin();

  // Rule #6: same program note already sent to a DIFFERENT program → blocking.
  let programNoteReused = false;
  const note = programNote?.trim();
  if (note && schoolId) {
    const { data, error } = await supabase
      .from("athlete_messages")
      .select("id")
      .eq("user_id", targetId)
      .eq("program_note", note)
      .neq("school_id", schoolId)
      .limit(1);
    if (error) {
      logger.error("programNote dedupe check failed", error);
    } else {
      programNoteReused = (data?.length ?? 0) > 0;
    }
  }

  // Timing: last contact + total messages to THIS program.
  let daysSinceLastContact: number | null = null;
  let messageCountToSchool = 0;
  if (schoolId) {
    const { data: last } = await supabase
      .from("athlete_messages")
      .select("sent_at")
      .eq("user_id", targetId)
      .eq("school_id", schoolId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.sent_at) {
      daysSinceLastContact = Math.floor((Date.now() - new Date(last.sent_at).getTime()) / DAY_MS);
    }
    const { count } = await supabase
      .from("athlete_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("school_id", schoolId);
    messageCountToSchool = count ?? 0;
  }

  return {
    programNoteReused,
    daysSinceLastContact,
    recentContact: daysSinceLastContact != null && daysSinceLastContact < 7,
    messageCountToSchool,
  };
});
