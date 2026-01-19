import { l as logger, d as defineEventHandler, a as createError } from '../../../nitro/nitro.mjs';
import { r as requireAuth } from '../../../_/auth.mjs';
import JSZip from 'jszip';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { l as logError, b as auditLog } from '../../../_/auditLog.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

async function gatherUserData(userId) {
  const supabase = createServerSupabaseClient();
  try {
    const [
      profileRes,
      schoolsRes,
      coachesRes,
      interactionsRes,
      eventsRes,
      documentsRes,
      metricsRes,
      offersRes,
      auditRes
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("schools").select("*").eq("user_id", userId),
      supabase.from("coaches").select("*").eq("user_id", userId),
      supabase.from("interactions").select("*").eq("user_id", userId),
      supabase.from("events").select("*").eq("user_id", userId),
      supabase.from("documents").select("*").eq("user_id", userId),
      supabase.from("performance_metrics").select("*").eq("user_id", userId),
      supabase.from("offers").select("*").eq("user_id", userId),
      supabase.from("audit_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1e3)
      // Limit audit logs to 1000 recent entries
    ]);
    return {
      profile: profileRes.data || {},
      schools: schoolsRes.data || [],
      coaches: coachesRes.data || [],
      interactions: interactionsRes.data || [],
      events: eventsRes.data || [],
      documents: await fetchDocumentContent(supabase, documentsRes.data || [], userId),
      performanceMetrics: metricsRes.data || [],
      offers: offersRes.data || [],
      auditLogs: auditRes.data || []
    };
  } catch (error) {
    logger.error("Error gathering user data for export", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}
async function fetchDocumentContent(supabase, documents, userId) {
  const result = [];
  for (const doc of documents) {
    try {
      const docMetadata = {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        school_id: doc.school_id
      };
      if (doc.storage_path) {
        try {
          const { data, error } = await supabase.storage.from("documents").download(`${userId}/${doc.storage_path}`);
          if (!error && data) {
            result.push({
              metadata: docMetadata,
              content: Buffer.from(await data.arrayBuffer())
            });
          } else {
            result.push({ metadata: docMetadata });
          }
        } catch (_err) {
          result.push({ metadata: docMetadata });
        }
      } else {
        result.push({ metadata: docMetadata });
      }
    } catch (error) {
      logger.warn("Failed to fetch document content", {
        documentId: doc.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  return result;
}
async function generateUserExportZip(userId) {
  try {
    const data = await gatherUserData(userId);
    const zip = new JSZip();
    zip.file(
      "README.txt",
      generateReadme(userId)
    );
    if (Object.keys(data.profile).length > 0) {
      zip.file("profile.json", JSON.stringify(data.profile, null, 2));
    }
    if (data.schools.length > 0) {
      zip.file("schools.csv", jsonToCSV(data.schools));
    }
    if (data.coaches.length > 0) {
      zip.file("coaches.csv", jsonToCSV(data.coaches));
    }
    if (data.interactions.length > 0) {
      zip.file("interactions.csv", jsonToCSV(data.interactions));
    }
    if (data.events.length > 0) {
      zip.file("events.csv", jsonToCSV(data.events));
    }
    if (data.performanceMetrics.length > 0) {
      zip.file("performance_metrics.csv", jsonToCSV(data.performanceMetrics));
    }
    if (data.offers.length > 0) {
      zip.file("offers.csv", jsonToCSV(data.offers));
    }
    if (data.auditLogs.length > 0) {
      zip.file("audit_logs.json", JSON.stringify(data.auditLogs, null, 2));
    }
    if (data.documents.length > 0) {
      const docsFolder = zip.folder("documents");
      if (docsFolder) {
        data.documents.forEach((doc, index) => {
          const fileName = `${doc.metadata.name || `document_${index}`}`;
          docsFolder.file(`${fileName}.json`, JSON.stringify(doc.metadata, null, 2));
          if (doc.content) {
            docsFolder.file(`${fileName}.bin`, doc.content);
          }
        });
      }
    }
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    return Buffer.from(zipBuffer);
  } catch (error) {
    logger.error("Error generating user export ZIP", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}
function jsonToCSV(data) {
  if (data.length === 0) return "";
  const keys = Array.from(
    new Set(data.flatMap((obj) => Object.keys(obj)))
  );
  const header = keys.map((k) => `"${k}"`).join(",");
  const rows = data.map(
    (obj) => keys.map((key) => {
      const value = obj[key];
      if (value === null || value === void 0) {
        return "";
      }
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}
function generateReadme(userId) {
  return `# College Baseball Recruiting Tracker - Data Export

Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
User ID: ${userId}

## Contents

This archive contains a complete export of your data from the College Baseball Recruiting Tracker.

### Files Included

1. **profile.json**
   - Your account profile information
   - Includes name, email, role, preferences

2. **schools.csv**
   - All schools you've added to your tracking
   - Columns: id, name, location, contact info, created_at, updated_at

3. **coaches.csv**
   - All coaches you've recorded
   - Columns: id, name, school, email, phone, contact info

4. **interactions.csv**
   - All coaching interactions (calls, emails, visits)
   - Columns: id, coach_id, date, type, notes, sentiment

5. **events.csv**
   - All athletic events you've tracked
   - Columns: id, school, event_type, date, location, performance notes

6. **performance_metrics.csv**
   - Your recorded athletic performance data
   - Columns: id, date, metric_type, value, notes

7. **offers.csv**
   - All scholarship offers received
   - Columns: id, school, offer_date, offer_details

8. **audit_logs.json**
   - Log of recent account activity for security purposes
   - Includes login history and data modifications (last 1000 entries)

9. **documents/** (folder)
   - All uploaded documents (PDFs, resumes, highlight reels, etc.)
   - Includes metadata and original files

## Data Format

- **CSV Files**: Comma-separated values, suitable for import into Excel or other spreadsheet software
- **JSON Files**: JavaScript Object Notation, suitable for programmatic import
- **Binary Files**: Original document formats

## Importing Data

To import this data into another application:

1. Extract the ZIP archive
2. Use CSV files for spreadsheet applications
3. Use JSON files for programmatic import
4. Store documents in your preferred cloud storage

## Privacy & Security

- This export contains your personal data
- Store it securely
- Do not share with untrusted parties
- Delete after you've verified contents

## Support

For questions about this export, contact: privacy@baseballrecruitingtracker.local

---

This export was generated in compliance with GDPR Article 20 (Right to Data Portability)
and CCPA rights to data access.
`;
}
async function createExportDownloadUrl(userId, expiresIn = 7 * 24 * 60 * 60) {
  try {
    const zipBuffer = await generateUserExportZip(userId);
    const fileName = `export_${userId}_${Date.now()}.zip`;
    const supabase = createServerSupabaseClient();
    const { error: uploadError } = await supabase.storage.from("exports").upload(fileName, zipBuffer, {
      contentType: "application/zip"
    });
    if (uploadError) {
      throw uploadError;
    }
    const { data: signedUrl } = await supabase.storage.from("exports").createSignedUrl(fileName, expiresIn);
    if (!(signedUrl == null ? void 0 : signedUrl.signedUrl)) {
      throw new Error("Failed to create signed URL");
    }
    return signedUrl.signedUrl;
  } catch (error) {
    logger.error("Error creating export download URL", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}

const export_post = defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const userId = user.id;
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    const cacheKey = `export_${userId}`;
    const lastExport = await getExportCache(cacheKey);
    if (lastExport) {
      await logError(event, {
        userId,
        action: "EXPORT",
        resourceType: "user",
        errorMessage: "Export rate limit exceeded (1 per day)",
        description: "User attempted to export data more than once per day"
      });
      throw createError({
        statusCode: 429,
        statusMessage: "Too Many Requests",
        data: {
          message: "You can only generate one export per day. Please try again tomorrow.",
          retryAfter: 86400
          // 24 hours in seconds
        }
      });
    }
    await auditLog(event, {
      userId,
      action: "EXPORT",
      resourceType: "user",
      description: "User initiated data export",
      status: "success",
      metadata: {
        includeAuditLogs: true
      }
    });
    const expiresIn = 7 * 24 * 60 * 60;
    const downloadUrl = await createExportDownloadUrl(userId, expiresIn);
    await setExportCache(cacheKey, true, 86400);
    await auditLog(event, {
      userId,
      action: "EXPORT",
      resourceType: "user",
      description: "Data export generated successfully",
      status: "success",
      metadata: {
        downloadUrlGenerated: true,
        expirationSeconds: expiresIn
      }
    });
    const expiresAt = new Date(Date.now() + expiresIn * 1e3);
    return {
      success: true,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      expiresIn,
      message: `Download link generated. Your export is ready and will expire on ${expiresAt.toLocaleDateString()}.`
    };
  } catch (error) {
    const userId = await tryGetUserId(event);
    if (userId) {
      await logError(event, {
        userId,
        action: "EXPORT",
        resourceType: "user",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        description: "Failed to generate user data export"
      });
    }
    logger.error("Error generating user export", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : void 0
    });
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized"
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to generate export",
      data: {
        message: "Could not generate your data export. Please try again later."
      }
    });
  }
});
const exportCache = /* @__PURE__ */ new Map();
async function getExportCache(key) {
  const cached = exportCache.get(key);
  if (!cached) return false;
  const now = Date.now();
  const elapsed = (now - cached.timestamp) / 1e3;
  const maxAge = 86400;
  return elapsed < maxAge;
}
async function setExportCache(key, value, ttl) {
  exportCache.set(key, { timestamp: Date.now() });
  setTimeout(() => {
    exportCache.delete(key);
  }, ttl * 1e3);
}
async function tryGetUserId(event) {
  try {
    const user = await requireAuth(event);
    return user.id;
  } catch {
    return null;
  }
}

export { export_post as default };
//# sourceMappingURL=export.post.mjs.map
