import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import AssignCoachModal from "~/components/profile/AssignCoachModal.vue";
import type { ProfileLead } from "~/composables/useProfileContacts";
import type { Coach, School } from "~/types/models";

const createCoach = vi
  .fn()
  .mockResolvedValue({ id: "coach-new", school_id: "s1" });
const createInteraction = vi.fn().mockResolvedValue({ id: "int-1" });
const resolveLead = vi.fn().mockResolvedValue(undefined);
const fetchCoaches = vi.fn().mockResolvedValue(undefined);
const fetchSchools = vi.fn().mockResolvedValue(undefined);

// Mutable so each test can seed the store's exposed state before mount —
// captured by reference when the component's `useCoachStore()`/`useSchoolStore()`
// call reads them during setup, matching Pinia's real (unwrapped) shape.
let mockCoaches: Coach[] = [];
let mockSchools: Pick<School, "id" | "name">[] = [];

vi.mock("~/stores/coaches", () => ({
  useCoachStore: () => ({
    createCoach,
    coaches: mockCoaches,
    fetchCoaches,
  }),
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({ createInteraction }),
}));

vi.mock("~/composables/useProfileContacts", () => ({
  useProfileContacts: () => ({
    resolveLead,
    dismissLead: vi.fn(),
    leads: { value: [] },
    counts: { value: {} },
    loading: { value: false },
    error: { value: null },
    fetchContacts: vi.fn(),
  }),
}));

vi.mock("~/stores/schools", () => ({
  useSchoolStore: () => ({
    schools: mockSchools,
    fetchSchools,
  }),
}));

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({
    activeFamilyId: { value: "family-1" },
  }),
}));

const lead: ProfileLead = {
  id: "lead-1",
  type: "contact",
  coach_name: "Jane Smith",
  coach_email: "jane@school.edu",
  coach_title: "Head Coach",
  school_name: "State U",
  program: null,
  note: "Loved your film",
  matched_coach_id: null,
  status: "pending",
  interaction_id: null,
  created_at: "2026-08-27",
};

const flush = () => new Promise((r) => setTimeout(r));

describe("AssignCoachModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoaches = [];
    mockSchools = [];
  });

  it("creates a coach + inbound interaction then resolves the lead", async () => {
    const wrapper = mount(AssignCoachModal, {
      props: { lead, presetSchoolId: "s1" },
      global: { stubs: { teleport: true } },
    });
    await wrapper.get('[data-test="create-new-coach"]').trigger("click");
    await wrapper.get('[data-test="confirm-assign"]').trigger("click");
    await flush();

    expect(createCoach).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@school.edu",
      }),
    );
    expect(createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        coach_id: "coach-new",
        school_id: "s1",
        direction: "inbound",
        type: "email",
      }),
    );
    expect(resolveLead).toHaveBeenCalledWith("lead-1", "int-1");
    expect(wrapper.emitted("resolved")).toBeTruthy();
  });

  it("links an existing coach + inbound interaction then resolves the lead", async () => {
    mockCoaches = [
      {
        id: "coach-existing",
        school_id: "s1",
        role: "head",
        first_name: "Existing",
        last_name: "Coach",
        email: null,
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
        notes: null,
        tags: [],
        source: null,
        last_contact_date: null,
      },
    ];

    const wrapper = mount(AssignCoachModal, {
      props: { lead, presetSchoolId: "s1" },
      global: { stubs: { teleport: true } },
    });
    await flush();

    await wrapper
      .get('[data-test="existing-coach-select"]')
      .setValue("coach-existing");
    await wrapper.get('[data-test="confirm-assign"]').trigger("click");
    await flush();

    expect(createCoach).not.toHaveBeenCalled();
    expect(createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        coach_id: "coach-existing",
        school_id: "s1",
        direction: "inbound",
        type: "email",
      }),
    );
    expect(resolveLead).toHaveBeenCalledWith("lead-1", "int-1");
    expect(wrapper.emitted("resolved")).toBeTruthy();
  });

  it("resolves lead.school_name to a matching school on mount when no presetSchoolId is given", async () => {
    mockSchools = [{ id: "s-matched", name: "state u" }];

    const wrapper = mount(AssignCoachModal, {
      props: { lead },
      global: { stubs: { teleport: true } },
    });
    await flush();
    await flush();

    expect(fetchSchools).toHaveBeenCalledWith("family-1");
    expect(
      (wrapper.get('[data-test="school-select"]').element as HTMLSelectElement)
        .value,
    ).toBe("s-matched");

    await wrapper.get('[data-test="create-new-coach"]').trigger("click");
    await wrapper.get('[data-test="confirm-assign"]').trigger("click");
    await flush();

    expect(createCoach).toHaveBeenCalledWith(
      "s-matched",
      expect.objectContaining({ first_name: "Jane", last_name: "Smith" }),
    );
    expect(createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ school_id: "s-matched" }),
    );
  });
});
