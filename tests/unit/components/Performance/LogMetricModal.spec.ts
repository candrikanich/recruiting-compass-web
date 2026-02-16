import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
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
