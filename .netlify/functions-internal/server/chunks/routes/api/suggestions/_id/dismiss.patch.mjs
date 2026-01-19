import { d as defineEventHandler, g as getRouterParam, a as createError } from '../../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../../_/supabase.mjs';
import { r as requireAuth } from '../../../../_/auth.mjs';
import { l as logError, a as logCRUD } from '../../../../_/auditLog.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const dismiss_patch = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  const suggestionId = getRouterParam(event, "id");
  if (!suggestionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Suggestion ID is required"
    });
  }
  const updateData = {
    dismissed: true,
    dismissed_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { error } = await supabase.from("suggestion").update(updateData).eq("id", suggestionId).eq("athlete_id", user.id);
  if (error) {
    await logError(event, {
      userId: user.id,
      action: "UPDATE",
      resourceType: "suggestions",
      resourceId: suggestionId,
      errorMessage: error.message,
      description: "Failed to dismiss suggestion"
    });
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to dismiss suggestion"
    });
  }
  await logCRUD(event, {
    userId: user.id,
    action: "UPDATE",
    resourceType: "suggestions",
    resourceId: suggestionId,
    newValues: updateData,
    description: "Dismissed suggestion"
  });
  return { success: true };
});

export { dismiss_patch as default };
//# sourceMappingURL=dismiss.patch.mjs.map
