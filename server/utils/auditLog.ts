import type { H3Event } from "h3";

import { logger } from "./logger";
import { createServerSupabaseClient } from "./supabase";
import type { AuditLogInsert } from "~/types/database-helpers";

interface AuditLogParams {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  tableName?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  status?: "success" | "failure";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry for compliance and security auditing
 *
 * Usage:
 * ```ts
 * await auditLog(event, {
 *   userId: user.id,
 *   action: 'CREATE',
 *   resourceType: 'schools',
 *   resourceId: school.id,
 *   tableName: 'schools',
 *   description: 'Created new school',
 *   newValues: school,
 *   status: 'success',
 * })
 * ```
 */
export async function auditLog(
  event: H3Event,
  params: AuditLogParams,
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();

    // Type assertion for Supabase operations without proper types
    const supabaseAny = supabase as unknown;

    // Extract client info from request
    const ipAddress = getClientIP(event);
    const userAgent = getHeader(event, "user-agent") || "Unknown";

    // Create audit log entry
    // Create audit log entry
    const auditEntry: AuditLogInsert = {
      user_id: params.userId,
      action: params.action as
        | "CREATE"
        | "READ"
        | "UPDATE"
        | "DELETE"
        | "LOGIN"
        | "LOGOUT"
        | "EXPORT"
        | "IMPORT",
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
      metadata: params.metadata || undefined,
    };

    const { error } = await (supabaseAny as any)
      .from("audit_logs")
      .insert(auditEntry);

    if (error) {
      logger.error("Failed to create audit log", {
        error: error.message,
        params,
      });
    }
  } catch (err) {
    logger.error("Error writing audit log", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    // Don't throw - audit log failures shouldn't break main functionality
  }
}

/**
 * Batch create multiple audit logs for bulk operations
 */
export async function auditLogBatch(
  event: H3Event,
  params: AuditLogParams[],
): Promise<void> {
  try {
    if (params.length === 0) return;

    const supabase = createServerSupabaseClient();

    // Type assertion for Supabase operations without proper types
    const supabaseAny = supabase as unknown;

    const ipAddress = getClientIP(event);
    const userAgent = getHeader(event, "user-agent") || "Unknown";

    const entries = params.map((p) => ({
      user_id: p.userId,
      action: p.action,
      resource_type: p.resourceType,
      resource_id: p.resourceId || null,
      table_name: p.tableName || null,
      description: p.description || null,
      old_values: p.oldValues || null,
      new_values: p.newValues || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: p.status || "success",
      error_message: p.errorMessage || null,
      metadata: p.metadata || {},
    })) as AuditLogInsert[];

    const { error } = await (supabaseAny as any)
      .from("audit_logs")
      .insert(entries);

    if (error) {
      logger.error("Failed to batch create audit logs", {
        error: error.message,
        count: params.length,
      });
    }
  } catch (err) {
    logger.error("Error writing batch audit logs", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * Get client IP address from request
 * Handles X-Forwarded-For header for proxied requests
 */
function getClientIP(event: H3Event): string {
  // Check X-Forwarded-For header (for proxied requests)
  const forwarded = getHeader(event, "x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first
    return (forwarded as string).split(",")[0].trim();
  }

  // Fallback to remote address
  const remoteAddress = event.node.req.socket.remoteAddress;
  return remoteAddress || "Unknown";
}

/**
 * Sanitize sensitive data before logging
 * Removes passwords, tokens, and other sensitive fields
 */
export function sanitizeForAuditLog(
  data: Record<string, unknown>,
): Record<string, unknown> {
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
    "social_security_number",
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

/**
 * Create audit log for successful CRUD operation
 * Convenience wrapper with sensible defaults
 */
export async function logCRUD(
  event: H3Event,
  params: {
    userId: string;
    action: "CREATE" | "READ" | "UPDATE" | "DELETE";
    resourceType: string;
    resourceId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    description?: string;
  },
): Promise<void> {
  const sanitized = {
    oldValues: params.oldValues
      ? sanitizeForAuditLog(params.oldValues)
      : undefined,
    newValues: params.newValues
      ? sanitizeForAuditLog(params.newValues)
      : undefined,
  };

  return auditLog(event, {
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    tableName: params.resourceType, // Convention: table name = plural resource type
    description: params.description,
    oldValues: sanitized.oldValues,
    newValues: sanitized.newValues,
    status: "success",
  });
}

/**
 * Create audit log for failed operation
 * Convenience wrapper for error cases
 */
export async function logError(
  event: H3Event,
  params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    errorMessage: string;
    description?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  return auditLog(event, {
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    description: params.description,
    errorMessage: params.errorMessage,
    status: "failure",
    metadata: params.metadata,
  });
}

/**
 * Query audit logs for user
 * Returns user's own audit history
 */
export async function getUserAuditLogs(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<unknown[]> {
  try {
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1,
      );
    }

    if (options.action) {
      query = query.eq("action", options.action);
    }

    if (options.startDate) {
      query = query.gte("created_at", options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte("created_at", options.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Failed to retrieve audit logs", {
        error: error.message,
      });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error("Error retrieving audit logs", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return [];
  }
}

/**
 * Schedule cleanup of expired audit logs
 * Call this during app startup or via cron job
 */
export async function scheduleAuditLogCleanup(): Promise<void> {
  try {
    // Schedule cleanup to run daily at 2 AM
    // This is just logging the instruction - actual scheduling happens in deployment config
    logger.info("Audit log cleanup scheduled for daily execution at 2 AM");

    // For testing/immediate cleanup:
    // const { data, error } = await supabase.rpc('delete_expired_audit_logs')
    // if (error) logger.error('Cleanup failed', { error: error.message })
  } catch (err) {
    logger.error("Failed to schedule audit log cleanup", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
