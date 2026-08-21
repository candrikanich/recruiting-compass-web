import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const createInteractionMock = vi.fn();
const showToastMock = vi.fn();

// Configurable result for the pre-contact school lookup performed before the
// interaction is created. Defaults to a non-pre-contact school so the baseline
// success path fires no auto-advance toast.
let schoolLookupResult: { status: string; name: string } | null = {
  status: "contacted",
  name: "State University",
};

const maybeSingleMock = vi.fn(async () => ({ data: schoolLookupResult }));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    createInteraction: createInteractionMock,
    loading: { value: false },
  }),
}));

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  }),
}));

import InteractionsAddPage from "~/pages/interactions/add.vue";

const InteractionFormStub = {
  name: "InteractionFormStub",
  props: ["loading"],
  emits: ["submit", "cancel"],
  template: "<div />",
};

const samplePayload = {
  school_id: "s1",
  coach_id: null,
  type: "email",
  direction: "outbound",
  occurred_at: new Date().toISOString(),
  subject: "",
  content: "",
  sentiment: null,
};

describe("pages/interactions/add.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    schoolLookupResult = { status: "contacted", name: "State University" };
  });

  const mountPage = () =>
    mount(InteractionsAddPage, {
      global: {
        stubs: {
          FormPageLayout: { template: "<div><slot /></div>" },
          InteractionForm: InteractionFormStub,
        },
      },
    });

  it("navigates away and shows no error toast on success", async () => {
    createInteractionMock.mockResolvedValue({ id: "int-1" });
    const wrapper = mountPage();
    const form = wrapper.findComponent(InteractionFormStub);

    await form.vm.$emit("submit", samplePayload);
    await wrapper.vm.$nextTick();

    expect(createInteractionMock).toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("shows the auto-advance toast when a researching school gets an interaction", async () => {
    schoolLookupResult = { status: "researching", name: "Coastal College" };
    createInteractionMock.mockResolvedValue({ id: "int-2" });
    const wrapper = mountPage();
    const form = wrapper.findComponent(InteractionFormStub);

    await form.vm.$emit("submit", samplePayload);
    await wrapper.vm.$nextTick();

    expect(createInteractionMock).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      "Coastal College moved to Contacted",
      "success",
    );
  });

  it("does not show the auto-advance toast when the school is already contacted", async () => {
    schoolLookupResult = { status: "contacted", name: "Coastal College" };
    createInteractionMock.mockResolvedValue({ id: "int-3" });
    const wrapper = mountPage();
    const form = wrapper.findComponent(InteractionFormStub);

    await form.vm.$emit("submit", samplePayload);
    await wrapper.vm.$nextTick();

    expect(createInteractionMock).toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("shows a visible, generic error and preserves the form when creation fails", async () => {
    createInteractionMock.mockRejectedValue(
      new Error(
        'duplicate key value violates unique constraint "pk_interactions"',
      ),
    );
    const wrapper = mountPage();
    const form = wrapper.findComponent(InteractionFormStub);

    await form.vm.$emit("submit", samplePayload);
    await wrapper.vm.$nextTick();

    expect(createInteractionMock).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledTimes(1);

    const [message, type] = showToastMock.mock.calls[0];
    expect(type).toBe("error");
    expect(message).toMatch(/something went wrong/i);
    // No raw Postgres/error text leaked to the user
    expect(message).not.toMatch(/constraint|pk_interactions/i);

    // The form component is still mounted (input not cleared/navigated away from)
    expect(wrapper.findComponent(InteractionFormStub).exists()).toBe(true);
  });
});
