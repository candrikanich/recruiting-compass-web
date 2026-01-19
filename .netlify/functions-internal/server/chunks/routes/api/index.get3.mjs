import { d as defineEventHandler, b as getQuery, a as createError } from '../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../_/supabase.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const cache = /* @__PURE__ */ new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function setCached(key, data, ttlSeconds = 3600) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1e3
  });
}

const cache$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  getCached: getCached,
  setCached: setCached
}, Symbol.toStringTag, { value: 'Module' }));

const index_get = defineEventHandler(async (event) => {
  const supabase = createServerSupabaseClient();
  try {
    const query = getQuery(event);
    const gradeLevel = query.gradeLevel ? parseInt(query.gradeLevel) : void 0;
    const category = query.category;
    const division = query.division;
    const cacheKey = `tasks:${gradeLevel || "all"}:${category || "all"}:${division || "all"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
    let request = supabase.from("task").select("*");
    if (gradeLevel) {
      request = request.eq("grade_level", gradeLevel);
    }
    if (category) {
      request = request.eq("category", category);
    }
    if (division) {
      request = request.contains("division_applicability", [division]);
    }
    request = request.order("grade_level", { ascending: true }).order("category", { ascending: true });
    const { data, error } = await request;
    if (error) {
      console.error("Supabase error fetching tasks:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch tasks"
      });
    }
    const tasks = data;
    if (tasks) {
      const { setCached } = await Promise.resolve().then(function () { return cache$1; });
      setCached(cacheKey, tasks, 3600);
    }
    return tasks;
  } catch (err) {
    console.error("Error in GET /api/tasks:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch tasks"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get3.mjs.map
