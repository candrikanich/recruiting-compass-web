import type { PerformanceMetric } from '~/types/models'

/**
 * Download file to browser
 */
export const downloadFile = (content: string | Blob, filename: string, mimeType: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Generate filename with date
 */
export const generateFilename = (reportType: string, format: string): string => {
  const date = new Date().toISOString().split('T')[0]
  const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : format === 'json' ? 'json' : 'txt'
  return `performance-${reportType}-${date}.${ext}`
}

/**
 * Convert metrics to CSV format
 */
export const convertToCSV = (metrics: PerformanceMetric[]): string => {
  const headers = ['Date', 'Metric Type', 'Value', 'Unit', 'Event ID', 'Verified', 'Notes']
  const rows = metrics.map(m => [
    m.recorded_date,
    m.metric_type,
    m.value.toString(),
    m.unit || '',
    m.event_id || '',
    m.verified ? 'Yes' : 'No',
    (m.notes || '').replace(/"/g, '""')
  ])
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

/**
 * Get MIME type for format
 */
export const getMimeType = (format: string): string => {
  switch (format) {
    case 'pdf':
      return 'application/pdf'
    case 'csv':
      return 'text/csv'
    case 'json':
      return 'application/json'
    case 'text':
      return 'text/plain'
    default:
      return 'text/plain'
  }
}
