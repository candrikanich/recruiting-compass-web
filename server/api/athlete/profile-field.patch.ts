/**
 * PATCH /api/athlete/profile-field
 *
 * Write-back for the coach-outreach compose panel (Slice 5c): fill an empty
 * profile variable inline and persist it. Deliberately narrow — only the
 * athlete's OWN registry-backed profile columns are writable, enforced by a
 * typed whitelist (never an arbitrary column) plus canMutateAthleteData
 * (athlete edits self; parents are read-only per product policy). The Phase-1
 * BEFORE-write trigger keeps user_preferences in sync where relevant.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth, canMutateAthleteData } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import {
  EDITABLE_USERS_COLUMNS,
  editableColumnFor,
  coerceProfileValue,
} from "~/utils/editableProfileFields";
import type { Database } from "~/types/database";

type UsersUpdate = Database["public"]["Tables"]["users"]["Update"];

const bodySchema = z.object({
  athleteUserId: z.string().uuid(),
  sourcePath: z.string().min(1),
  value: z.string().nullable(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "athlete/profile-field");
  const user = await requireAuth(event);

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Invalid request body",
    });
  }
  const { athleteUserId, sourcePath, value } = parsed.data;

  const supabase = useSupabaseAdmin();

  // Authz: athlete may write only their own data; parents are read-only.
  if (!(await canMutateAthleteData(user.id, athleteUserId, supabase))) {
    logger.warn("Profile-field write denied", { callerId: user.id, athleteUserId });
    throw createError({ statusCode: 403, statusMessage: "Not authorized to edit this profile" });
  }

  const column = editableColumnFor(sourcePath);
  if (!column) {
    throw createError({ statusCode: 400, statusMessage: "Field is not editable" });
  }

  const coercion = coerceProfileValue(value, EDITABLE_USERS_COLUMNS[column]);
  if (!coercion.ok) {
    throw createError({ statusCode: 400, statusMessage: coercion.error });
  }
  const coerced = coercion.value;

  const { error } = await supabase
    .from("users")
    .update({ [column]: coerced } as UsersUpdate)
    .eq("id", athleteUserId);

  if (error) {
    logger.error("Failed to write profile field", { error, column, athleteUserId });
    throw createError({ statusCode: 500, statusMessage: "Failed to save" });
  }

  logger.info("Profile field updated", { athleteUserId, column });
  return { success: true, sourcePath, value: coerced === null ? null : String(coerced) };
});
