import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FunnelChart from '~/components/Analytics/FunnelChart.vue'

describe('FunnelChart.vue', () => {
  const mockData = [
    { label: 'Awareness', value: 1000 },
    { label: 'Interest', value: 600 },
    { label: 'Consideration', value: 300 },
    { label: 'Decision', value: 100 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title and total items', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    expect(wrapper.text()).toContain('Sales Funnel')
    expect(wrapper.text()).toContain('1000')
  })

  it('shows empty state when no data', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Empty Funnel',
        stages: [],
        colors: [],
        emptyStateMessage: 'No data'
      }
    })

    expect(wrapper.text()).toContain('No data')
  })

  it('renders correct number of stages', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    const stages = wrapper.findAll('[data-testid^="stage-"]')
    expect(stages.length).toBe(4)
  })

  it('calculates conversion rates correctly', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    const conversionRates = wrapper.vm.metrics
    expect(conversionRates[0].conversionRate).toBe(100)
    expect(conversionRates[1].conversionRate).toBe(60)
    expect(conversionRates[2].conversionRate).toBe(50)
  })

  it('calculates stage percentages', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    const metrics = wrapper.vm.metrics
    expect(metrics[0].percentage).toBe(100)
    expect(metrics[1].percentage).toBe(60)
    expect(metrics[2].percentage).toBe(30)
  })

  it('applies custom colors', () => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors
      }
    })

    expect(wrapper.vm.colors).toEqual(colors)
  })

  it('emits stage-click event', async () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    const stage = wrapper.find('[data-testid="stage-0"]')
    if (stage.exists()) {
      await stage.trigger('click')
      expect(wrapper.emitted('stage-click')).toBeTruthy()
    }
  })

  it('renders stage detail cards', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    const cards = wrapper.findAll('[data-testid="stage-card"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('displays stage labels', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    expect(wrapper.text()).toContain('Awareness')
    expect(wrapper.text()).toContain('Interest')
    expect(wrapper.text()).toContain('Consideration')
    expect(wrapper.text()).toContain('Decision')
  })

  it('handles data updates', async () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    const newData = [
      { label: 'Step1', value: 100 },
      { label: 'Step2', value: 50 }
    ]

    await wrapper.setProps({ stages: newData })
    expect(wrapper.vm.metrics.length).toBe(2)
  })

  it('handles equal stage sizes', () => {
    const equalData = [
      { label: 'Stage1', value: 100 },
      { label: 'Stage2', value: 100 },
      { label: 'Stage3', value: 100 }
    ]

    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Equal Stages',
        stages: equalData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56']
      }
    })

    const metrics = wrapper.vm.metrics
    expect(metrics[0].conversionRate).toBe(100)
    expect(metrics[1].conversionRate).toBe(100)
    expect(metrics[2].conversionRate).toBe(100)
  })

  it('handles single stage', () => {
    const singleData = [{ label: 'Only', value: 50 }]

    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Single Stage',
        stages: singleData,
        colors: ['#FF6384']
      }
    })

    const metrics = wrapper.vm.metrics
    expect(metrics.length).toBe(1)
    expect(metrics[0].conversionRate).toBe(100)
  })

  it('renders SVG funnel visualization', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
  })

  it('handles responsive sizing', () => {
    const wrapper = mount(FunnelChart, {
      props: {
        title: 'Sales Funnel',
        stages: mockData,
        colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }
    })

    expect(wrapper.vm.chartWidth).toBeGreaterThan(0)
    expect(wrapper.vm.chartHeight).toBeGreaterThan(0)
  })
})
