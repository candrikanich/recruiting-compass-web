import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import MessageComposer from "~/components/Communication/MessageComposer.vue";
import type {
  ChannelController,
  CommChannel,
  PreviewSegment,
} from "~/composables/useQuickCommunication";
import type { Coach, CommunicationTemplate } from "~/types/models";

// useFocusTrap is auto-imported in the app; stub it so mount() doesn't touch the DOM trap.
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

/** Minimal template so the variables panel + template dropdown render. */
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
    selectedTemplateId: ref(""),
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
    saveField: vi.fn(),
    reresolve: vi.fn(),
    send: vi.fn().mockResolvedValue(true),
    onClose: vi.fn(),
    ...overrides,
  };
}

const stubs = { UIcon: true, Teleport: true };

function mountComposer(channel: ChannelController) {
  return mount(MessageComposer, {
    props: {
      channel,
      coach,
      showAddMetricCta: false,
      open: true,
      logInteraction: true,
    },
    global: { stubs },
  });
}

describe("MessageComposer", () => {
  it("renders the email composer with a subject field and Send Email action", () => {
    const wrapper = mountComposer(buildController("email"));
    expect(wrapper.text()).toContain("Send Email to Dana");
    expect(wrapper.find('input[placeholder="Email subject..."]').exists()).toBe(true);
  });

  it("hides the subject field and shows the SMS counter for the text channel", () => {
    const wrapper = mountComposer(buildController("text"));
    expect(wrapper.find('input[placeholder="Email subject..."]').exists()).toBe(false);
    expect(wrapper.text()).toContain("/160");
    expect(wrapper.text()).toContain("SMS limited to 160 characters");
  });

  it("renders the live preview segments, marking unresolved tokens", () => {
    const wrapper = mountComposer(buildController("email"));
    const strong = wrapper.find("strong");
    expect(strong.exists()).toBe(true);
    expect(strong.text()).toBe("{{coachName}}");
  });

  it("disables Send while required tokens remain unresolved", () => {
    const ch = buildController("email", { unresolved: computed(() => ["coachName"]) });
    const wrapper = mountComposer(ch);
    const sendBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Send Email");
    expect(sendBtn?.attributes("disabled")).toBeDefined();
  });

  it("sends and closes the drawer on a successful send", async () => {
    const ch = buildController("email");
    const wrapper = mountComposer(ch);
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Send Email")!
      .trigger("click");
    expect(ch.send).toHaveBeenCalledOnce();
    // send() resolved true -> drawer requests close + clears authored
    expect(ch.onClose).toHaveBeenCalledOnce();
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]);
  });

  it("does not close when send is blocked (returns false)", async () => {
    const ch = buildController("email", { send: vi.fn().mockResolvedValue(false) });
    const wrapper = mountComposer(ch);
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Send Email")!
      .trigger("click");
    expect(ch.send).toHaveBeenCalledOnce();
    expect(ch.onClose).not.toHaveBeenCalled();
    expect(wrapper.emitted("update:open")).toBeUndefined();
  });
});
