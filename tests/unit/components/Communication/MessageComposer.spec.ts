import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import MessageComposer from "~/components/Communication/MessageComposer.vue";
import type {
  ChannelController,
  CommChannel,
  PreviewSegment,
} from "~/composables/useQuickCommunication";
import type { MissingInfoField } from "~/utils/communication/missingInfo";
import type { Coach, CommunicationTemplate } from "~/types/models";

vi.mock("~/composables/useFocusTrap", () => ({
  useFocusTrap: () => ({ activate: vi.fn(), deactivate: vi.fn() }),
}));

const coach = {
  id: "coach-1",
  first_name: "Dana",
  last_name: "Reed",
  email: "dana@school.edu",
  phone: "5551234567",
} as Coach;

const template = {
  id: "t1",
  name: "Intro",
  slug: "intro",
  type: "email",
  subject: "Hi",
  body: "Hello {{coachName}}",
} as unknown as CommunicationTemplate;

function buildController(
  channel: CommChannel,
  overrides: Partial<ChannelController> = {},
): ChannelController {
  const segments: PreviewSegment[] = [
    { text: "Hello ", unresolved: false },
    { text: "{{coachName}}", unresolved: true },
  ];
  return {
    channel,
    selectedTemplateId: ref("t1"),
    selectedTemplateObj: ref(template),
    composer: ref({ subject: "Hi", body: "Hello {{coachName}}" }),
    resolvedValues: ref({}),
    inputs: ref({}),
    authored: ref({}),
    sendWarning: ref(""),
    savingKey: ref(null),
    saveErrors: ref({}),
    templates: computed(() => [template]),
    variableRows: computed(() => []),
    previewSegments: computed(() => segments),
    unresolved: computed(() => []),
    missingInfoFields: computed<MissingInfoField[]>(() => []),
    hasMissingInfo: computed(() => false),
    questionnaireDraft: ref(false),
    intendedMajorDraft: ref(""),
    commitMissingInfo: vi.fn().mockResolvedValue(undefined),
    saveField: vi.fn(),
    reresolve: vi.fn(),
    send: vi.fn().mockResolvedValue(true),
    onClose: vi.fn(),
    ...overrides,
  };
}

const MissingInfoStub = {
  name: "CommunicationMissingInfoStep",
  emits: ["continue", "back"],
  template:
    '<div class="mi-step"><button class="mi-continue" @click="$emit(\'continue\')">C</button><button class="mi-back" @click="$emit(\'back\')">B</button></div>',
};
const stubs = {
  UIcon: true,
  Teleport: true,
  CommunicationMissingInfoStep: MissingInfoStub,
};

function mountComposer(channel: ChannelController) {
  return mount(MessageComposer, {
    props: {
      channel,
      coach,
      canEditProfile: true,
      athleteName: "Jordan",
      open: true,
      logInteraction: true,
    },
    global: { stubs },
  });
}

const btn = (wrapper: ReturnType<typeof mountComposer>, text: string) =>
  wrapper.findAll("button").find((b) => b.text() === text);

describe("MessageComposer", () => {
  it("starts on the compose stage with subject + a Continue button (email)", () => {
    const wrapper = mountComposer(buildController("email"));
    expect(wrapper.text()).toContain("Send Email to Dana");
    expect(wrapper.find('input[placeholder="Email subject..."]').exists()).toBe(
      true,
    );
    expect(btn(wrapper, "Continue")).toBeTruthy();
    expect(btn(wrapper, "Send Email")).toBeFalsy();
  });

  it("hides the subject and shows the SMS counter for the text channel", () => {
    const wrapper = mountComposer(buildController("text"));
    expect(wrapper.find('input[placeholder="Email subject..."]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain("/480");
  });

  it("skips the info stage straight to preview when nothing is missing", async () => {
    const wrapper = mountComposer(buildController("email"));
    await btn(wrapper, "Continue")!.trigger("click");
    expect(btn(wrapper, "Send Email")).toBeTruthy();
    expect(wrapper.find("strong").text()).toBe("{{coachName}}");
    expect(wrapper.find(".mi-step").exists()).toBe(false);
  });

  it("routes through the info stage when something is missing, then to preview", async () => {
    const ch = buildController("email", {
      hasMissingInfo: computed(() => true),
    });
    const wrapper = mountComposer(ch);
    await btn(wrapper, "Continue")!.trigger("click");
    expect(wrapper.find(".mi-step").exists()).toBe(true);
    await wrapper.find(".mi-continue").trigger("click");
    expect(ch.commitMissingInfo).toHaveBeenCalledOnce();
    expect(btn(wrapper, "Send Email")).toBeTruthy();
  });

  it("info-stage Back returns to compose", async () => {
    const wrapper = mountComposer(
      buildController("email", { hasMissingInfo: computed(() => true) }),
    );
    await btn(wrapper, "Continue")!.trigger("click");
    await wrapper.find(".mi-back").trigger("click");
    expect(wrapper.find('input[placeholder="Email subject..."]').exists()).toBe(
      true,
    );
    expect(wrapper.find(".mi-step").exists()).toBe(false);
  });

  it("disables Send in preview while required tokens remain unresolved", async () => {
    const wrapper = mountComposer(
      buildController("email", { unresolved: computed(() => ["coachName"]) }),
    );
    await btn(wrapper, "Continue")!.trigger("click");
    expect(btn(wrapper, "Send Email")?.attributes("disabled")).toBeDefined();
  });

  it("sends and closes the drawer from preview on a successful send", async () => {
    const ch = buildController("email");
    const wrapper = mountComposer(ch);
    await btn(wrapper, "Continue")!.trigger("click");
    await btn(wrapper, "Send Email")!.trigger("click");
    expect(ch.send).toHaveBeenCalledOnce();
    expect(ch.onClose).toHaveBeenCalledOnce();
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]);
  });

  it("does not close when send is blocked (returns false)", async () => {
    const ch = buildController("email", {
      send: vi.fn().mockResolvedValue(false),
    });
    const wrapper = mountComposer(ch);
    await btn(wrapper, "Continue")!.trigger("click");
    await btn(wrapper, "Send Email")!.trigger("click");
    expect(ch.send).toHaveBeenCalledOnce();
    expect(ch.onClose).not.toHaveBeenCalled();
  });
});
