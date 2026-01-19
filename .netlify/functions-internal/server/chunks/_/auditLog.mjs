import { e as getHeader, l as logger } from '../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from './supabase.mjs';

async function auditLog(event, params) {
  try {
    const supabase = createServerSupabaseClient();
    const ipAddress = getClientIP(event);
    const userAgent = getHeader(event, "user-agent") || "Unknown";
    const { error } = await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      table_name: params.tableName || null,
      description: params.description || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: params.status || "success",
      error_message: params.errorMessage || null,
      metadata: params.metadata || {}
    });
    if (error) {
      logger.error("Failed to create audit log", {
        error: error.message,
        params
      });
    }
  } catch (err) {
    logger.error("Error writing audit log", {
      error: err instanceof Error ? err.message : "Unknown error"
    });
  }
}
function getClientIP(event) {
  const forwarded = getHeader(event, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const remoteAddress = event.node.req.socket.remoteAddress;
  return remoteAddress || "Unknown";
}
function sanitizeForAuditLog(data) {
  const sensitiveFields = [
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret",
    "credit_card",
    "ssn",
    "social_security_number"
  ];
  const sanitized = { ...data };
  sensitiveFields.forEach((field) => {
    const regex = new RegExp(`^${field}$`, "i");
    Object.keys(sanitized).forEach((key) => {
      if (regex.test(key)) {
        sanitized[key] = "[REDACTED]";
      }
    });
  });
  return sanitized;
}
async function logCRUD(event, params) {
  const sanitized = {
    oldValues: params.oldValues ? sanitizeForAuditLog(params.oldValues) : void 0,
    newValues: params.newValues ? sanitizeForAuditLog(params.newValues) : void 0
  };
  return auditLog(event, {
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    tableName: params.resourceType,
    // Convention: table name = plural resource type
    description: params.description,
    oldValues: sanitized.oldValues,
    newValues: sanitized.newValues,
    status: "success"
  });
}
async function logError(event, params) {
  return auditLog(event, {
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    description: params.description,
    errorMessage: params.errorMessage,
    status: "failure",
    metadata: params.metadata
  });
}

export { logCRUD as a, auditLog as b, logError as l };
//# sourceMappingURL=auditLog.mjs.map
