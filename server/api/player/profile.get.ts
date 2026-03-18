import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

/** Generates a 6-char lowercase alphanumeric hash slug */
function generateHashSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charsLength = chars.length;
  const maxUnbiasedValue = 256 - (256 % charsLength);

  const slugChars: string[] = [];
  while (slugChars.length < 6) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(1));
    const byte = randomBytes[0];
    if (byte >= maxUnbiasedValue) {
      continue;
    }
    slugChars.push(chars[byte % charsLength]);
  }

  return slugChars.join("");
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile");
  try {
    const { id: userId } = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();

    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: existing } = await supabase
      .from("player_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Auto-create profile on first access (idempotent — UNIQUE (user_id) constraint in DB)
    const { data: created, error } = await supabase
      .from("player_profiles")
      .insert({
        user_id: userId,
        family_unit_id: membership.family_unit_id,
        hash_slug: generateHashSlug(),
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation: another request already created the profile
      if ((error as { code: string }).code === "23505") {
        const { data: race } = await supabase
          .from("player_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (race) return race;
      }
      logger.error("Failed to create player profile", error);
      throw createError({ statusCode: 500, statusMessage: "Failed to initialize profile" });
    }

    logger.info("Created new player profile", { userId });
    return created;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load profile", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to load profile" });
  }
});
