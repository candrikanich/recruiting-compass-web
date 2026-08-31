import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

// Set up mock before importing component
const createMockComposable = (overrides = {}) => ({
  completeness: ref(45),
  loading: ref(false),
  error: ref(null),
  updateCompleteness: vi.fn(),
  getNextPrompt: vi.fn(),
  dismissPrompt: vi.fn(),
  ...overrides,
});

vi.mock('~/composables/useProfileCompleteness', () => ({
  useProfileCompleteness: vi.fn(() => createMockComposable()),
}));

describe('ProfileCompletenessCard', () => {
  it('renders percentage in progress ring', async () => {
    const { default: ProfileCompletenessCard } = await import(
      '~/components/Dashboard/ProfileCompletenessCard.vue'
    );
    const wrapper = mount(ProfileCompletenessCard);
    expect(wrapper.text()).toContain('45%');
  });

  it('renders circular progress ring SVG', async () => {
    const { default: ProfileCompletenessCard } = await import(
      '~/components/Dashboard/ProfileCompletenessCard.vue'
    );
    const wrapper = mount(ProfileCompletenessCard);
    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
  });

  it('shows expanded layout when completeness < 80', async () => {
    const { default: ProfileCompletenessCard } = await import(
      '~/components/Dashboard/ProfileCompletenessCard.vue'
    );
    const wrapper = mount(ProfileCompletenessCard);
    const expandedLayout = wrapper.find('[data-test="expanded-layout"]');
    expect(expandedLayout.exists()).toBe(true);
  });

  it('shows compact layout when completeness >= 80', async () => {
    vi.mocked(
      (await import('~/composables/useProfileCompleteness')).useProfileCompleteness,
    ).mockReturnValueOnce(
      createMockComposable({
        completeness: ref(85),
      }),
    );

    const { default: ProfileCompletenessCard } = await import(
      '~/components/Dashboard/ProfileCompletenessCard.vue'
    );
    const wrapper = mount(ProfileCompletenessCard);
    const compactLayout = wrapper.find('[data-test="compact-layout"]');
    expect(compactLayout.exists()).toBe(true);
  });

  it('renders loading state when loading is true', async () => {
    vi.mocked(
      (await import('~/composables/useProfileCompleteness')).useProfileCompleteness,
    ).mockReturnValueOnce(
      createMockComposable({
        loading: ref(true),
      }),
    );

    const { default: ProfileCompletenessCard } = await import(
      '~/components/Dashboard/ProfileCompletenessCard.vue'
    );
    const wrapper = mount(ProfileCompletenessCard);
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true);
  });

  it('displays missing field prompts in expanded layout', async () => {
    const { default: ProfileCompletenessCard } = await import(
      '~/components/Dashboard/ProfileCompletenessCard.vue'
    );
    const wrapper = mount(ProfileCompletenessCard);

    // Check that missing field messages are rendered
    expect(wrapper.text()).toContain('GPA');
    expect(wrapper.text()).toContain('SAT or ACT');
    expect(wrapper.text()).toContain('highlight video');
  });

  it('has Add buttons for each missing field', async () => {
    const { default: ProfileCompletenessCard } = await import(
      '~/components/Dashboard/ProfileCompletenessCard.vue'
    );
    const wrapper = mount(ProfileCompletenessCard);

    // Check that we have multiple "Add" buttons (one per missing field)
    const addButtons = wrapper.findAll('a');
    const addButtonTexts = addButtons.map((btn) => btn.text());
    const addCount = addButtonTexts.filter((text) => text.includes('Add')).length;
    expect(addCount).toBeGreaterThanOrEqual(3);
  });
});
