import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

/** Generates a 6-char lowercase alphanumeric hash slug */
function generateHashSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => chars[b % chars.length])
    .join("");
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile");
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

  const { data: existing } = await (supabase as any)
    .from("player_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Auto-create profile on first access (idempotent — UNIQUE (user_id) constraint in DB)
  const { data: created, error } = await (supabase as any)
    .from("player_profiles")
    .insert({
      user_id: userId,
      family_unit_id: membership.family_unit_id,
      hash_slug: generateHashSlug(),
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create player profile", error);
    throw createError({ statusCode: 500, statusMessage: "Failed to initialize profile" });
  }

  logger.info("Created new player profile", { userId });
  return created;
});
