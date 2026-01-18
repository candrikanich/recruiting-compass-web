import { ref, computed } from 'vue'
import type { Performance } from '~/types/models'

/**
 * usePerformanceAnalytics composable
 * Analyzes performance metrics and provides analytics for player progress tracking
 *
 * Features:
 * - Calculate trending (improving/declining performance)
 * - Compare metrics across time periods (weekly, monthly, yearly)
 * - Calculate personal records and improvements
 * - Project future performance based on trends
 * - Identify anomalies in metrics
 */
export const usePerformanceAnalytics = () => {
  /**
   * Calculate average for a metric across all performances
   */
  const calculateAverage = (performances: Performance[], metric: keyof Performance): number => {
    if (performances.length === 0) return 0
    const sum = performances.reduce((acc, p) => {
      const value = p[metric]
      return acc + (typeof value === 'number' ? value : 0)
    }, 0)
    return Math.round((sum / performances.length) * 100) / 100
  }

  /**
   * Calculate maximum value for a metric
   */
  const calculateMax = (performances: Performance[], metric: keyof Performance): number => {
    if (performances.length === 0) return 0
    const values = performances
      .map((p) => p[metric])
      .filter((v) => typeof v === 'number') as number[]
    return values.length > 0 ? Math.max(...values) : 0
  }

  /**
   * Calculate minimum value for a metric
   */
  const calculateMin = (performances: Performance[], metric: keyof Performance): number => {
    if (performances.length === 0) return 0
    const values = performances
      .map((p) => p[metric])
      .filter((v) => typeof v === 'number') as number[]
    return values.length > 0 ? Math.min(...values) : 0
  }

  /**
   * Calculate trend direction (improving, declining, stable)
   * Compares first half to second half of data
   */
  const calculateTrend = (performances: Performance[], metric: keyof Performance): 'improving' | 'declining' | 'stable' => {
    if (performances.length < 2) return 'stable'

    const mid = Math.floor(performances.length / 2)
    const firstHalf = performances.slice(0, mid)
    const secondHalf = performances.slice(mid)

    const firstAvg = calculateAverage(firstHalf, metric)
    const secondAvg = calculateAverage(secondHalf, metric)

    const diff = secondAvg - firstAvg
    const threshold = firstAvg * 0.05 // 5% threshold

    if (diff > threshold) return 'improving'
    if (diff < -threshold) return 'declining'
    return 'stable'
  }

  /**
   * Calculate percentage change between two values
   */
  const calculatePercentChange = (oldValue: number, newValue: number): number => {
    if (oldValue === 0) return 0
    return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100
  }

  /**
   * Filter performances by date range
   */
  const filterByDateRange = (
    performances: Performance[],
    startDate: Date,
    endDate: Date
  ): Performance[] => {
    return performances.filter((p) => {
      const date = new Date(p.created_at || '')
      return date >= startDate && date <= endDate
    })
  }

  /**
   * Compare metrics between two time periods
   */
  const comparePeriods = (
    performances: Performance[],
    metric: keyof Performance,
    periodDays: number
  ): {
    currentPeriod: number
    previousPeriod: number
    change: number
    changePercent: number
  } => {
    const now = new Date()
    const twoPeriodsAgo = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000)
    const onePeriodAgo = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    const previousPeriodData = filterByDateRange(performances, twoPeriodsAgo, onePeriodAgo)
    const currentPeriodData = filterByDateRange(performances, onePeriodAgo, now)

    const currentAvg = calculateAverage(currentPeriodData, metric)
    const previousAvg = calculateAverage(previousPeriodData, metric)
    const change = currentAvg - previousAvg
    const changePercent = calculatePercentChange(previousAvg, currentAvg)

    return {
      currentPeriod: currentAvg,
      previousPeriod: previousAvg,
      change,
      changePercent,
    }
  }

  /**
   * Group performances by time period
   */
  const groupByPeriod = (
    performances: Performance[],
    periodType: 'daily' | 'weekly' | 'monthly'
  ): Record<string, Performance[]> => {
    const grouped: Record<string, Performance[]> = {}

    performances.forEach((p) => {
      const date = new Date(p.created_at || '')
      let key: string

      if (periodType === 'daily') {
        key = date.toISOString().split('T')[0]
      } else if (periodType === 'weekly') {
        const week = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
        key = `Week ${week + 1}`
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!grouped[key]) grouped[key] = []
      grouped[key].push(p)
    })

    return grouped
  }

  /**
   * Calculate projection for future performance
   * Uses linear regression on recent trends
   */
  const projectPerformance = (
    performances: Performance[],
    metric: keyof Performance,
    daysAhead: number = 30
  ): number => {
    if (performances.length < 2) return calculateAverage(performances, metric)

    // Use last 10 performances for trend calculation
    const recentPerfs = performances.slice(-10)
    const values = recentPerfs
      .map((p) => p[metric])
      .filter((v) => typeof v === 'number') as number[]

    if (values.length === 0) return 0

    // Simple linear regression
    const n = values.length
    const sumX = (n * (n + 1)) / 2
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = values.reduce((sum, v, i) => sum + v * (i + 1), 0)
    const sumX2 = n * (n + 1) * (2 * n + 1) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Project to future date (approximate as days/7 weeks)
    const weeksAhead = Math.ceil(daysAhead / 7)
    const projection = intercept + slope * (n + weeksAhead)

    return Math.max(0, Math.round(projection * 100) / 100)
  }

  /**
   * Calculate Pearson correlation coefficient between two numeric arrays
   * Returns value between -1 and 1, where 1 = perfect positive correlation, -1 = perfect negative, 0 = no correlation
   */
  const calculateCorrelation = (xValues: number[], yValues: number[]): number => {
    if (xValues.length !== yValues.length || xValues.length < 2) return 0

    const n = xValues.length
    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)
    const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    if (denominator === 0) return 0
    return Math.round((numerator / denominator) * 1000) / 1000
  }

  /**
   * Calculate linear regression line
   * Returns slope, intercept, and array of points along the line
   */
  const calculateRegressionLine = (
    xValues: number[],
    yValues: number[]
  ): {
    slope: number
    intercept: number
    r2: number
    points: Array<{ x: number; y: number }>
  } => {
    if (xValues.length !== yValues.length || xValues.length < 2) {
      return { slope: 0, intercept: 0, r2: 0, points: [] }
    }

    const n = xValues.length
    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared (coefficient of determination)
    const yMean = sumY / n
    const ssTotal = yValues.reduce((sum, y) => sum + (y - yMean) ** 2, 0)
    const ssRes = yValues.reduce((sum, y, i) => sum + (y - (slope * xValues[i] + intercept)) ** 2, 0)
    const r2 = ssTotal === 0 ? 0 : Math.round((1 - ssRes / ssTotal) * 1000) / 1000

    // Generate points along the line
    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)
    const points: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= 10; i++) {
      const x = minX + (maxX - minX) * (i / 10)
      points.push({ x: Math.round(x * 100) / 100, y: Math.round((slope * x + intercept) * 100) / 100 })
    }

    return { slope: Math.round(slope * 1000) / 1000, intercept: Math.round(intercept * 100) / 100, r2, points }
  }

  /**
   * Group items by category field
   * Returns array of categories with counts and percentages
   */
  const groupByCategory = <T extends Record<string, any>>(
    items: T[],
    categoryField: keyof T
  ): Array<{ label: string; value: number; percentage: number }> => {
    if (items.length === 0) return []

    const grouped: Record<string, number> = {}
    items.forEach((item) => {
      const key = String(item[categoryField] || 'Other')
      grouped[key] = (grouped[key] || 0) + 1
    })

    const total = items.length
    return Object.entries(grouped)
      .map(([label, value]) => ({
        label,
        value,
        percentage: Math.round((value / total) * 100)
      }))
      .sort((a, b) => b.value - a.value)
  }

  /**
   * Calculate funnel metrics (conversion rates between stages)
   */
  const calculateFunnelMetrics = (
    stages: Array<{ label: string; count: number }>
  ): Array<{ label: string; count: number; percentage: number; conversionRate: number }> => {
    if (stages.length === 0) return []

    const total = stages[0]?.count || 0
    return stages.map((stage, index) => ({
      label: stage.label,
      count: stage.count,
      percentage: total > 0 ? Math.round((stage.count / total) * 100) : 0,
      conversionRate:
        index > 0 && stages[index - 1].count > 0
          ? Math.round((stage.count / stages[index - 1].count) * 100)
          : (index === 0 ? 100 : 0)
    }))
  }

  return {
    calculateAverage,
    calculateMax,
    calculateMin,
    calculateTrend,
    calculatePercentChange,
    filterByDateRange,
    comparePeriods,
    groupByPeriod,
    projectPerformance,
    calculateCorrelation,
    calculateRegressionLine,
    groupByCategory,
    calculateFunnelMetrics,
  }
}
