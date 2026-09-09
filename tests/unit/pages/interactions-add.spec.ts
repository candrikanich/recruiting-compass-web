import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
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

// add.vue calls useRoute() from vue-router and reads route.query. Mock it here
// so the page never depends on a router context leaked from another spec file
// (that hidden cross-file dependency made this suite order-dependent).
let routeQuery: Record<string, string> = {};
vi.mock("vue-router", () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), go: vi.fn() }),
}));

const mockFetchDrafts = vi.fn().mockResolvedValue(undefined);
const mockConfirmDraft = vi.fn().mockResolvedValue(undefined);
const draftsRef = ref<Array<Record<string, unknown>>>([]);
vi.mock("~/composables/useInboundDrafts", () => ({
  useInboundDrafts: () => ({
    drafts: draftsRef,
    fetchDrafts: mockFetchDrafts,
    confirmDraft: mockConfirmDraft,
  }),
}));

import { navigateTo } from "#app";
import InteractionsAddPage from "~/pages/interactions/add.vue";

const mockNavigateTo = vi.mocked(navigateTo);

const InteractionFormStub = {
  name: "InteractionFormStub",
  props: [
    "loading",
    "initialData",
    "senderName",
    "senderEmail",
    "draftReturnTo",
  ],
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
    routeQuery = {};
    draftsRef.value = [];
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

  describe("reviewing an inbound draft (?draftId=)", () => {
    beforeEach(() => {
      routeQuery = { draftId: "draft-1" };
      draftsRef.value = [
        {
          id: "draft-1",
          matched_school_id: "school-1",
          matched_coach_id: "coach-1",
          subject: "Fwd: Camp",
          body_text: "Come to our camp",
          occurred_at: "2026-09-02T15:15:00.000Z",
        },
      ];
    });

    it("prefills the form from the matched draft's parsed fields", async () => {
      const wrapper = mountPage();
      await flushPromises();
      const form = wrapper.findComponent(InteractionFormStub);
      expect(form.props("initialData")).toMatchObject({
        school_id: "school-1",
        coach_id: "coach-1",
        type: "email",
        direction: "inbound",
        subject: "Fwd: Camp",
        content: "Come to our camp",
        occurred_at: "2026-09-02T15:15:00.000Z",
      });
    });

    it("confirms the draft with the reviewed field overrides on submit, instead of creating a bare interaction", async () => {
      const wrapper = mountPage();
      await flushPromises();
      const form = wrapper.findComponent(InteractionFormStub);

      await form.vm.$emit("submit", {
        school_id: "school-1",
        coach_id: "coach-1",
        type: "phone_call",
        direction: "outbound",
        occurred_at: "2026-09-03T10:00",
        subject: "Edited subject",
        content: "Edited content",
        sentiment: null,
      });
      await flushPromises();

      expect(mockConfirmDraft).toHaveBeenCalledWith("draft-1", {
        schoolId: "school-1",
        coachId: "coach-1",
        type: "phone_call",
        direction: "outbound",
        occurredAt: new Date("2026-09-03T10:00").toISOString(),
        subject: "Edited subject",
        content: "Edited content",
      });
      expect(createInteractionMock).not.toHaveBeenCalled();
      expect(mockNavigateTo).toHaveBeenCalledWith("/inbox/inbound-drafts");
    });

    it("shows an error toast and keeps the form when confirming the draft fails", async () => {
      mockConfirmDraft.mockRejectedValueOnce(new Error("boom"));
      const wrapper = mountPage();
      await flushPromises();
      const form = wrapper.findComponent(InteractionFormStub);

      await form.vm.$emit("submit", samplePayload);
      await flushPromises();

      expect(showToastMock).toHaveBeenCalledWith(
        "Something went wrong logging this interaction. Please try again.",
        "error",
      );
      expect(wrapper.findComponent(InteractionFormStub).exists()).toBe(true);
    });
  });

  describe("draft review with an unmatched school", () => {
    const draft = {
      id: "draft-1",
      matched_school_id: null,
      matched_coach_id: null,
      sender_name: "Mark Royer",
      sender_email: "mroyer@osu.edu",
      subject: "Recruiting interest",
      body_text: "Hi, we're interested in your son.",
      occurred_at: new Date().toISOString(),
    };

    beforeEach(() => {
      routeQuery = { draftId: "draft-1" };
      draftsRef.value = [draft];
    });

    it("passes sender info and a draftReturnTo pointing back at this draft", async () => {
      const wrapper = mountPage();
      await flushPromises();

      const form = wrapper.findComponent(InteractionFormStub);
      expect(form.props("senderName")).toBe("Mark Royer");
      expect(form.props("senderEmail")).toBe("mroyer@osu.edu");
      expect(form.props("draftReturnTo")).toBe(
        "/interactions/add?draftId=draft-1",
      );
    });

    it("overrides the draft's school with a schoolId returned from /schools/new", async () => {
      routeQuery = { draftId: "draft-1", schoolId: "school-new-1" };
      const wrapper = mountPage();
      await flushPromises();

      const form = wrapper.findComponent(InteractionFormStub);
      expect((form.props("initialData") as any).school_id).toBe(
        "school-new-1",
      );
    });
  });
});
