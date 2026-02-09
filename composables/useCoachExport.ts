/**
 * Coach export composable - handles CSV and PDF exports
 */

import type { Ref, ComputedRef } from "vue";
import type { Coach, School } from "~/types/models";
import {
  exportCoachesToCSV,
  generateCoachesPDF,
  type CoachExportData,
} from "~/utils/exportUtils";
import { getSchoolName } from "~/utils/coachHelpers";

export const useCoachExport = ({
  filteredCoaches,
  schools,
}: {
  filteredCoaches: ComputedRef<Coach[]>;
  schools: Ref<School[]>;
}) => {
  /**
   * Prepare coach data for export with enriched fields
   */
  const getExportData = (): CoachExportData[] => {
    return filteredCoaches.value.map((coach) => ({
      ...coach,
      schoolName: getSchoolName(coach.school_id, schools.value),
    }));
  };

  /**
   * Export filtered coaches to CSV
   */
  const handleExportCSV = () => {
    const data = getExportData();
    if (data.length === 0) return;
    exportCoachesToCSV(data);
  };

  /**
   * Generate printable PDF report of filtered coaches
   */
  const handleExportPDF = () => {
    const data = getExportData();
    if (data.length === 0) return;
    generateCoachesPDF(data);
  };

  return { handleExportCSV, handleExportPDF };
};
