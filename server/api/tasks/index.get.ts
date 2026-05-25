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
import { useLogger } from "~/server/utils/logger";
import { getCached } from "~/server/utils/cache";
import type { Task } from "~/types/timeline";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "tasks");
  try {
    await requireAuth(event);

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

    // Generate cache key based on filters + pagination window
    const cacheKey = `tasks:${gradeLevel || "all"}:${category || "all"}:${division || "all"}:${limit}:${offset}`;

    // Try to get from cache first
    const cached = getCached<Task[]>(cacheKey);
    if (cached) {
      logger.debug("Tasks served from cache", { cacheKey });
      return cached;
    }
    logger.debug("Tasks cache miss", { cacheKey });

    let request = supabase
      .from("task")
      .select(
        "id, category, grade_level, title, description, required, dependency_task_ids, why_it_matters, failure_risk, division_applicability, created_at, updated_at",
      );

    // Apply filters
    if (gradeLevel) {
      request = request.eq("grade_level", gradeLevel);
    }
    if (category) {
      request = request.eq("category", category);
    }
    if (division) {
      request = request.contains("division_applicability", [division]);
    }

    // Order by grade level and category, then bound the result window
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

    const tasks = data as Task[];

    // Cache for 1 hour (3600 seconds) - tasks rarely change
    if (tasks) {
      const { setCached } = await import("~/server/utils/cache");
      setCached(cacheKey, tasks, 3600);
    }

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
