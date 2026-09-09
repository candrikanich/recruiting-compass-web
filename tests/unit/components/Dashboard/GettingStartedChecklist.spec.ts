import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref, computed } from "vue";
import { NUX_CHECKLIST_KEYS, type NuxProgress } from "~/types/nux";

const mockProgress = ref<NuxProgress>({
  version: 1,
  checklist: {
    items: {
      sport: { completed: true, completedAt: "2026-01-01T00:00:00Z" },
    },
    dismissedAt: null,
    allCompleteAt: null,
  },
  profileCompletion: { completedAt: null },
  firstVisits: {},
  dismissals: {},
});
const mockCompleteItem = vi.fn();
const mockDismissChecklist = vi.fn();
const mockRecordFirstVisit = vi.fn();
const mockUpdateProfileCompletion = vi.fn();

vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({
    progress: mockProgress,
    checklistPercentage: computed(() => {
      const items = mockProgress.value.checklist.items;
      const completed = NUX_CHECKLIST_KEYS.filter(
        (k) => items[k]?.completed,
      ).length;
      return Math.round((completed / NUX_CHECKLIST_KEYS.length) * 100);
    }),
    isChecklistComplete: computed(() => false),
    completeItem: mockCompleteItem,
    dismissChecklist: mockDismissChecklist,
    recordFirstVisit: mockRecordFirstVisit,
    updateProfileCompletion: mockUpdateProfileCompletion,
  }),
}));

const mockUser = ref({ id: "u1", role: "player", full_name: "Test Player" });

vi.mock("~/stores/user", () => ({
  // Mirrors Pinia's auto-unwrap of top-level refs: consumers read
  // `userStore.user` (not `.value`), so expose it via a getter.
  useUserStore: () => ({
    get user() {
      return mockUser.value;
    },
  }),
}));

const mockSchools = ref([]);
const mockCoaches = ref([]);
const mockCompleteness = ref(0);
const mockUpdateCompleteness = vi.fn();

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: mockSchools,
  }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: mockCoaches,
  }),
}));

vi.mock("~/composables/useProfileCompleteness", () => ({
  useProfileCompleteness: () => ({
    completeness: mockCompleteness,
    updateCompleteness: mockUpdateCompleteness,
  }),
}));

const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

async function mountChecklist() {
  const GettingStartedChecklist = (
    await import("~/components/Dashboard/GettingStartedChecklist.vue")
  ).default;
  const wrapper = mount(GettingStartedChecklist, {
    global: { stubs: { NuxtLink: NuxtLinkStub } },
  });
  await flushPromises();
  return wrapper;
}

describe("GettingStartedChecklist", () => {
  beforeEach(() => {
    mockProgress.value = {
      version: 1,
      checklist: {
        items: {
          sport: { completed: true, completedAt: "2026-01-01T00:00:00Z" },
        },
        dismissedAt: null,
        allCompleteAt: null,
      },
      profileCompletion: { completedAt: null },
      firstVisits: {},
      dismissals: {},
    };
    mockUser.value = { id: "u1", role: "player", full_name: "Test Player" };
    mockSchools.value = [];
    mockCoaches.value = [];
    mockCompleteness.value = 0;
    mockCompleteItem.mockClear();
    mockDismissChecklist.mockClear().mockResolvedValue(undefined);
    mockRecordFirstVisit.mockClear();
    mockUpdateCompleteness.mockClear();
    mockUpdateProfileCompletion.mockClear();
  });

  it("renders checklist with progress bar", async () => {
    const wrapper = await mountChecklist();
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("1 of 8");
  });

  it("shows completed items with check mark", async () => {
    const wrapper = await mountChecklist();
    const sportItem = wrapper.find('[data-testid="checklist-item-sport"]');
    expect(sportItem.classes()).toContain("line-through");
  });

  it("hides when dismissed", async () => {
    mockProgress.value = {
      ...mockProgress.value,
      checklist: {
        ...mockProgress.value.checklist,
        dismissedAt: "2026-01-01T00:00:00Z",
      },
    };
    const wrapper = await mountChecklist();
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(
      false,
    );
  });

  it('shows "Resume getting started" link when dismissed', async () => {
    mockProgress.value = {
      ...mockProgress.value,
      checklist: {
        ...mockProgress.value.checklist,
        dismissedAt: "2026-01-01T00:00:00Z",
      },
    };
    const wrapper = await mountChecklist();
    expect(wrapper.text()).toContain("Resume getting started");
  });

  it("renders parent-framed labels when role is parent", async () => {
    mockUser.value = { id: "u2", role: "parent", full_name: "Test Parent" };
    const wrapper = await mountChecklist();
    expect(wrapper.text()).not.toContain("Choose your sport");
  });

  it("calls dismissChecklist when dismiss button is clicked", async () => {
    const wrapper = await mountChecklist();
    await wrapper.find('[data-testid="checklist-dismiss"]').trigger("click");
    expect(mockDismissChecklist).toHaveBeenCalledTimes(1);
  });

  it("auto-completes first_school when schools exist", async () => {
    mockSchools.value = [{ id: "s1" } as never];
    await mountChecklist();
    expect(mockCompleteItem).toHaveBeenCalledWith("first_school");
  });

  it("auto-completes first_coach when coaches exist", async () => {
    mockCoaches.value = [{ id: "c1" } as never];
    await mountChecklist();
    expect(mockCompleteItem).toHaveBeenCalledWith("first_coach");
  });

  it("auto-completes profile_80 when completeness is 80 or higher", async () => {
    mockCompleteness.value = 85;
    await mountChecklist();
    expect(mockCompleteItem).toHaveBeenCalledWith("profile_80");
  });

  it("still shows item list when not complete (regression guard)", async () => {
    const wrapper = await mountChecklist();
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('[data-testid="checklist-complete-banner"]').exists(),
    ).toBe(false);
  });

  it("renders complete banner at 100% within 24h", async () => {
    const items: NuxProgress["checklist"]["items"] = {};
    for (const key of NUX_CHECKLIST_KEYS) {
      items[key] = { completed: true, completedAt: "2026-01-01T00:00:00Z" };
    }
    mockProgress.value = {
      ...mockProgress.value,
      checklist: {
        items,
        dismissedAt: null,
        allCompleteAt: new Date().toISOString(),
      },
    };
    const wrapper = await mountChecklist();
    expect(
      wrapper.find('[data-testid="checklist-complete-banner"]').exists(),
    ).toBe(true);
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(
      false,
    );
  });

  it("renders nothing after 24h past full completion", async () => {
    const items: NuxProgress["checklist"]["items"] = {};
    for (const key of NUX_CHECKLIST_KEYS) {
      items[key] = { completed: true, completedAt: "2026-01-01T00:00:00Z" };
    }
    mockProgress.value = {
      ...mockProgress.value,
      checklist: {
        items,
        dismissedAt: null,
        allCompleteAt: new Date(Date.now() - 25 * 3_600_000).toISOString(),
      },
    };
    const wrapper = await mountChecklist();
    expect(
      wrapper.find('[data-testid="checklist-complete-banner"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="checklist-resume"]').exists()).toBe(
      false,
    );
  });
});
