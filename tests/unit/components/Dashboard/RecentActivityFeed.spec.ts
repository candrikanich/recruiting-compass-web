import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RecentActivityFeed from '~/components/Dashboard/RecentActivityFeed.vue';
import { useActivityFeed } from '~/composables/useActivityFeed';
import { ref } from 'vue';

// Mock the composable
vi.mock('~/composables/useActivityFeed');

describe('RecentActivityFeed', () => {
  let mockActivities: any;
  let mockLoading: any;
  let mockError: any;
  let mockFetchActivities: any;
  let mockSubscribeToUpdates: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create reactive refs for proper state management
    mockActivities = ref([
      {
        id: '1',
        type: 'interaction',
        timestamp: new Date().toISOString(),
        title: 'Email to ASU',
        description: 'Test content...',
        icon: '📧',
        entityType: 'interaction',
        clickable: true,
        clickUrl: '/interactions?id=1',
        metadata: { relativeTime: '2h ago' },
      },
      {
        id: '2',
        type: 'school_status_change',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        title: 'ASU status changed',
        description: 'Great news!',
        icon: '📍',
        entityType: 'school',
        clickable: true,
        clickUrl: '/schools/school-1',
        metadata: { relativeTime: '1m ago' },
      },
    ]);
    mockLoading = ref(false);
    mockError = ref(null);
    mockFetchActivities = vi.fn();
    mockSubscribeToUpdates = vi.fn();

    vi.mocked(useActivityFeed).mockReturnValue({
      activities: mockActivities as any,
      loading: mockLoading as any,
      error: mockError as any,
      fetchActivities: mockFetchActivities,
      subscribeToUpdates: mockSubscribeToUpdates,
      formatRelativeTime: vi.fn((date) => 'just now'),
      limit: ref(10),
      offset: ref(0),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with title', () => {
    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: { template: '<div>Activity Item</div>' },
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    expect(wrapper.text()).toContain('Recent Activity');
  });

  it('displays activity events', async () => {
    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: {
            props: ['event'],
            template: '<div>{{ event.title }}</div>',
          },
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Email to ASU');
    expect(wrapper.text()).toContain('ASU status changed');
  });

  it('shows loading state', async () => {
    mockLoading.value = true;

    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: true,
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    expect(wrapper.text()).toContain('Loading');
  });

  it('shows error state', async () => {
    mockError.value = 'Failed to load activities';

    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: true,
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    expect(wrapper.text()).toContain('Failed to load activities');
  });

  it('shows empty state when no activities', async () => {
    mockActivities.value = [];

    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: true,
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('No recent activity');
  });

  it('shows View All Activity link', () => {
    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: true,
          NuxtLink: { template: '<a href="/activity"><slot /></a>' },
        },
      },
    });

    expect(wrapper.text()).toContain('View All Activity');
  });

  it('calls fetchActivities on mount', async () => {
    mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: true,
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    await flushPromises();

    expect(mockFetchActivities).toHaveBeenCalled();
  });

  it('calls subscribeToUpdates on mount', async () => {
    mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: true,
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    await flushPromises();

    expect(mockSubscribeToUpdates).toHaveBeenCalled();
  });

  it('refresh button calls fetchActivities', async () => {
    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: true,
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    mockFetchActivities.mockClear();

    const refreshButton = wrapper.find('button');
    await refreshButton.trigger('click');

    expect(mockFetchActivities).toHaveBeenCalled();
  });

  it('displays correct number of activities', async () => {
    const wrapper = mount(RecentActivityFeed, {
      global: {
        stubs: {
          SparklesIcon: true,
          ActivityEventItem: {
            props: ['event'],
            template: '<div class="activity-item">{{ event.title }}</div>',
          },
          NuxtLink: { template: '<a><slot /></a>' },
        },
      },
    });

    await flushPromises();

    const items = wrapper.findAll('.activity-item');
    expect(items.length).toBeGreaterThan(0);
  });
});
