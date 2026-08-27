import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AssignCoachModal from "~/components/profile/AssignCoachModal.vue";
import type { ProfileLead } from "~/composables/useProfileContacts";

const createCoach = vi.fn().mockResolvedValue({ id: "coach-new", school_id: "s1" });
const createInteraction = vi.fn().mockResolvedValue({ id: "int-1" });
const resolveLead = vi.fn().mockResolvedValue(undefined);
const fetchCoaches = vi.fn().mockResolvedValue(undefined);
const fetchSchools = vi.fn().mockResolvedValue(undefined);

vi.mock("~/stores/coaches", () => ({
  useCoachStore: () => ({
    createCoach,
    coaches: [],
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
    schools: [],
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

describe("AssignCoachModal", () => {
  it("creates a coach + inbound interaction then resolves the lead", async () => {
    const wrapper = mount(AssignCoachModal, {
      props: { lead, presetSchoolId: "s1" },
      global: { stubs: { teleport: true } },
    });
    await wrapper.get('[data-test="create-new-coach"]').trigger("click");
    await wrapper.get('[data-test="confirm-assign"]').trigger("click");
    await new Promise((r) => setTimeout(r));

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
});
