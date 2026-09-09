import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";

const mockShowToast = vi.fn();
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: mockShowToast }),
}));

const mockFetchDrafts = vi.fn().mockResolvedValue(undefined);
const mockConfirmDraft = vi.fn();
const mockDiscardDraft = vi.fn();
const drafts = ref<Array<Record<string, unknown>>>([]);

vi.mock("~/composables/useInboundDrafts", () => ({
  useInboundDrafts: () => ({
    drafts,
    loading: ref(false),
    error: ref(null),
    fetchDrafts: mockFetchDrafts,
    confirmDraft: mockConfirmDraft,
    discardDraft: mockDiscardDraft,
  }),
}));

import InboundDraftsPage from "~/pages/inbox/inbound-drafts.vue";

const mockNavigateTo = vi.fn();

function mountPage() {
  return mount(InboundDraftsPage, {
    global: {
      stubs: {
        DesignSystemLoadingState: true,
        DesignSystemErrorState: true,
        DesignSystemEmptyState: true,
        DesignSystemCard: { template: "<div><slot /></div>" },
        DesignSystemButton: { template: "<button @click=\"$emit('click')\"><slot /></button>" },
      },
    },
  });
}

describe("inbox/inbound-drafts page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.navigateTo = mockNavigateTo;
    drafts.value = [
      {
        id: "draft-1",
        sender_name: "Coach Smith",
        sender_email: "coach@example.com",
        subject: "Fwd: Camp",
        body_text: "hi",
        matched_school_id: "school-1",
      },
    ];
  });

  it("navigates to the interaction review form with the draft id when Confirm is clicked", async () => {
    const wrapper = mountPage();
    const buttons = wrapper.findAll("button");
    await buttons[0]!.trigger("click");
    await flushPromises();
    expect(mockNavigateTo).toHaveBeenCalledWith("/interactions/add?draftId=draft-1");
    expect(mockConfirmDraft).not.toHaveBeenCalled();
  });

  it("navigates to review even when the draft has no matched school yet", async () => {
    drafts.value = [{ id: "draft-2", subject: "Fwd: Info", body_text: "hi", matched_school_id: null }];
    const wrapper = mountPage();
    const buttons = wrapper.findAll("button");
    await buttons[0]!.trigger("click");
    await flushPromises();
    expect(mockNavigateTo).toHaveBeenCalledWith("/interactions/add?draftId=draft-2");
  });

  it("shows an error toast when discarding a draft fails", async () => {
    mockDiscardDraft.mockRejectedValue(new Error("boom"));
    const wrapper = mountPage();
    const buttons = wrapper.findAll("button");
    await buttons[1]!.trigger("click");
    await flushPromises();
    expect(mockShowToast).toHaveBeenCalledWith(
      "Failed to discard this draft. Please try again.",
      "error",
    );
  });
});
