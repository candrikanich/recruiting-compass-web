import { defineEventHandler, readBody, getRequestIP, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import {
  isValidFamilyCodeFormat,
  checkRateLimit,
} from "~/server/utils/familyCode";
import { useLogger } from "~/server/utils/logger";

// Type/length gate only -- isValidFamilyCodeFormat below still carries the
// actual FAM-XXXXXX format check, kept as its own step so the 400 for a
// malformed-but-present code stays distinct from a missing/wrong-type field.
const joinByCodeBodySchema = z.object({
  familyCode: z.string().max(50),
});
type JoinByCodeBody = z.infer<typeof joinByCodeBodySchema>;

// Finding a family by code (and the own-family/already-member checks, the
// membership insert, and the usage log) go through join_family_by_code(), a
// SECURITY DEFINER RPC, not sequential RLS-scoped queries -- family_units'
// RLS only authorizes reading a family the caller already belongs to or
// created, so a session-scoped client gets zero rows looking up an
// arbitrary family by code, which is the entire point of this route.
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/code/join");
  const user = await requireAuth(event);
  const rawBody = await readBody(event);
  const parsed = joinByCodeBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid family code format. Expected: FAM-XXXXXX",
    });
  }
  const body: JoinByCodeBody = parsed.data;
  const { familyCode } = body;
  const token = extractRequestToken(event);
  const supabase = createServerSupabaseUserClient(token);

  // Rate limiting
  const ip = getRequestIP(event) || "unknown";
  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      message: "Too many attempts. Please try again in 5 minutes.",
    });
  }

  // Validate format
  if (!isValidFamilyCodeFormat(familyCode)) {
    throw createError({
      statusCode: 400,
      message: "Invalid family code format. Expected: FAM-XXXXXX",
    });
  }

  const { data, error } = await supabase
    .rpc("join_family_by_code", { p_family_code: familyCode })
    .single();

  if (error) {
    if (error.message === "CODE_NOT_FOUND") {
      throw createError({
        statusCode: 404,
        message: "Family code not found. Please check and try again.",
      });
    }
    if (error.message === "CANNOT_JOIN_OWN_FAMILY") {
      throw createError({
        statusCode: 400,
        message: "You cannot join your own family",
      });
    }
    logger.error("Failed to join family via code", error);
    throw createError({
      statusCode: 500,
      message: "Failed to join family",
    });
  }

  if (!data) {
    throw createError({
      statusCode: 500,
      message: "Failed to join family",
    });
  }

  if (data.already_member) {
    return {
      success: true,
      message: "You are already a member of this family",
      familyId: data.family_id,
    };
  }

  logger.info("Joined family via code", {
    familyId: data.family_id,
    userId: user.id,
  });

  return {
    success: true,
    familyId: data.family_id,
    familyName: data.family_name,
    message: `Successfully joined ${data.family_name}`,
  };
});
