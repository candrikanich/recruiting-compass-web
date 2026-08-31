import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import type { NuxProgress } from "~/types/nux";

const mockProgress = ref<NuxProgress>({
  version: 1,
  checklist: {
    items: {
      sport: { completed: true, completedAt: "2026-01-01T00:00:00Z" },
    },
    dismissedAt: null,
  },
  firstVisits: {},
  dismissals: {},
});
const mockCompleteItem = vi.fn();
const mockDismissChecklist = vi.fn();
const mockRecordFirstVisit = vi.fn();

vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({
    progress: mockProgress,
    checklistPercentage: computed(() => 13),
    isChecklistComplete: computed(() => false),
    completeItem: mockCompleteItem,
    dismissChecklist: mockDismissChecklist,
    recordFirstVisit: mockRecordFirstVisit,
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
  return mount(GettingStartedChecklist, {
    global: { stubs: { NuxtLink: NuxtLinkStub } },
  });
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
      },
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
  });

  it("renders checklist with progress bar", async () => {
    const wrapper = await mountChecklist();
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(true);
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
      checklist: { ...mockProgress.value.checklist, dismissedAt: "2026-01-01T00:00:00Z" },
    };
    const wrapper = await mountChecklist();
    expect(wrapper.find('[data-testid="checklist-progress"]').exists()).toBe(false);
  });

  it('shows "Resume getting started" link when dismissed', async () => {
    mockProgress.value = {
      ...mockProgress.value,
      checklist: { ...mockProgress.value.checklist, dismissedAt: "2026-01-01T00:00:00Z" },
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
});
