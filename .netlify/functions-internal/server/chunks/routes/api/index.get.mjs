import { d as defineEventHandler, a as createError } from '../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../_/supabase.mjs';
import { r as requireAuth } from '../../_/auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const index_get = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  try {
    const { data, error } = await supabase.from("athlete_task").select("*").eq("athlete_id", user.id).order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase error fetching athlete tasks:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch athlete tasks"
      });
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    console.error("Error in GET /api/athlete-tasks:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch athlete tasks"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
