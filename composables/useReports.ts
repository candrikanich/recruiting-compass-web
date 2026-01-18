import { ref } from 'vue'
import { useSchools } from './useSchools'
import { useCoaches } from './useCoaches'
import { useInteractions } from './useInteractions'
import { usePerformance } from './usePerformance'
import { generateReportData, exportReportToCSV, downloadReport, type ReportData } from '~/utils/reportExport'

export const useReports = () => {
  const { schools } = useSchools()
  const { coaches } = useCoaches()
  const { interactions } = useInteractions()
  const { metrics } = usePerformance()

  const currentReport = ref<ReportData | null>(null)
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  const generateReport = async (from: string, to: string) => {
    isGenerating.value = true
    error.value = null

    try {
      currentReport.value = generateReportData(
        schools.value,
        coaches.value,
        interactions.value,
        metrics.value,
        from,
        to
      )
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to generate report'
      console.error('Generate report error:', err)
    } finally {
      isGenerating.value = false
    }
  }

  const exportToCSV = (filename = 'recruiting-report.csv') => {
    if (!currentReport.value) {
      error.value = 'No report to export'
      return
    }

    try {
      const csv = exportReportToCSV(currentReport.value)
      downloadReport(filename, csv)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to export report'
      console.error('Export report error:', err)
    }
  }

  const clearReport = () => {
    currentReport.value = null
    error.value = null
  }

  return {
    currentReport,
    isGenerating,
    error,
    generateReport,
    exportToCSV,
    clearReport,
  }
}
