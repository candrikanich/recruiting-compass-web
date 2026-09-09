import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

const createCoachMock = vi.fn();

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({ createCoach: createCoachMock }),
}));

vi.mock("~/composables/useFocusTrap", () => ({
  useFocusTrap: () => ({ activate: vi.fn(), deactivate: vi.fn() }),
}));

import AddCoachModal from "~/components/Coach/AddCoachModal.vue";

describe("components/Coach/AddCoachModal.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills first/last name and email from sender info when opened", async () => {
    const wrapper = mount(AddCoachModal, {
      props: {
        show: true,
        schoolId: "school-1",
        senderName: "Mark Royer",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: { Teleport: true } },
    });
    await wrapper.vm.$nextTick();

    expect((wrapper.find("#firstName").element as HTMLInputElement).value).toBe(
      "Mark",
    );
    expect((wrapper.find("#lastName").element as HTMLInputElement).value).toBe(
      "Royer",
    );
    expect((wrapper.find("#email").element as HTMLInputElement).value).toBe(
      "mroyer@osu.edu",
    );
  });

  it("submits the prefilled email as part of the new coach", async () => {
    createCoachMock.mockResolvedValue({ id: "coach-new-1" });
    const wrapper = mount(AddCoachModal, {
      props: {
        show: true,
        schoolId: "school-1",
        senderName: "Mark Royer",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: { Teleport: true } },
    });
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(createCoachMock).toHaveBeenCalledWith(
      "school-1",
      expect.objectContaining({ email: "mroyer@osu.edu" }),
    );
  });

  it("opens empty when no sender info is provided (manual add-coach flow)", async () => {
    const wrapper = mount(AddCoachModal, {
      props: { show: true, schoolId: "school-1" },
      global: { stubs: { Teleport: true } },
    });
    await wrapper.vm.$nextTick();

    expect((wrapper.find("#firstName").element as HTMLInputElement).value).toBe(
      "",
    );
    expect((wrapper.find("#email").element as HTMLInputElement).value).toBe("");
  });
});
