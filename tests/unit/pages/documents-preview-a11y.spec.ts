import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const imageDocument = {
  id: "doc-1",
  title: "Highlight Reel Screenshot",
  type: "other",
  file_type: "image/png",
  file_url: "https://example.test/doc-1.png",
  school_id: null,
  version: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const documents = ref<any[]>([imageDocument]);

vi.mock("~/composables/useDocumentsConsolidated", () => ({
  useDocumentsConsolidated: () => ({
    documents,
    loading: ref(false),
    error: ref(null),
    fetchDocuments: vi.fn().mockResolvedValue(undefined),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    fetchVersions: vi.fn().mockResolvedValue([]),
    shareDocument: vi.fn(),
    revokeAccess: vi.fn(),
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: ref([]),
    fetchSchools: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("~/composables/useErrorHandler", () => ({
  useErrorHandler: () => ({
    getErrorMessage: (e: unknown) => String(e),
    logError: vi.fn(),
  }),
}));

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("vue-router", async () => {
  const actual = await vi.importActual<any>("vue-router");
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useRoute: () => ({ params: { id: "doc-1" }, query: { id: "doc-1" } }),
  };
});

const globalOptions = {
  stubs: {
    NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
    VideoPlayer: true,
    DesignSystemConfirmDialog: true,
    FileUpload: true,
  },
};

describe("document preview accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documents.value = [imageDocument];
  });

  it.each([
    ["pages/documents/[id].vue", () => import("~/pages/documents/[id].vue")],
    ["pages/documents/view.vue", () => import("~/pages/documents/view.vue")],
  ])(
    "%s describes the preview image with the document title",
    async (_name, load) => {
      const component = (await load()).default;
      const wrapper = mount(component, { global: globalOptions });
      await wrapper.vm.$nextTick();

      const image = wrapper.find("img");
      expect(image.exists()).toBe(true);
      expect(image.attributes("alt")).toBe(
        "Preview of Highlight Reel Screenshot",
      );
    },
  );

  it.each([
    ["pages/documents/[id].vue", () => import("~/pages/documents/[id].vue")],
    ["pages/documents/view.vue", () => import("~/pages/documents/view.vue")],
  ])("%s names the PDF preview frame", async (_name, load) => {
    documents.value = [
      { ...imageDocument, file_type: "application/pdf", title: "Transcript" },
    ];
    const component = (await load()).default;
    const wrapper = mount(component, { global: globalOptions });
    await wrapper.vm.$nextTick();

    const frame = wrapper.find("iframe");
    expect(frame.exists()).toBe(true);
    expect(frame.attributes("title")).toBe("PDF preview of Transcript");
  });
});
