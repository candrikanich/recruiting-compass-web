import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { invalidatePublicProfileForUser } from "~/server/utils/publicProfileRead";
import {
  normalizeSectionConfig,
  backfillSectionConfig,
} from "~/utils/profile/sectionConfig";
import type { ProfileSection } from "~/types/models";

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
  header_color: z
    .enum([
      "slate",
      "blue",
      "emerald",
      "violet",
      "rose",
      "amber",
      "teal",
      "indigo",
    ])
    .optional(),
  vanity_slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/, "Invalid slug format")
    .nullable()
    .optional(),
  banner_url: z.string().url().nullable().optional(),
  looking_for: z.string().max(600).nullable().optional(),
  commitment_status: z.enum(["uncommitted", "committed"]).optional(),
  committed_school_id: z.string().uuid().nullable().optional(),
  awards: z
    .array(
      z.object({
        title: z.string().max(120),
        year: z.number().int().nullable(),
      }),
    )
    .optional(),
  values_tags: z.array(z.string().max(60)).max(12).optional(),
  section_config: z
    .array(
      z.object({
        key: z.enum([
          "metrics",
          "film",
          "academics",
          "values",
          "team_history",
          "awards",
        ]),
        visible: z.boolean(),
      }),
    )
    .optional(),
  show_metrics: z.boolean().optional(),
});

const LEGACY_KEYS = {
  metrics: "show_metrics",
  film: "show_film",
  academics: "show_academics",
} as const;

export function reconcileVisibility(
  updates: Record<string, unknown>,
  current: {
    section_config?: unknown;
    show_metrics?: boolean;
    show_film?: boolean;
    show_academics?: boolean;
  },
): Record<string, unknown> {
  const out = { ...updates };
  if (Array.isArray(updates.section_config)) {
    const sections = normalizeSectionConfig(updates.section_config);
    out.section_config = sections;
    for (const [key, col] of Object.entries(LEGACY_KEYS)) {
      out[col] = sections.some(
        (s) => s.key === (key as ProfileSection["key"]) && s.visible,
      );
    }
    return out;
  }
  const touchedLegacy = Object.entries(LEGACY_KEYS).filter(
    ([, col]) => col in updates,
  );
  if (touchedLegacy.length) {
    const base =
      Array.isArray(current.section_config) && current.section_config.length
        ? normalizeSectionConfig(current.section_config)
        : backfillSectionConfig(current);
    out.section_config = base.map((s) => {
      const hit = touchedLegacy.find(([key]) => key === s.key);
      return hit ? { ...s, visible: !!updates[hit[1]] } : s;
    });
  }
  return out;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile");
  try {
    const { id: userId } = await requireAuth(event);
    const body = await readBody(event);
    const supabase = useSupabaseAdmin();

    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: "Invalid profile data",
      });
    }

    const updates = parsed.data;

    if (updates.vanity_slug && RESERVED_SLUGS.has(updates.vanity_slug)) {
      throw createError({
        statusCode: 422,
        statusMessage: "That slug is reserved",
      });
    }

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();

    if (!membership) {
      throw createError({
        statusCode: 403,
        statusMessage: "Not a family member",
      });
    }

    const { data: currentRow } = await supabase
      .from("player_profiles")
      .select("section_config, show_metrics, show_film, show_academics")
      .eq("user_id", userId)
      .maybeSingle();

    const merged = reconcileVisibility(updates, currentRow ?? {});

    const { error } = await supabase
      .from("player_profiles")
      .update(merged as typeof updates)
      .eq("user_id", userId);

    if (error) {
      if ((error as { code: string }).code === "23505") {
        throw createError({
          statusCode: 409,
          statusMessage: "That slug is already taken",
        });
      }
      logger.error("Failed to update player profile", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update profile",
      });
    }

    try {
      await invalidatePublicProfileForUser(userId);
    } catch (invalidateErr) {
      logger.warn("Public profile cache invalidation failed", invalidateErr);
    }

    logger.info("Player profile updated", { userId });
    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to update profile", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update profile",
    });
  }
});
