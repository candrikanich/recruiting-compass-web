import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LogMetricModal from '~/components/Performance/LogMetricModal.vue';

describe('LogMetricModal', () => {
  it('renders when show prop is true', () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Log Performance Metric');
  });

  it('does not render when show prop is false', () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: false },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.find('.modal-container').exists()).toBe(false);
  });

  it('emits close event when backdrop is clicked', async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await wrapper.find('.fixed.inset-0').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits close event when cancel button is clicked', async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await wrapper.find('button[type="button"]').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});

describe('LogMetricModal - Form Fields', () => {
  it('renders all required form fields', () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.find('#metricType').exists()).toBe(true);
    expect(wrapper.find('#value').exists()).toBe(true);
    expect(wrapper.find('#date').exists()).toBe(true);
    expect(wrapper.find('#unit').exists()).toBe(true);
    expect(wrapper.find('#notes').exists()).toBe(true);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
  });

  it('has all metric type options', () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const options = wrapper.find('#metricType').findAll('option');
    expect(options).toHaveLength(9); // 8 types + empty option

    // Verify spec-compliant options
    expect(options[0].text()).toBe('Select Metric');
    expect(options[1].text()).toBe('Fastball Velocity (mph)');
    expect(options[2].text()).toBe('Exit Velocity (mph)');
    expect(options[3].text()).toBe('60-Yard Dash (sec)');
    expect(options[4].text()).toBe('Pop Time (sec)');
    expect(options[5].text()).toBe('Batting Average');
    expect(options[6].text()).toBe('ERA');
    expect(options[7].text()).toBe('Strikeouts');
    expect(options[8].text()).toBe('Other');

    // Verify spec-compliant values
    expect(options[1].element.value).toBe('velocity');
    expect(options[2].element.value).toBe('exit_velo');
    expect(options[3].element.value).toBe('sixty_time');
    expect(options[4].element.value).toBe('pop_time');
    expect(options[5].element.value).toBe('batting_avg');
    expect(options[6].element.value).toBe('era');
    expect(options[7].element.value).toBe('strikeouts');
    expect(options[8].element.value).toBe('other');
  });

  it('defaults date to today', async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await flushPromises(); // Wait for onMounted hook

    const today = new Date().toISOString().split('T')[0];
    expect((wrapper.find('#date').element as HTMLInputElement).value).toBe(today);
  });

  it('disables submit button when required fields are empty', async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.attributes('disabled')).toBeDefined();
  });
});
