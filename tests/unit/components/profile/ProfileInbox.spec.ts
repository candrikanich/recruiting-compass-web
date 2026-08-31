import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import ProfileInbox from "~/components/profile/ProfileInbox.vue";
import type {
  ProfileLead,
  ProfileContactCounts,
} from "~/composables/useProfileContacts";

const mockFetchContacts = vi.fn();
const mockResolveLead = vi.fn();
const mockDismissLead = vi.fn().mockResolvedValue(undefined);
const state = {
  leads: ref<ProfileLead[]>([]),
  counts: ref<ProfileContactCounts>({
    interestThisMonth: 0,
    contactThisMonth: 0,
    totalThisMonth: 0,
  }),
  loading: ref(false),
  error: ref<string | null>(null),
};

vi.mock("~/composables/useProfileContacts", () => ({
  useProfileContacts: () => ({
    leads: state.leads,
    counts: state.counts,
    loading: state.loading,
    error: state.error,
    fetchContacts: mockFetchContacts,
    resolveLead: mockResolveLead,
    dismissLead: mockDismissLead,
  }),
}));

const stubs = {
  DesignSystemEmptyState: {
    template: "<div>EMPTY: {{ title }}</div>",
    props: ["title", "description"],
  },
  DesignSystemLoadingState: { template: "<div>LOADING</div>" },
  DesignSystemErrorState: {
    template: "<div>ERROR: {{ error }}</div>",
    props: ["error"],
  },
  DesignSystemBadge: {
    template: "<span><slot /></span>",
    props: ["color", "variant", "size"],
  },
  AssignCoachModal: true,
  NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
};

const sampleLead: ProfileLead = {
  id: "lead-1",
  type: "interest",
  coach_name: "Coach Smith",
  coach_email: "coach@school.edu",
  coach_title: "Head Coach",
  school_name: "State University",
  program: "Baseball",
  note: "Loved your highlight film and would like to schedule a call.",
  matched_coach_id: null,
  status: "pending",
  interaction_id: null,
  created_at: "2026-08-01T00:00:00.000Z",
};

describe("ProfileInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.leads.value = [];
    state.counts.value = {
      interestThisMonth: 0,
      contactThisMonth: 0,
      totalThisMonth: 0,
    };
    state.loading.value = false;
    state.error.value = null;
  });

  it("renders monthly stat tiles from counts", () => {
    state.counts.value = {
      interestThisMonth: 4,
      contactThisMonth: 2,
      totalThisMonth: 6,
    };
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).toContain("4");
    expect(w.text()).toContain("2");
  });

  it("renders a row per lead with coach name, program, school, and note excerpt", () => {
    state.leads.value = [sampleLead];
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).toContain("Coach Smith");
    expect(w.text()).toContain("Baseball");
    expect(w.text()).toContain("State University");
    expect(w.text()).toContain("Loved your highlight film");
  });

  it("shows the loading state while loading", () => {
    state.loading.value = true;
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).toContain("LOADING");
  });

  it("shows the error state and retries via fetchContacts", async () => {
    state.error.value = "Failed to load your inbox. Please try again.";
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).toContain("Failed to load your inbox");
  });

  it("shows an empty state when not loading and there are no leads", () => {
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).toContain("EMPTY");
    expect(w.text()).toContain("No leads yet");
  });

  it("shows a Needs coach badge and an Assign coach action for pending leads", () => {
    state.leads.value = [sampleLead];
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).toContain("Needs coach");
    expect(w.find('[data-test="assign-coach-lead-1"]').exists()).toBe(true);
  });

  it("calls dismissLead when Dismiss is clicked", async () => {
    state.leads.value = [sampleLead];
    const w = mount(ProfileInbox, { global: { stubs } });
    await w.get('[data-test="dismiss-lead-1"]').trigger("click");
    expect(mockDismissLead).toHaveBeenCalledWith("lead-1");
  });

  it("shows a Tracked badge and a link to the interaction for resolved leads", () => {
    state.leads.value = [
      { ...sampleLead, status: "resolved", interaction_id: "interaction-9" },
    ];
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).toContain("Tracked");
    const link = w.find('a[href="/interactions/interaction-9"]');
    expect(link.exists()).toBe(true);
  });

  it("hides dismissed leads by default and shows them when the filter is switched to All", async () => {
    state.leads.value = [{ ...sampleLead, status: "dismissed" }];
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.text()).not.toContain("Coach Smith");

    await w.get('[data-test="filter-all"]').trigger("click");
    expect(w.text()).toContain("Coach Smith");
  });

  it("opens AssignCoachModal for the clicked lead when Assign coach is clicked", async () => {
    state.leads.value = [sampleLead];
    const w = mount(ProfileInbox, { global: { stubs } });
    expect(w.findComponent({ name: "AssignCoachModal" }).exists()).toBe(false);

    await w.get('[data-test="assign-coach-lead-1"]').trigger("click");
    expect(w.findComponent({ name: "AssignCoachModal" }).exists()).toBe(true);
  });
});
