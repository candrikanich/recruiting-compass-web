// tests/unit/components/shared/StatsTiles.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatsTiles from '~/components/shared/StatsTiles.vue';
import { AcademicCapIcon, StarIcon } from '@heroicons/vue/24/outline';

describe('StatsTiles', () => {
  it('renders correct number of tiles', () => {
    const stats = [
      { label: 'Total', value: 10, icon: AcademicCapIcon, color: 'blue' as const, testId: 'stat-total' },
      { label: 'Favorites', value: 5, icon: StarIcon, color: 'amber' as const, testId: 'stat-favorites' }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    const tiles = wrapper.findAll('[data-testid]');
    expect(tiles).toHaveLength(2);
  });

  it('displays labels and values correctly', () => {
    const stats = [
      { label: 'Total Schools', value: 35, testId: 'stat-total' }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    expect(wrapper.text()).toContain('Total Schools');
    expect(wrapper.text()).toContain('35');
  });

  it('applies correct color classes to icons', () => {
    const stats = [
      { label: 'Test', value: 1, icon: AcademicCapIcon, color: 'amber' as const }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    const icon = wrapper.find('svg');
    expect(icon.classes()).toContain('text-amber-600');
  });

  it('has proper ARIA attributes', () => {
    const stats = [{ label: 'Total', value: 10 }];

    const wrapper = mount(StatsTiles, {
      props: { stats, ariaLabel: 'Test Statistics' }
    });

    const container = wrapper.find('[role="region"]');
    expect(container.attributes('aria-label')).toBe('Test Statistics');
  });

  it('handles empty stats array gracefully', () => {
    const wrapper = mount(StatsTiles, {
      props: { stats: [] }
    });

    expect(wrapper.html()).toBeTruthy();
    const tiles = wrapper.findAll('[data-testid]');
    expect(tiles).toHaveLength(0);
  });

  it('shows tiles without icons when icon is missing', () => {
    const stats = [
      { label: 'Total', value: 10, testId: 'stat-total' }
    ];

    const wrapper = mount(StatsTiles, {
      props: { stats }
    });

    expect(wrapper.text()).toContain('Total');
    expect(wrapper.text()).toContain('10');
  });
});
