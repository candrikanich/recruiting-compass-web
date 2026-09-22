import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { dateSchema, sanitizedTextSchema } from "~/utils/validation/validators";
import { getGraduationYearOptions } from "~/utils/graduationYears";

// pages/onboarding/parent.vue (this route's only current caller) sends
// graduationYear as a plain string (it's a <select> bound to a string ref,
// never v-model.number) -- accept both that and a real number (the latter
// is what this route's own unit test fixture and signup-minor.post.ts's
// caller send) rather than assuming one shape. getGraduationYearOptions()
// is called inside the refine, not hoisted to module scope, so the valid
// range stays correct across the July year-boundary it's keyed on even in
// a long-running server process.
const graduationYearFieldSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === "string" ? Number(val) : val))
  .refine(
    (val) => Number.isInteger(val) && getGraduationYearOptions().includes(val),
    { message: "Invalid graduation year" },
  );

// All fields stay optional at the schema level (parent.vue's own submit
// button only gates playerDob/graduationYear/sport, not playerName -- and
// this is the route's ONLY known caller, but a missing field here just
// means less pending-profile data gets prefilled, not a security gap) --
// this only rejects a field that's PRESENT but malformed/mistyped.
const playerDetailsSchema = z.object({
  playerName: sanitizedTextSchema(255),
  playerDob: dateSchema.optional(),
  graduationYear: graduationYearFieldSchema.optional(),
  sport: sanitizedTextSchema(100),
  position: sanitizedTextSchema(100),
  gender: sanitizedTextSchema(50),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/player-details");
  const user = await requireAuth(event);
  const rawBody = await readBody(event);

  const parsed = playerDetailsSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        parsed.error.issues[0]?.message ?? "Invalid player details",
    });
  }
  const { playerName, playerDob, graduationYear, sport, position, gender } =
    parsed.data;

  const token = extractRequestToken(event);
  const supabase = createServerSupabaseUserClient(token);

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not a family member",
    });
  }

  const { error } = await supabase
    .from("family_units")
    .update({
      // Persist every field the parent entered so nothing is lost between parent
      // onboarding and the player accepting the invite (hydrated into the athlete's
      // canonical profile in invite/[token]/accept). playerDob was previously dropped.
      pending_player_details: {
        playerName,
        ...(playerDob ? { playerDob } : {}),
        graduationYear,
        sport,
        position,
        ...(gender ? { gender } : {}),
      },
    })
    .eq("id", membership.family_unit_id);

  if (error) {
    logger.error("Failed to save player details", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to save player details",
    });
  }

  logger.info("Player details pre-filled by parent", {
    familyUnitId: membership.family_unit_id,
  });
  return { success: true };
});
