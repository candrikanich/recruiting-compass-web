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

function mountPage() {
  return mount(InboundDraftsPage, {
    global: {
      stubs: {
        DesignSystemLoadingState: true,
        DesignSystemErrorState: true,
        DesignSystemEmptyState: true,
        DesignSystemCard: { template: "<div><slot /></div>" },
        DesignSystemButton: {
          template: "<button @click=\"$emit('click')\"><slot /></button>",
        },
        SchoolSelect: true,
      },
    },
  });
}

describe("inbox/inbound-drafts page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("shows an error toast when confirming a draft fails", async () => {
    mockConfirmDraft.mockRejectedValue(new Error("boom"));
    const wrapper = mountPage();
    const buttons = wrapper.findAll("button");
    await buttons[0]!.trigger("click");
    await flushPromises();
    expect(mockShowToast).toHaveBeenCalledWith(
      "Failed to confirm this draft. Please try again.",
      "error",
    );
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

  it("does not toast when confirm succeeds", async () => {
    mockConfirmDraft.mockResolvedValue(undefined);
    const wrapper = mountPage();
    const buttons = wrapper.findAll("button");
    await buttons[0]!.trigger("click");
    await flushPromises();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
