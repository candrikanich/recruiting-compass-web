import { defineEventHandler, createError, readBody } from "h3";
import { z } from "zod";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { extractRequestToken } from "~/server/utils/requestToken";
import { NUX_CHECKLIST_KEYS } from "~/types/nux";

// Mirrors types/nux.ts's NuxProgress shape. Two real callers:
// composables/useNuxProgress.ts's persistProgress() (web) and
// NuxProgressServiceImpl.saveNuxProgress() (iOS, NuxProgressService.swift).
// iOS's JSONEncoder uses default synthesized encoding for `Date?` fields --
// nil optionals are OMITTED from the JSON entirely, not sent as `null` --
// so every timestamp must tolerate being absent, not just nullable.
//
// Rather than reject a payload outright over one malformed/legacy nested
// timestamp or an unrecognized checklist key (pre-#913 rows could have
// either, since nothing validated them before), normalize: an omitted or
// unparseable timestamp becomes null, an unrecognized checklist key or
// malformed item is dropped. The top-level shape (nux_progress must be an
// object with these fields) still 400s outright -- that can't happen from
// any real caller and signals a genuinely broken request.
const isoDatetime = z.iso.datetime();

// null/undefined/malformed -> null; a real ISO datetime string passes through.
const timestampSchema = z.preprocess((val) => {
  if (typeof val === "string" && isoDatetime.safeParse(val).success) {
    return val;
  }
  return null;
}, z.string().nullable());

// Drops entries whose value isn't a valid ISO datetime string, instead of
// rejecting the whole map (firstVisits/dismissals keys are arbitrary page/
// prompt identifiers, not a closed set, so keys themselves aren't checked).
const timestampMapSchema = z.preprocess((val) => {
  if (!val || typeof val !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
    if (typeof value === "string" && isoDatetime.safeParse(value).success) {
      out[key] = value;
    }
  }
  return out;
}, z.record(z.string(), z.string()));

const nuxChecklistItemSchema = z.object({
  completed: z.boolean(),
  completedAt: timestampSchema,
});

const nuxChecklistKeySet: ReadonlySet<string> = new Set(NUX_CHECKLIST_KEYS);

// Drops unrecognized keys and malformed items instead of rejecting the
// whole checklist -- items is a Partial<Record<NuxChecklistKey, ...>>, so
// z.record(z.enum(...), ...) (which is exhaustive in Zod v4) doesn't fit.
const nuxChecklistItemsSchema = z.preprocess((val) => {
  if (!val || typeof val !== "object") return {};
  const out: Record<string, z.infer<typeof nuxChecklistItemSchema>> = {};
  for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
    if (!nuxChecklistKeySet.has(key)) continue;
    const parsed = nuxChecklistItemSchema.safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out;
}, z.record(z.string(), nuxChecklistItemSchema));

const nuxProgressSchema = z.object({
  version: z.number(),
  checklist: z.object({
    items: nuxChecklistItemsSchema,
    dismissedAt: timestampSchema,
    allCompleteAt: timestampSchema,
  }),
  profileCompletion: z.object({
    completedAt: timestampSchema,
  }),
  firstVisits: timestampMapSchema,
  dismissals: timestampMapSchema,
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

    const token = extractRequestToken(event);
    const supabase = createServerSupabaseUserClient(token);
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
