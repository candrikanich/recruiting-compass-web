import JSZip from "jszip";

import { logger } from "./logger";
import { createServerSupabaseClient } from "./supabase";

interface ExportData {
  profile: Record<string, any>;
  schools: Record<string, any>[];
  coaches: Record<string, any>[];
  interactions: Record<string, any>[];
  events: Record<string, any>[];
  documents: Array<{
    metadata: Record<string, any>;
    content?: Buffer;
  }>;
  performanceMetrics: Record<string, any>[];
  offers: Record<string, any>[];
  auditLogs: Record<string, any>[];
}

/**
 * Gather all user data for export
 * Includes all user-generated content and associated metadata
 */
export async function gatherUserData(userId: string): Promise<ExportData> {
  const supabase = createServerSupabaseClient();

  try {
    // Fetch all user data in parallel
    const [
      profileRes,
      schoolsRes,
      coachesRes,
      interactionsRes,
      eventsRes,
      documentsRes,
      metricsRes,
      offersRes,
      auditRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("schools").select("*").eq("user_id", userId),
      supabase.from("coaches").select("*").eq("user_id", userId),
      supabase.from("interactions").select("*").eq("user_id", userId),
      supabase.from("events").select("*").eq("user_id", userId),
      supabase.from("documents").select("*").eq("user_id", userId),
      supabase.from("performance_metrics").select("*").eq("user_id", userId),
      supabase.from("offers").select("*").eq("user_id", userId),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000), // Limit audit logs to 1000 recent entries
    ]);

    return {
      profile: profileRes.data || {},
      schools: schoolsRes.data || [],
      coaches: coachesRes.data || [],
      interactions: interactionsRes.data || [],
      events: eventsRes.data || [],
      documents: await fetchDocumentContent(
        supabase,
        documentsRes.data || [],
        userId,
      ),
      performanceMetrics: metricsRes.data || [],
      offers: offersRes.data || [],
      auditLogs: auditRes.data || [],
    };
  } catch (error) {
    logger.error("Error gathering user data for export", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Fetch document content from storage
 */
async function fetchDocumentContent(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  documents: any[],
  userId: string,
): Promise<Array<{ metadata: Record<string, any>; content?: Buffer }>> {
  const result: Array<{ metadata: Record<string, any>; content?: Buffer }> = [];

  for (const doc of documents) {
    try {
      // Get document metadata
      const docMetadata = {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        school_id: doc.school_id,
      };

      // Try to fetch file content from storage
      if (doc.storage_path) {
        try {
          const { data, error } = await supabase.storage
            .from("documents")
            .download(`${userId}/${doc.storage_path}`);

          if (!error && data) {
            result.push({
              metadata: docMetadata,
              content: Buffer.from(await data.arrayBuffer()),
            });
          } else {
            // File not found, just save metadata
            result.push({ metadata: docMetadata });
          }
        } catch (_err) {
          // Fallback if download fails
          result.push({ metadata: docMetadata });
        }
      } else {
        result.push({ metadata: docMetadata });
      }
    } catch (error) {
      logger.warn("Failed to fetch document content", {
        documentId: doc.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Continue with next document
    }
  }

  return result;
}

/**
 * Generate ZIP file containing all user data
 */
export async function generateUserExportZip(userId: string): Promise<Buffer> {
  try {
    const data = await gatherUserData(userId);
    const zip = new JSZip();

    // Add README with data dictionary
    zip.file("README.txt", generateReadme(userId));

    // Add profile as JSON
    if (Object.keys(data.profile).length > 0) {
      zip.file("profile.json", JSON.stringify(data.profile, null, 2));
    }

    // Add each data type as CSV for easy import
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

    // Add audit logs
    if (data.auditLogs.length > 0) {
      zip.file("audit_logs.json", JSON.stringify(data.auditLogs, null, 2));
    }

    // Add documents folder
    if (data.documents.length > 0) {
      const docsFolder = zip.folder("documents");
      if (docsFolder) {
        data.documents.forEach((doc, index) => {
          const fileName = `${doc.metadata.name || `document_${index}`}`;
          docsFolder.file(
            `${fileName}.json`,
            JSON.stringify(doc.metadata, null, 2),
          );

          if (doc.content) {
            docsFolder.file(`${fileName}.bin`, doc.content);
          }
        });
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    return Buffer.from(zipBuffer);
  } catch (error) {
    logger.error("Error generating user export ZIP", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Convert JSON array to CSV format
 */
function jsonToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return "";

  // Get all unique keys from all objects
  const keys = Array.from(new Set(data.flatMap((obj) => Object.keys(obj))));

  // Create header row
  const header = keys.map((k) => `"${k}"`).join(",");

  // Create data rows
  const rows = data.map((obj) =>
    keys
      .map((key) => {
        const value = obj[key];
        if (value === null || value === undefined) {
          return "";
        }
        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(","),
  );

  return [header, ...rows].join("\n");
}

/**
 * Generate README with data dictionary
 */
function generateReadme(userId: string): string {
  return `# College Baseball Recruiting Tracker - Data Export

Generated: ${new Date().toISOString()}
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

/**
 * Send export file to user via email
 */
export async function sendExportViaEmail(
  userId: string,
  userEmail: string,
): Promise<void> {
  try {
    const zipBuffer = await generateUserExportZip(userId);
    const fileName = `baseball-recruiting-tracker-export-${new Date().toISOString().split("T")[0]}.zip`;

    // Convert buffer to base64 for email
    const base64Content = zipBuffer.toString("base64");

    // Send email with attachment via Resend or email service
    // This is a placeholder - actual implementation depends on email service
    logger.info("User export ready for download", {
      userId,
      fileName,
      size: zipBuffer.length,
    });

    // Actual implementation would call email service:
    // await sendEmailWithAttachment({
    //   to: userEmail,
    //   subject: 'Your Baseball Recruiting Tracker Data Export',
    //   html: getExportEmailTemplate(fileName),
    //   attachments: [{
    //     filename: fileName,
    //     content: zipBuffer,
    //   }]
    // })
  } catch (error) {
    logger.error("Error sending export via email", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Create temporary signed URL for direct download
 */
export async function createExportDownloadUrl(
  userId: string,
  expiresIn: number = 7 * 24 * 60 * 60, // 7 days
): Promise<string> {
  try {
    // Generate ZIP and upload to temporary storage
    const zipBuffer = await generateUserExportZip(userId);
    const fileName = `export_${userId}_${Date.now()}.zip`;

    const supabase = createServerSupabaseClient();

    // Upload to exports bucket
    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(fileName, zipBuffer, {
        contentType: "application/zip",
      });

    if (uploadError) {
      throw uploadError;
    }

    // Create signed URL
    const { data: signedUrl } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, expiresIn);

    if (!signedUrl?.signedUrl) {
      throw new Error("Failed to create signed URL");
    }

    return signedUrl.signedUrl;
  } catch (error) {
    logger.error("Error creating export download URL", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
