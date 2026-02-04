import { defineEventHandler, createError, type H3Event } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createExportDownloadUrl } from "~/server/utils/exportUser";
import { auditLog, logError } from "~/server/utils/auditLog";
import { logger } from "~/server/utils/logger";

/**
 * POST /api/user/export
 *
 * Generate and return a download link for user's data export (ZIP format)
 *
 * Right to Data Portability (GDPR Article 20, CCPA 1798.100)
 *
 * Request body (optional):
 * {
 *   "includeAuditLogs": boolean (default: true)
 * }
 *
 * Response:
 * {
 *   "downloadUrl": "https://...",
 *   "expiresAt": "2026-01-18T12:00:00Z",
 *   "message": "Download link generated. Link expires in 7 days."
 * }
 */
export default defineEventHandler(async (event) => {
  try {
    // Require authentication
    const user = await requireAuth(event);
    const userId = user.id;
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Rate limit exports (max 1 per user per day)
    const cacheKey = `export_${userId}`;
    const lastExport = await getExportCache(cacheKey);

    if (lastExport) {
      await logError(event, {
        userId,
        action: "EXPORT",
        resourceType: "user",
        errorMessage: "Export rate limit exceeded (1 per day)",
        description: "User attempted to export data more than once per day",
      });

      throw createError({
        statusCode: 429,
        statusMessage: "Too Many Requests",
        data: {
          message:
            "You can only generate one export per day. Please try again tomorrow.",
          retryAfter: 86400, // 24 hours in seconds
        },
      });
    }

    // Log the export request start
    await auditLog(event, {
      userId,
      action: "EXPORT",
      resourceType: "user",
      description: "User initiated data export",
      status: "success",
      metadata: {
        includeAuditLogs: true,
      },
    });

    // Generate export and create download URL
    const expiresIn = 7 * 24 * 60 * 60; // 7 days
    const downloadUrl = await createExportDownloadUrl(userId, expiresIn);

    // Set cache to prevent duplicate exports within 24 hours
    await setExportCache(cacheKey, true, 86400);

    // Log successful export generation
    await auditLog(event, {
      userId,
      action: "EXPORT",
      resourceType: "user",
      description: "Data export generated successfully",
      status: "success",
      metadata: {
        downloadUrlGenerated: true,
        expirationSeconds: expiresIn,
      },
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      success: true,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      expiresIn,
      message: `Download link generated. Your export is ready and will expire on ${expiresAt.toLocaleDateString()}.`,
    };
  } catch (error) {
    const userId = await tryGetUserId(event);

    if (userId) {
      await logError(event, {
        userId,
        action: "EXPORT",
        resourceType: "user",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        description: "Failed to generate user data export",
      });
    }

    logger.error("Error generating user export", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to generate export",
      data: {
        message: "Could not generate your data export. Please try again later.",
      },
    });
  }
});

/**
 * Simple in-memory cache for export rate limiting
 * In production, use Redis or similar
 */
const exportCache = new Map<string, { timestamp: number }>();

async function getExportCache(key: string): Promise<boolean> {
  const cached = exportCache.get(key);
  if (!cached) return false;

  // Check if still within 24 hours
  const now = Date.now();
  const elapsed = (now - cached.timestamp) / 1000; // seconds
  const maxAge = 86400; // 24 hours

  return elapsed < maxAge;
}

async function setExportCache(
  key: string,
  value: boolean,
  ttl: number,
): Promise<void> {
  exportCache.set(key, { timestamp: Date.now() });

  // Auto-cleanup after TTL
  setTimeout(() => {
    exportCache.delete(key);
  }, ttl * 1000);
}

async function tryGetUserId(event: H3Event): Promise<string | null> {
  try {
    const user = await requireAuth(event);
    return user.id;
  } catch {
    return null;
  }
}
