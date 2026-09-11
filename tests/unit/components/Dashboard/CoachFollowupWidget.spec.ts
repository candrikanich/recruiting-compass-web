import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import CoachFollowupWidget from "~/components/Dashboard/CoachFollowupWidget.vue";
import type { Coach, School } from "~/types/models";

const mockSchools = ref<School[]>([]);
const mockCoaches = ref<Coach[]>([]);

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: mockSchools,
    fetchSchools: vi.fn(),
  }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: mockCoaches,
    fetchAllCoaches: vi.fn(),
  }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: { id: "u1" } }),
}));

vi.mock("~/composables/useCommunication", () => ({
  useCommunication: () => ({
    showPanel: ref(false),
    selectedCoach: ref(null),
    communicationType: ref("email"),
    openCommunication: vi.fn(),
    handleInteractionLogged: vi.fn(),
  }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

const makeCoach = (id: string, overrides: Partial<Coach> = {}): Coach =>
  ({
    id,
    first_name: "Coach",
    last_name: id,
    last_contact_date: null,
    ...overrides,
  }) as unknown as Coach;

const makeSchool = (id: string): School =>
  ({ id, name: `School ${id}` }) as unknown as School;

describe("CoachFollowupWidget", () => {
  const mountWidget = () =>
    mount(CoachFollowupWidget, {
      global: { stubs: { NuxtLink: NuxtLinkStub, CommunicationPanel: true } },
    });

  it("shows a follow-a-school CTA when there are no schools and no coaches", () => {
    mockSchools.value = [];
    mockCoaches.value = [];
    const wrapper = mountWidget();
    expect(wrapper.text()).toContain("Follow a School");
    expect(wrapper.find('a[href="/schools/new"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("All caught up");
  });

  it("shows an add-a-coach CTA when schools exist but no coaches do", () => {
    mockSchools.value = [makeSchool("s1")];
    mockCoaches.value = [];
    const wrapper = mountWidget();
    expect(wrapper.text()).toContain("Add a Coach");
    expect(wrapper.find('a[href="/coaches/new"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("All caught up");
  });

  it("shows the all-caught-up message when coaches exist and none need follow-up", () => {
    mockSchools.value = [makeSchool("s1")];
    mockCoaches.value = [
      makeCoach("c1", { last_contact_date: new Date().toISOString() }),
    ];
    const wrapper = mountWidget();
    expect(wrapper.text()).toContain("All caught up");
    expect(wrapper.text()).not.toContain("Follow a School");
    expect(wrapper.text()).not.toContain("Add a Coach");
  });

  it("lists coaches needing follow-up instead of any empty state", () => {
    mockSchools.value = [makeSchool("s1")];
    mockCoaches.value = [makeCoach("c1", { last_contact_date: null })];
    const wrapper = mountWidget();
    expect(wrapper.text()).not.toContain("All caught up");
    expect(wrapper.text()).not.toContain("Follow a School");
    expect(wrapper.text()).toContain("Coach c1");
  });
});
