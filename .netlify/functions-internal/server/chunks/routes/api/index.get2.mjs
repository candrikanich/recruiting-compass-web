import { d as defineEventHandler, b as getQuery } from '../../nitro/nitro.mjs';
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

async function getSurfacedSuggestions(supabase, athleteId, location, schoolId) {
  let query = supabase.from("suggestion").select("*").eq("athlete_id", athleteId).eq("pending_surface", false).eq("dismissed", false).eq("completed", false).order("urgency", { ascending: false }).order("surfaced_at", { ascending: false });
  if (location === "dashboard") {
    query = query.limit(3);
  } else if (location === "school_detail" && schoolId) {
    query = query.eq("related_school_id", schoolId).limit(2);
  }
  const { data, error } = await query;
  return error ? [] : data;
}

const index_get = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const query = getQuery(event);
  const location = query.location || "dashboard";
  const schoolId = query.schoolId;
  const suggestions = await getSurfacedSuggestions(
    supabase,
    user.id,
    location,
    schoolId
  );
  return { suggestions };
});

export { index_get as default };
//# sourceMappingURL=index.get2.mjs.map
