import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import DocumentsIndexPage from "~/pages/documents/index.vue";
import DocumentCard from "~/components/DocumentCard.vue";
import { useUserStore } from "~/stores/user";

// Regression test for the "double confirmation" bug: DocumentCard gates
// deletion behind its own DesignSystemConfirmDialog and only emits
// `delete` once the user has confirmed. The page must NOT show a second
// confirmation dialog before performing the delete — that would force
// the user to confirm twice for one action. A test that stubs out
// DocumentCard would not catch this, so DocumentCard is mounted for real.

const showToastMock = vi.fn();
const deleteDocumentMock = vi.fn();

const mockDocuments = [
  {
    id: "doc-1",
    title: "Highlight Reel",
    type: "highlight_video",
    school_id: null,
    version: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    shared_with_schools: [],
  },
];

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: showToastMock }),
}));

vi.mock("~/composables/useDocumentsConsolidated", () => ({
  useDocumentsConsolidated: () => ({
    documents: ref(mockDocuments),
    loading: ref(false),
    error: ref(null),
    fetchDocuments: vi.fn().mockResolvedValue(undefined),
    deleteDocument: deleteDocumentMock,
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: ref([]),
    fetchSchools: vi.fn().mockResolvedValue(undefined),
  }),
}));

import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

describe("pages/documents/index.vue - delete confirmation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteDocumentMock.mockResolvedValue(true);
    setActivePinia(createPinia());
    const userStore = useUserStore();
    userStore.user = { id: "user-1", email: "test@example.com" } as any;
  });

  const mountPage = () =>
    mount(DocumentsIndexPage, {
      global: {
        components: { DocumentCard, DesignSystemConfirmDialog },
        stubs: {
          NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
          PageHeader: {
            template: "<div><slot name=\"actions\" /></div>",
          },
          FilterPanel: {
            template: "<div><slot name=\"chips\" /><slot name=\"filter\" /></div>",
          },
          DesignSystemFilterChips: true,
        },
      },
    });

  it("deletes after a single confirmation with no second dialog", async () => {
    const wrapper = mountPage();
    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    // Only DocumentCard's own dialog should exist before any interaction.
    const card = wrapper.findComponent(DocumentCard);
    expect(card.exists()).toBe(true);

    // Click delete on the card -> opens DocumentCard's own confirm dialog.
    const deleteButton = card
      .findAll("button")
      .find((b) => b.text().includes("Delete"));
    expect(deleteButton).toBeDefined();
    await deleteButton!.trigger("click");
    await wrapper.vm.$nextTick();

    const dialogs = wrapper.findAllComponents(DesignSystemConfirmDialog);
    const openDialogs = dialogs.filter((d) => d.props("isOpen") === true);
    expect(openDialogs.length).toBe(1);

    // Confirm once inside DocumentCard's dialog.
    const confirmButton = openDialogs[0]
      .findAll("button")
      .find((b) => b.text().includes("Delete"));
    await confirmButton!.trigger("click");
    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    // Exactly one delete call, and no second dialog appeared afterward.
    expect(deleteDocumentMock).toHaveBeenCalledTimes(1);
    expect(deleteDocumentMock).toHaveBeenCalledWith("doc-1");

    const dialogsAfter = wrapper.findAllComponents(DesignSystemConfirmDialog);
    const openAfter = dialogsAfter.filter((d) => d.props("isOpen") === true);
    expect(openAfter.length).toBe(0);
  });

  it("shows a generic error toast (not raw error text) when delete fails", async () => {
    deleteDocumentMock.mockRejectedValue(
      new Error("permission denied for table documents"),
    );
    const wrapper = mountPage();
    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    const card = wrapper.findComponent(DocumentCard);
    const deleteButton = card
      .findAll("button")
      .find((b) => b.text().includes("Delete"));
    await deleteButton!.trigger("click");
    await wrapper.vm.$nextTick();

    const dialog = wrapper
      .findAllComponents(DesignSystemConfirmDialog)
      .find((d) => d.props("isOpen") === true)!;
    const confirmButton = dialog
      .findAll("button")
      .find((b) => b.text().includes("Delete"));
    await confirmButton!.trigger("click");
    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 0));

    expect(showToastMock).toHaveBeenCalledTimes(1);
    const [message, type] = showToastMock.mock.calls[0];
    expect(type).toBe("error");
    expect(message).not.toMatch(/permission denied|table documents/i);
  });
});
