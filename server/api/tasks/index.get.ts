/**
 * GET /api/tasks
 * Fetch tasks with optional filters and pagination.
 * Query: gradeLevel, category, division, limit (default 100, max 200), offset (default 0)
 * Performance: Cached for 1 hour (tasks rarely change)
 * Cache hit: Saves ~200-300ms database round trip
 */

import { defineEventHandler, getQuery } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { resolveTargetAthleteId } from "~/server/utils/athleteAccess";
import { computeTaskDeadline } from "~/server/utils/taskDeadlines";
import { useLogger } from "~/server/utils/logger";
import { getCached } from "~/server/utils/cache";
import type { Task } from "~/types/timeline";

type TaskTemplate = Omit<Task, "deadline_date"> & {
  deadline_offset_months: number | null;
};

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "tasks");
  try {
    const user = await requireAuth(event);

    const supabase = createServerSupabaseClient();

    const query = getQuery(event);
    const gradeLevel = query.gradeLevel
      ? parseInt(query.gradeLevel as string)
      : undefined;
    const category = query.category as string | undefined;
    const division = query.division as string | undefined;
    const limit = Math.min(
      parseInt(String(query.limit ?? "100"), 10) || 100,
      200,
    );
    const offset = Math.max(parseInt(String(query.offset ?? "0"), 10) || 0, 0);

    // Resolve whose deadlines to compute. Defaults to the caller; a parent may
    // pass ?athleteId to view a linked athlete — authorized by shared family unit.
    const athleteId = await resolveTargetAthleteId(
      event,
      user.id,
      query.athleteId as string | undefined,
    );

    // Templates are shared across athletes, so cache them without deadlines and
    // apply the per-athlete deadline after retrieval (never mutate the cache).
    const cacheKey = `tasks:${gradeLevel || "all"}:${category || "all"}:${division || "all"}:${limit}:${offset}`;

    let templates = getCached<TaskTemplate[]>(cacheKey);
    if (templates) {
      logger.debug("Tasks served from cache", { cacheKey });
    } else {
      logger.debug("Tasks cache miss", { cacheKey });

      let request = supabase
        .from("task")
        .select(
          "id, category, grade_level, title, description, required, dependency_task_ids, why_it_matters, failure_risk, division_applicability, deadline_offset_months, created_at, updated_at",
        );

      if (gradeLevel) {
        request = request.eq("grade_level", gradeLevel);
      }
      if (category) {
        request = request.eq("category", category);
      }
      if (division) {
        request = request.contains("division_applicability", [division]);
      }

      request = request
        .order("grade_level", { ascending: true })
        .order("category", { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error } = await request;

      if (error) {
        logger.error("Supabase error fetching tasks", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch tasks",
        });
      }

      templates = (data ?? []) as TaskTemplate[];

      const { setCached } = await import("~/server/utils/cache");
      setCached(cacheKey, templates, 3600);
    }

    // Look up the target athlete's graduation year and compute each task's
    // deadline. New objects only — the cached templates stay deadline-free.
    const { data: athlete } = await supabase
      .from("users")
      .select("graduation_year")
      .eq("id", athleteId)
      .maybeSingle();
    const graduationYear =
      (athlete as { graduation_year: number | null } | null)?.graduation_year ??
      null;

    const tasks: Task[] = templates.map((t) => {
      const { deadline_offset_months, ...rest } = t;
      return {
        ...rest,
        deadline_date: computeTaskDeadline(
          graduationYear,
          deadline_offset_months,
        ),
      } as Task;
    });

    return tasks;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Error fetching tasks", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch tasks",
    });
  }
});
