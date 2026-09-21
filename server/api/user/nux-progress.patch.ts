import { defineEventHandler, createError, readBody } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { NUX_CHECKLIST_KEYS } from "~/types/nux";

// Mirrors types/nux.ts's NuxProgress shape (composables/useNuxProgress.ts's
// persistProgress() is the only caller, always sending the full object it
// read via parseNuxProgress() back out -- every field is always present,
// none are client-omittable).
const nuxChecklistItemSchema = z.object({
  completed: z.boolean(),
  completedAt: z.string().nullable(),
});

// z.record(z.enum(...), ...) in Zod v4 requires every enum key to be
// present (exhaustive); items is a Partial<Record<...>>, so key membership
// is checked separately via refine.
const nuxChecklistKeySet: ReadonlySet<string> = new Set(NUX_CHECKLIST_KEYS);
const nuxChecklistItemsSchema = z
  .record(z.string(), nuxChecklistItemSchema)
  .refine((items) => Object.keys(items).every((k) => nuxChecklistKeySet.has(k)), {
    message: "Invalid checklist item key",
  });

const nuxProgressSchema = z.object({
  version: z.number(),
  checklist: z.object({
    items: nuxChecklistItemsSchema,
    dismissedAt: z.string().nullable(),
    allCompleteAt: z.string().nullable(),
  }),
  profileCompletion: z.object({
    completedAt: z.string().nullable(),
  }),
  firstVisits: z.record(z.string(), z.string()),
  dismissals: z.record(z.string(), z.string()),
});

const nuxProgressBodySchema = z.object({
  nux_progress: nuxProgressSchema,
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "user/nux-progress");
  try {
    const user = await requireAuth(event);
    const rawBody = await readBody(event);
    const parsedBody = nuxProgressBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      throw createError({
        statusCode: 400,
        statusMessage:
          parsedBody.error.issues[0]?.message ?? "Invalid nux_progress payload",
      });
    }
    const { nux_progress } = parsedBody.data;

    const supabase = useSupabaseAdmin();
    const { error } = await supabase
      .from("users")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ nux_progress } as any)
      .eq("id", user.id);

    if (error) {
      logger.error("Failed to update nux_progress", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update nux progress",
      });
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to update nux_progress", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update nux progress",
    });
  }
});
