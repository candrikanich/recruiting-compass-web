import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import EditCoachModal from "~/components/EditCoachModal.vue";
import type { Coach } from "~/types/models";

describe("EditCoachModal.vue Tags + Source", () => {
  let hostElement: HTMLElement;

  const coach: Coach = {
    id: "coach-123",
    school_id: "school-123",
    user_id: "user-123",
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john.smith@university.edu",
    phone: "555-1234",
    twitter_handle: "@coachsmith",
    instagram_handle: "coachsmith",
    notes: "Great head coach",
    tags: ["Football"],
    source: "LinkedIn",
    last_contact_date: "2024-01-15T12:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    hostElement = document.createElement("div");
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    document.body.removeChild(hostElement);
  });

  it("shows the source value and a chip for each existing tag", () => {
    const wrapper = mount(EditCoachModal, {
      props: {
        coach,
        isOpen: true,
        updateFn: vi.fn().mockResolvedValue(coach),
      },
      attachTo: hostElement,
    });

    const sourceInput = document.querySelector(
      "#source",
    ) as HTMLInputElement | null;
    expect(sourceInput?.value).toBe("LinkedIn");
    expect(document.body.textContent).toContain("Football");

    wrapper.unmount();
  });

  it("includes tags and source in the update payload on save", async () => {
    const updateFn = vi.fn().mockResolvedValue(coach);
    const wrapper = mount(EditCoachModal, {
      props: {
        coach,
        isOpen: true,
        updateFn,
      },
      attachTo: hostElement,
    });

    const form = document.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(updateFn).toHaveBeenCalledWith(
      "coach-123",
      expect.objectContaining({
        tags: ["Football"],
        source: "LinkedIn",
      }),
    );

    wrapper.unmount();
  });
});
