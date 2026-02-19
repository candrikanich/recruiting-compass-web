/**
 * GET /api/tasks
 * Fetch all tasks with optional filters
 * Performance: Cached for 1 hour (tasks rarely change)
 * Cache hit: Saves ~200-300ms database round trip
 */

import { defineEventHandler, getQuery } from "h3";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { getCached } from "~/server/utils/cache";
import type { Task } from "~/types/timeline";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "tasks");
  try {
    const supabase = createServerSupabaseClient();

    const query = getQuery(event);
    const gradeLevel = query.gradeLevel
      ? parseInt(query.gradeLevel as string)
      : undefined;
    const category = query.category as string | undefined;
    const division = query.division as string | undefined;

    // Generate cache key based on filters
    const cacheKey = `tasks:${gradeLevel || "all"}:${category || "all"}:${division || "all"}`;

    // Try to get from cache first
    const cached = getCached<Task[]>(cacheKey);
    if (cached) {
      return cached;
    }

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

    // Order by grade level and category
    request = request
      .order("grade_level", { ascending: true })
      .order("category", { ascending: true });

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
