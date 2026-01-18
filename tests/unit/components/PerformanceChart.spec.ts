import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PerformanceChart from '~/components/Performance/PerformanceChart.vue'
import type { PerformanceMetric } from '~/types/models'

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn()
  },
  CategoryScale: {},
  LinearScale: {},
  TimeScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {}
}))

vi.mock('vue-chartjs', () => ({
  Line: { name: 'Line', template: '<div class="chart-mock" />' }
}))

describe('PerformanceChart', () => {
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
    wrapper = mount(PerformanceChart, {
      props: {
        title: 'Power Metrics',
        metrics: [
          createMockMetric({ metric_type: 'velocity', value: 90 }),
          createMockMetric({ id: 'metric-2', metric_type: 'velocity', value: 92 }),
          createMockMetric({ id: 'metric-3', metric_type: 'exit_velo', value: 85 }),
        ],
        metricTypes: ['velocity', 'exit_velo'],
        category: 'power',
        showComparison: true,
      },
      global: {
        stubs: {
          StatCard: { template: '<div class="stat-card" />' },
          ComparisonCard: { template: '<div class="comparison-card" />' },
          Line: { template: '<div class="chart-mock" />' }
        }
      }
    })
  })

  describe('rendering', () => {
    it('should render component with title', () => {
      expect(wrapper.find('h2').text()).toBe('Power Metrics')
    })

    it('should display metric count', () => {
      expect(wrapper.text()).toContain('3 metrics recorded')
    })

    it('should render metric type toggles', () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      expect(checkboxes.length).toBe(2)
    })

    it('should render statistics cards when data exists', () => {
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(5) // Average, Maximum, Minimum, Trend, Change %
    })

    it('should render comparison cards when showComparison is true', () => {
      const comparisonCards = wrapper.findAll('.comparison-card')
      expect(comparisonCards.length).toBeGreaterThan(0)
    })

    it('should show empty state when no metrics', async () => {
      await wrapper.setProps({ metrics: [] })
      expect(wrapper.text()).toContain('No metrics recorded')
    })
  })

  describe('metrics filtering', () => {
    it('should toggle metric visibility', async () => {
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      const firstCheckbox = checkboxes[0]

      // Get initial checked state
      const initialChecked = firstCheckbox.element.checked

      // Toggle
      await firstCheckbox.trigger('change')

      // Verify state changed (indirectly by checking the internal state)
      expect(firstCheckbox.element.checked).not.toBe(initialChecked)
    })

    it('should calculate statistics based on visible metrics', async () => {
      // Initially both metrics should be visible
      const statText = wrapper.text()
      expect(statText).toContain('Average')
      expect(statText).toContain('Maximum')
      expect(statText).toContain('Minimum')
    })
  })

  describe('data calculations', () => {
    it('should display numeric statistics correctly', () => {
      const wrapper = mount(PerformanceChart, {
        props: {
          title: 'Test Chart',
          metrics: [
            createMockMetric({ metric_type: 'velocity', value: 80 }),
            createMockMetric({ id: 'metric-2', metric_type: 'velocity', value: 100 }),
          ],
          metricTypes: ['velocity'],
          category: 'power',
          showComparison: false,
        },
        global: {
          stubs: {
            StatCard: { template: '<div>{{ value }}</div>', props: ['value'] },
            ComparisonCard: true,
            Line: true
          }
        }
      })

      // Statistics should include calculations
      expect(wrapper.text()).toContain('Power Metrics')
      expect(wrapper.text()).toContain('2 metrics recorded')
    })
  })

  describe('chart options', () => {
    it('should configure chart with proper options', () => {
      expect(wrapper.vm.chartOptions).toBeDefined()
      expect(wrapper.vm.chartOptions.responsive).toBe(true)
      expect(wrapper.vm.chartOptions.maintainAspectRatio).toBe(false)
    })

    it('should prepare chart data with all visible metrics', () => {
      expect(wrapper.vm.chartData).toBeDefined()
      expect(wrapper.vm.chartData.datasets).toBeDefined()
      expect(wrapper.vm.chartData.datasets.length).toBeGreaterThan(0)
    })
  })

  describe('metric labels and units', () => {
    it('should return correct metric labels', () => {
      expect(wrapper.vm.getMetricLabel('velocity')).toBe('Fastball Velocity')
      expect(wrapper.vm.getMetricLabel('exit_velo')).toBe('Exit Velocity')
      expect(wrapper.vm.getMetricLabel('sixty_time')).toBe('60-Yard Dash')
    })

    it('should return correct units for category', () => {
      expect(wrapper.vm.getUnit()).toBe('mph') // power category
    })

    it('should return correct y-axis label based on category', () => {
      expect(wrapper.vm.getYAxisLabel()).toBe('Velocity (mph)')
    })
  })

  describe('responsive behavior', () => {
    it('should render mobile-friendly layout', () => {
      const container = wrapper.find('[class*="grid"]')
      expect(container.exists()).toBe(true)
    })
  })

  describe('category-specific behavior', () => {
    it('should render speed metrics with correct units', async () => {
      await wrapper.setProps({
        category: 'speed',
        metricTypes: ['sixty_time'],
        metrics: [
          createMockMetric({ metric_type: 'sixty_time', value: 7.2 })
        ]
      })

      expect(wrapper.vm.getUnit()).toBe('sec')
      expect(wrapper.vm.getYAxisLabel()).toBe('Time (seconds)')
    })

    it('should render hitting metrics', async () => {
      await wrapper.setProps({
        category: 'hitting',
        metricTypes: ['batting_avg'],
        metrics: [
          createMockMetric({ metric_type: 'batting_avg', value: 0.325 })
        ]
      })

      expect(wrapper.vm.getUnit()).toBe('avg')
    })

    it('should render pitching metrics', async () => {
      await wrapper.setProps({
        category: 'pitching',
        metricTypes: ['era'],
        metrics: [
          createMockMetric({ metric_type: 'era', value: 2.85 })
        ]
      })

      expect(wrapper.vm.getUnit()).toBe('val')
    })
  })

  describe('period comparison', () => {
    it('should show comparison section when enabled', () => {
      expect(wrapper.text()).toContain('Period Comparison')
    })

    it('should hide comparison section when disabled', async () => {
      await wrapper.setProps({ showComparison: false })
      expect(wrapper.text()).not.toContain('Period Comparison')
    })
  })
})
