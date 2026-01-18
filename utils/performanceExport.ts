import type { PerformanceMetric } from '~/types/models'

/**
 * Export performance metrics to CSV format
 */
export const exportMetricsToCSV = (metrics: PerformanceMetric[]): string => {
  if (metrics.length === 0) return ''

  const headers = [
    'Date',
    'Metric Type',
    'Value',
    'Unit',
    'Verified',
    'Notes'
  ]

  const rows = metrics
    .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime())
    .map(m => [
      formatDate(m.recorded_date),
      getMetricLabel(m.metric_type),
      m.value.toString(),
      m.unit || '',
      m.verified ? 'Yes' : 'No',
      (m.notes || '').replace(/"/g, '""')
    ])

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Export performance metrics to PDF (using jsPDF)
 */
export const exportMetricsToPDF = async (
  metrics: PerformanceMetric[],
  title: string = 'Performance Metrics Report'
): Promise<Blob> => {
  try {
    // Import jsPDF dynamically to avoid build issues
    const { jsPDF } = await import('jspdf')
    const autoTable = await import('jspdf-autotable')

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Title
    doc.setFontSize(16)
    doc.text(title, pageWidth / 2, 15, { align: 'center' })

    // Date range
    if (metrics.length > 0) {
      const sorted = [...metrics].sort((a, b) =>
        new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
      )
      const startDate = formatDate(sorted[0].recorded_date)
      const endDate = formatDate(sorted[sorted.length - 1].recorded_date)
      doc.setFontSize(10)
      doc.text(`Report Period: ${startDate} to ${endDate}`, pageWidth / 2, 22, { align: 'center' })
    }

    // Calculate statistics
    const values = metrics.map(m => m.value).filter((v): v is number => typeof v === 'number')
    const stats = {
      total: metrics.length,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      maximum: values.length > 0 ? Math.max(...values) : 0,
      minimum: values.length > 0 ? Math.min(...values) : 0
    }

    // Statistics section
    doc.setFontSize(11)
    doc.text('Summary Statistics', 14, 35)
    doc.setFontSize(9)
    doc.text(`Total Metrics: ${stats.total}`, 14, 42)
    doc.text(`Average: ${stats.average.toFixed(1)}`, 14, 48)
    doc.text(`Maximum: ${stats.maximum}`, 14, 54)
    doc.text(`Minimum: ${stats.minimum}`, 14, 60)

    // Table
    const tableData = metrics
      .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime())
      .map(m => [
        formatDate(m.recorded_date),
        getMetricLabel(m.metric_type),
        m.value.toString(),
        m.unit || '',
        m.verified ? 'Yes' : 'No',
        m.notes || ''
      ])

    autoTable.default(doc, {
      head: [['Date', 'Metric Type', 'Value', 'Unit', 'Verified', 'Notes']],
      body: tableData,
      startY: 70,
      margin: { top: 70 },
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    })

    // Footer
    doc.setFontSize(8)
    doc.text(
      `Generated on ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )

    // Return as blob
    const pdf = doc.output('blob')
    return pdf
  } catch (error) {
    console.error('PDF export error:', error)
    throw new Error('Failed to generate PDF')
  }
}


/**
 * Export metrics by category with analytics
 */
export const exportMetricsByCategory = (
  metrics: PerformanceMetric[],
  categories: Record<string, string[]>
): Record<string, string> => {
  const exports: Record<string, string> = {}

  Object.entries(categories).forEach(([category, types]) => {
    const categoryMetrics = metrics.filter(m => types.includes(m.metric_type))
    if (categoryMetrics.length > 0) {
      exports[category] = exportMetricsToCSV(categoryMetrics)
    }
  })

  return exports
}

// Helper functions
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getMetricLabel = (type: string): string => {
  const labels: Record<string, string> = {
    velocity: 'Fastball Velocity',
    exit_velo: 'Exit Velocity',
    sixty_time: '60-Yard Dash',
    pop_time: 'Pop Time',
    batting_avg: 'Batting Average',
    era: 'ERA',
    strikeouts: 'Strikeouts',
    other: 'Other Metric'
  }
  return labels[type] || type
}
