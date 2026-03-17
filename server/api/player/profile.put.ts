import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const RESERVED_SLUGS = new Set([
  "api",
  "p",
  "auth",
  "login",
  "signup",
  "join",
  "admin",
  "settings",
  "dashboard",
  "coaches",
  "schools",
  "help",
]);

const UpdateProfileSchema = z.object({
  bio: z.string().max(300).nullable().optional(),
  is_published: z.boolean().optional(),
  show_academics: z.boolean().optional(),
  show_athletic: z.boolean().optional(),
  show_film: z.boolean().optional(),
  show_schools: z.boolean().optional(),
  vanity_slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/, "Invalid slug format")
    .nullable()
    .optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile");
  try {
    const { id: userId } = await requireAuth(event);
    const body = await readBody(event);
    const supabase = useSupabaseAdmin();

    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({ statusCode: 422, statusMessage: "Invalid profile data" });
    }

    const updates = parsed.data;

    if (updates.vanity_slug && RESERVED_SLUGS.has(updates.vanity_slug)) {
      throw createError({ statusCode: 422, statusMessage: "That slug is reserved" });
    }

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();

    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { error } = await supabase
      .from("player_profiles")
      .update(updates)
      .eq("user_id", userId);

    if (error) {
      if ((error as { code: string }).code === "23505") {
        throw createError({ statusCode: 409, statusMessage: "That slug is already taken" });
      }
      logger.error("Failed to update player profile", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to update profile" });
    }

    logger.info("Player profile updated", { userId });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to update profile", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to update profile" });
  }
});
