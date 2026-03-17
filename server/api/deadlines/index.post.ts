/**
 * POST /api/deadlines
 * Create a deadline for the authenticated user
 * Body: { label, deadline_date, category, school_id? }
 */

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { useLogger } from "~/server/utils/logger";

const createDeadlineSchema = z.object({
  label: z.string().min(1).max(200),
  deadline_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum([
    "application",
    "decision",
    "financial_aid",
    "visit",
    "custom",
  ]),
  school_id: z.string().uuid().optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "deadlines/create");
  try {
    const user = await requireAuth(event);

    const body = await readBody(event);
    const parsed = createDeadlineSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: "Invalid request body",
      });
    }
    const { label, deadline_date, category, school_id } = parsed.data;

    const supabase = createServerSupabaseClient();

    const { data, error } = await (supabase
      .from("user_deadlines") as any)
      .insert([
        {
          user_id: user.id,
          label,
          deadline_date,
          category,
          school_id: school_id ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Failed to insert deadline", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create deadline",
      });
    }

    return { success: true, deadline: data };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Unexpected error creating deadline", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create deadline",
    });
  }
});
