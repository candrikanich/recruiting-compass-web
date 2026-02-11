/**
 * Admin endpoint to migrate school student_size from string to number
 * Converts any string student_size values to numeric values
 */

import { useSupabaseAdmin } from "~/server/utils/supabase";
import type { Database } from "~/types/database";

type School = Database["public"]["Tables"]["schools"]["Row"];

interface MigrationResult {
  success: boolean;
  totalSchools: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ schoolId: string; error: string }>;
}

export default defineEventHandler(async (): Promise<MigrationResult> => {
  const supabase = useSupabaseAdmin();

  const result: MigrationResult = {
    success: false,
    totalSchools: 0,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
  };

  try {
    // Fetch all schools
    const { data: schools, error: fetchError } = await supabase
      .from("schools")
      .select("id, academic_info");

    if (fetchError) {
      throw new Error(`Failed to fetch schools: ${fetchError.message}`);
    }

    if (!schools || schools.length === 0) {
      result.success = true;
      return result;
    }

    result.totalSchools = schools.length;

    // Process each school
    for (const school of schools) {
      try {
        const academicInfo = school.academic_info as any;

        // Skip if no academic_info
        if (!academicInfo) {
          result.skippedCount++;
          continue;
        }

        const studentSize = academicInfo.student_size;

        // Skip if already a number or null/undefined
        if (
          typeof studentSize === "number" ||
          studentSize === null ||
          studentSize === undefined
        ) {
          result.skippedCount++;
          continue;
        }

        // Convert string to number
        let numericSize: number | null = null;

        if (typeof studentSize === "string") {
          // Try to parse the string
          const parsed = parseInt(studentSize.replace(/,/g, ""), 10);
          if (!isNaN(parsed) && parsed > 0) {
            numericSize = parsed;
          }
        }

        // Update the school with numeric value
        const updatedAcademicInfo = {
          ...academicInfo,
          student_size: numericSize,
        };

        const { error: updateError } = await supabase
          .from("schools")
          .update({ academic_info: updatedAcademicInfo })
          .eq("id", school.id);

        if (updateError) {
          result.errorCount++;
          result.errors.push({
            schoolId: school.id,
            error: updateError.message,
          });
        } else {
          result.migratedCount++;
        }
      } catch (err) {
        result.errorCount++;
        result.errors.push({
          schoolId: school.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    result.success = result.errorCount === 0;

    return result;
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "Migration failed",
    });
  }
});
