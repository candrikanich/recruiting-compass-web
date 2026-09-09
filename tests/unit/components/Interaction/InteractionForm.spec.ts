import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: () => ({ fieldErrors: {} }),
}));

import InteractionForm from "~/components/Interaction/InteractionForm.vue";

const SchoolSelectStub = { name: "SchoolSelect", template: "<div />" };
const CoachSelectStub = { name: "CoachSelect", template: "<div />" };
const AddCoachModalStub = {
  name: "CoachAddCoachModal",
  props: ["show", "schoolId", "senderName", "senderEmail"],
  template: "<div />",
};
const OtherCoachModalStub = {
  name: "CoachOtherCoachModal",
  template: "<div />",
};
const InterestCalibrationStub = {
  name: "InterestCalibration",
  template: "<div />",
};
const FileUploadStub = { name: "FileUpload", template: "<div />" };
const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

const GLOBAL_STUBS = {
  SchoolSelect: SchoolSelectStub,
  CoachSelect: CoachSelectStub,
  CoachAddCoachModal: AddCoachModalStub,
  CoachOtherCoachModal: OtherCoachModalStub,
  InterestCalibration: InterestCalibrationStub,
  FileUpload: FileUploadStub,
  NuxtLink: NuxtLinkStub,
};

describe("components/Interaction/InteractionForm.vue", () => {
  it("passes senderName/senderEmail through to the add-coach modal", () => {
    const wrapper = mount(InteractionForm, {
      props: {
        loading: false,
        senderName: "Mark Royer",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: GLOBAL_STUBS },
    });

    const modal = wrapper.findComponent(AddCoachModalStub);
    expect(modal.props("senderName")).toBe("Mark Royer");
    expect(modal.props("senderEmail")).toBe("mroyer@osu.edu");
  });

  it("shows an 'Add it' school link with returnTo + prefillWebsite when draftReturnTo is set", () => {
    const wrapper = mount(InteractionForm, {
      props: {
        loading: false,
        draftReturnTo: "/interactions/add?draftId=draft-1",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: GLOBAL_STUBS },
    });

    const link = wrapper.find("[data-testid='add-school-link']");
    expect(link.exists()).toBe(true);
    const href = link.attributes("href") ?? "";
    expect(href).toContain(
      "returnTo=%2Finteractions%2Fadd%3FdraftId%3Ddraft-1",
    );
    expect(href).toContain("prefillWebsite=https%3A%2F%2Fosu.edu");
  });

  it("hides the 'Add it' school link outside the draft-review flow", () => {
    const wrapper = mount(InteractionForm, {
      props: { loading: false },
      global: { stubs: GLOBAL_STUBS },
    });

    expect(wrapper.find("[data-testid='add-school-link']").exists()).toBe(
      false,
    );
  });
});
