import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import MissingInfoStep from "~/components/Communication/MissingInfoStep.vue";
import type { ChannelController } from "~/composables/useQuickCommunication";
import type { MissingInfoField } from "~/utils/communication/missingInfo";

const NuxtLinkStub = {
  name: "NuxtLink",
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};
const stubs = { NuxtLink: NuxtLinkStub, UIcon: true };

/** Minimal controller stub exposing only what MissingInfoStep reads. */
function stubController(
  fields: MissingInfoField[],
  over: Partial<ChannelController> = {},
): ChannelController {
  return {
    questionnaireDraft: ref(false),
    intendedMajorDraft: ref(""),
    authored: ref<Record<string, string>>({}),
    missingInfoFields: computed(() => fields),
    ...over,
  } as unknown as ChannelController;
}

function mountStep(
  fields: MissingInfoField[],
  props: Partial<{ canEditProfile: boolean; athleteName: string }> = {},
  controllerOver: Partial<ChannelController> = {},
) {
  const channel = stubController(fields, controllerOver);
  const wrapper = mount(MissingInfoStep, {
    props: {
      channel,
      canEditProfile: props.canEditProfile ?? true,
      athleteName: props.athleteName ?? "Jordan",
    },
    global: { stubs },
  });
  return { wrapper, channel };
}

const boolean: MissingInfoField = {
  id: "questionnaireNote",
  title: "Recruiting questionnaire",
  prompt: "Did you complete it?",
  editor: { kind: "boolean" },
  editableByParent: true,
};
const majorField: MissingInfoField = {
  id: "intendedMajor",
  title: "Intended major",
  prompt: "What will you study?",
  editor: { kind: "text", multiline: false },
  editableByParent: true,
};
const programField: MissingInfoField = {
  id: "programNote",
  title: "Why this program?",
  prompt: "",
  editor: { kind: "text", multiline: true },
  editableByParent: false,
};
const metricField: MissingInfoField = {
  id: "metrics",
  title: "Add a performance metric",
  prompt: "",
  editor: { kind: "metricLink" },
  editableByParent: true,
};
const profileField: MissingInfoField = {
  id: "hsCoachName",
  title: "HS coach",
  prompt: "",
  editor: { kind: "profileLink" },
  editableByParent: true,
};

describe("MissingInfoStep", () => {
  it("renders a boolean row bound to questionnaireDraft", async () => {
    const { wrapper, channel } = mountStep([boolean]);
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Yes, I completed it")!
      .trigger("click");
    expect(channel.questionnaireDraft.value).toBe(true);
  });

  it("binds the intendedMajor text input to intendedMajorDraft", async () => {
    const { wrapper, channel } = mountStep([majorField]);
    await wrapper.find("input[type='text']").setValue("Biology");
    expect(channel.intendedMajorDraft.value).toBe("Biology");
  });

  it("binds a multiline authored row to the authored map", async () => {
    const { wrapper, channel } = mountStep([programField]);
    await wrapper.find("textarea").setValue("Great pitching staff");
    expect(channel.authored.value.programNote).toBe("Great pitching staff");
  });

  it("renders a metricLink to /performance and a profileLink to the profile editor", () => {
    const { wrapper } = mountStep([metricField, profileField]);
    const hrefs = wrapper.findAll("a").map((a) => a.attributes("href"));
    expect(hrefs).toContain("/performance");
    expect(hrefs).toContain("/settings/player-details");
  });

  it("locks a specificity row for a parent with an ask-the-athlete note", () => {
    const { wrapper } = mountStep([programField], {
      canEditProfile: false,
      athleteName: "Sam",
    });
    expect(wrapper.text()).toContain("Ask Sam to add this");
    expect(wrapper.find("textarea").exists()).toBe(false);
  });

  it("leaves the specificity row editable for the athlete", () => {
    const { wrapper } = mountStep([programField], { canEditProfile: true });
    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Ask ");
  });

  it("emits continue and back", async () => {
    const { wrapper } = mountStep([boolean]);
    await wrapper.findAll("button").find((b) => b.text() === "Continue")!.trigger("click");
    await wrapper.findAll("button").find((b) => b.text() === "Back")!.trigger("click");
    expect(wrapper.emitted("continue")).toHaveLength(1);
    expect(wrapper.emitted("back")).toHaveLength(1);
  });
});
