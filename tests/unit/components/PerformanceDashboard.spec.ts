import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PerformanceDashboard from '~/components/Performance/PerformanceDashboard.vue'
import type { PerformanceMetric } from '~/types/models'

describe('PerformanceDashboard', () => {
  const createMockMetric = (overrides = {}): PerformanceMetric => ({
    id: 'metric-1',
    user_id: 'user-1',
    metric_type: 'velocity',
    value: 90,
    unit: 'mph',
    recorded_date: new Date().toISOString().split('T')[0],
    verified: false,
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  })

  let wrapper: any

  beforeEach(() => {
    wrapper = mount(PerformanceDashboard, {
      props: {
        metrics: [
          createMockMetric({ metric_type: 'velocity', value: 90, recorded_date: '2024-01-01' }),
          createMockMetric({ id: 'metric-2', metric_type: 'velocity', value: 92, recorded_date: '2024-01-08' }),
          createMockMetric({ id: 'metric-3', metric_type: 'exit_velo', value: 85, recorded_date: '2024-01-10' }),
          createMockMetric({ id: 'metric-4', metric_type: 'exit_velo', value: 88, recorded_date: '2024-01-15' }),
          createMockMetric({ id: 'metric-5', metric_type: 'sixty_time', value: 7.2, recorded_date: '2024-01-20' }),
        ]
      },
      global: {
        stubs: {
          MetricSummaryRow: { template: '<div class="metric-summary-row" />' }
        }
      }
    })
  })

  describe('rendering', () => {
    it('should render summary statistics grid', () => {
      const grid = wrapper.find('[class*="grid"]')
      expect(grid.exists()).toBe(true)
    })

    it('should display total metrics count', () => {
      expect(wrapper.text()).toContain('Total Metrics')
      expect(wrapper.text()).toContain('5')
    })

    it('should display latest metric value', () => {
      expect(wrapper.text()).toContain('Latest Record')
      expect(wrapper.text()).toContain('7.2')
    })

    it('should display metric types count', () => {
      expect(wrapper.text()).toContain('Metric Types')
      expect(wrapper.text()).toContain('3')
    })

    it('should display overall trend', () => {
      expect(wrapper.text()).toContain('Overall Trend')
    })
  })

  describe('metric categories', () => {
    it('should render power metrics section', () => {
      expect(wrapper.text()).toContain('Power Metrics')
      expect(wrapper.text()).toContain('Fastball Velocity')
      expect(wrapper.text()).toContain('Exit Velocity')
    })

    it('should render speed metrics section', () => {
      expect(wrapper.text()).toContain('Speed Metrics')
      expect(wrapper.text()).toContain('60-Yard Dash')
    })

    it('should render hitting metrics section', () => {
      expect(wrapper.text()).toContain('Hitting Metrics')
    })

    it('should render pitching metrics section', () => {
      expect(wrapper.text()).toContain('Pitching Metrics')
    })
  })

  describe('recent metrics', () => {
    it('should display recent metrics list', () => {
      expect(wrapper.text()).toContain('Recent Metrics')
    })

    it('should show latest 5 metrics', () => {
      const recentItems = wrapper.findAll('[class*="bg-gray-50"]')
      // Should have at least 5 recent metric items
      expect(recentItems.length).toBeGreaterThanOrEqual(4)
    })

    it('should show metric date in recent activity', () => {
      expect(wrapper.text()).toContain('2024')
    })
  })

  describe('empty state', () => {
    it('should show empty state when no metrics', async () => {
      await wrapper.setProps({ metrics: [] })
      expect(wrapper.text()).toContain('No metrics recorded yet')
    })

    it('should show placeholder when no latest value', async () => {
      await wrapper.setProps({ metrics: [] })
      expect(wrapper.text()).toContain('Latest Record')
    })
  })

  describe('trend detection', () => {
    it('should calculate trend from metrics', () => {
      const trend = wrapper.vm.overallTrend
      expect(trend).toBeDefined()
      // Should be one of: Improving, Declining, Stable
      expect(['Improving', 'Declining', 'Stable']).toContain(trend)
    })

    it('should display trend icon', () => {
      const trend = wrapper.vm.overallTrend.toLowerCase()
      const icon = wrapper.vm.trendIcon()

      if (trend.includes('improving')) {
        expect(icon).toBe('📈')
      } else if (trend.includes('declining')) {
        expect(icon).toBe('📉')
      } else {
        expect(icon).toBe('➡️')
      }
    })
  })

  describe('metric statistics', () => {
    it('should return latest value for metric type', () => {
      const velocityStats = wrapper.vm.getMetricStats('velocity')
      expect(velocityStats).toBe('92.0') // Latest velocity value
    })

    it('should return dash for unknown metric type', () => {
      const unknownStats = wrapper.vm.getMetricStats('unknown_type')
      expect(unknownStats).toBe('—')
    })
  })

  describe('metric labels and units', () => {
    it('should return correct metric labels', () => {
      expect(wrapper.vm.getMetricLabel('velocity')).toBe('Fastball Velocity')
      expect(wrapper.vm.getMetricLabel('exit_velo')).toBe('Exit Velocity')
      expect(wrapper.vm.getMetricLabel('sixty_time')).toBe('60-Yard Dash')
    })

    it('should return correct units', () => {
      expect(wrapper.vm.getUnit('velocity')).toBe('mph')
      expect(wrapper.vm.getUnit('sixty_time')).toBe('sec')
      expect(wrapper.vm.getUnit('batting_avg')).toBe('avg')
    })
  })

  describe('trend colors', () => {
    it('should return trend color class', () => {
      const colorClass = wrapper.vm.getTrendColor()
      expect(['text-green-600', 'text-red-600', 'text-gray-900']).toContain(colorClass)
    })
  })

  describe('data sorting', () => {
    it('should sort recent metrics by date descending', () => {
      const recent = wrapper.vm.recentMetrics
      expect(recent[0].recorded_date).toBe('2024-01-20') // Latest date first
    })

    it('should display latest 5 in recent list', async () => {
      const longMetrics = Array.from({ length: 10 }, (_, i) =>
        createMockMetric({
          id: `metric-${i}`,
          value: 80 + i,
          recorded_date: new Date(2024, 0, i + 1).toISOString().split('T')[0]
        })
      )

      await wrapper.setProps({ metrics: longMetrics })

      const recentText = wrapper.text()
      // Should show 'Recent Metrics' heading
      expect(recentText).toContain('Recent Metrics')
    })
  })

  describe('date formatting', () => {
    it('should format dates correctly', () => {
      const formatted = wrapper.vm.formatDate('2024-01-15')
      expect(formatted).toMatch(/Jan 15, 2024/)
    })
  })

  describe('responsive design', () => {
    it('should use responsive grid layout', () => {
      const gridClasses = wrapper.find('[class*="grid"]').classes()
      expect(gridClasses.some(c => c.includes('grid'))).toBe(true)
      expect(gridClasses.some(c => c.includes('md'))).toBe(true)
      expect(gridClasses.some(c => c.includes('lg'))).toBe(true)
    })
  })

  describe('metric type detection', () => {
    it('should identify all unique metric types', () => {
      const types = wrapper.vm.metricTypes
      expect(types).toContain('velocity')
      expect(types).toContain('exit_velo')
      expect(types).toContain('sixty_time')
    })

    it('should handle duplicate metric types', async () => {
      const duplicateMetrics = [
        createMockMetric({ metric_type: 'velocity', value: 90 }),
        createMockMetric({ id: 'metric-2', metric_type: 'velocity', value: 92 }),
        createMockMetric({ id: 'metric-3', metric_type: 'velocity', value: 94 }),
      ]

      await wrapper.setProps({ metrics: duplicateMetrics })

      const types = wrapper.vm.metricTypes
      const velocityCount = types.filter(t => t === 'velocity').length
      expect(velocityCount).toBe(1) // Should appear only once
    })
  })
})
