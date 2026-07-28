import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type { School, Document } from "~/types/models";

// Mock composables
const mockGetSchool = vi.fn();
const mockUpdateSchool = vi.fn();
const mockFetchDocuments = vi.fn();
const mockUploadDocument = vi.fn();
const mockShareDocument = vi.fn();

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    getSchool: mockGetSchool,
    updateSchool: mockUpdateSchool,
    loading: { value: false },
    error: { value: null },
  }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: { value: [] },
    fetchCoaches: vi.fn(),
  }),
}));

vi.mock("~/composables/useDocuments", () => ({
  useDocuments: () => ({
    documents: { value: [] },
    fetchDocuments: mockFetchDocuments,
  }),
}));

vi.mock("~/composables/useDocumentUpload", () => ({
  useDocumentUpload: () => ({
    uploadDocument: mockUploadDocument,
    uploadProgress: { value: 0 },
    uploadError: { value: null },
    isUploading: { value: false },
  }),
}));

vi.mock("~/composables/useDocumentSharing", () => ({
  useDocumentSharing: () => ({
    shareDocument: mockShareDocument,
  }),
}));

vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: () => ({
    validateFile: vi.fn(),
    fileErrors: { value: null },
  }),
}));

vi.mock("~/composables/useSchoolLogos", () => ({
  useSchoolLogos: () => ({
    fetchSchoolLogo: vi.fn(),
  }),
}));

vi.mock("~/composables/useCollegeData", () => ({
  useCollegeData: () => ({
    fetchByName: vi.fn(),
    loading: { value: false },
    error: { value: null },
  }),
}));

vi.mock("~/composables/useUserPreferences", () => ({
  useUserPreferences: () => ({
    homeLocation: { value: null },
    fetchPreferences: vi.fn(),
  }),
}));

// Mock router
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "school-123" } }),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock app functions
vi.mock("#app", () => ({
  navigateTo: vi.fn(),
}));

// Mock stores
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "user-1", email: "test@example.com" },
  }),
}));

// Mock components
vi.mock("~/components/Header.vue", () => ({
  default: { name: "Header", template: "<div>Header</div>" },
}));

vi.mock("~/components/School/SchoolLogo.vue", () => ({
  default: {
    name: "SchoolLogo",
    props: ["school", "size", "fetchOnMount"],
    template: "<div>Logo</div>",
  },
}));

vi.mock("~/components/School/SchoolMap.vue", () => ({
  default: { name: "SchoolMap", props: ["school"], template: "<div>Map</div>" },
}));

vi.mock("~/components/School/DocumentUploadModal.vue", () => ({
  default: {
    name: "DocumentUploadModal",
    props: ["schoolId"],
    template: "<div>DocumentUploadModal</div>",
  },
}));

describe("School Detail Page - Document Upload", () => {
  const schoolId = "school-123";

  const mockSchool: School = {
    id: schoolId,
    user_id: "user-1",
    name: "Test University",
    location: "Test City, State",
    status: "researching",
    is_favorite: false,
    website: "https://example.com",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockGetSchool.mockResolvedValue(mockSchool);
    mockUpdateSchool.mockResolvedValue(mockSchool);
    mockFetchDocuments.mockResolvedValue(undefined);
  });

  // "Document Upload Modal Integration" and the "should share document with
  // current school after upload" test below were removed here: both only
  // asserted `expect(mockXxx).toBeDefined()` on a function the test itself
  // created, which can never fail. Writing a real test requires more than a
  // local fix — the page (pages/schools/[id]/index.vue) now sources
  // documents/upload/share from useDocumentsConsolidated, but
  // useDocuments/useDocumentUpload/useDocumentSharing (mocked above) are
  // either gone (useDocuments.ts no longer exists) or unused by this page.
  // A real assertion needs the mocks updated to useDocumentsConsolidated AND
  // the actual page mounted with its current child components (e.g.
  // SchoolDocumentsCard, which now owns the upload/share UI instead of the
  // DocumentUploadModal mocked in this file) — a larger rewrite of this
  // spec's fixtures than this remediation pass covers.

  describe("Document Filtering for School", () => {
    it("should filter documents by shared_with_schools array", async () => {
      const mockDocuments: Document[] = [
        {
          id: "doc-1",
          user_id: "user-1",
          type: "resume",
          title: "My Resume",
          file_url: "https://example.com/resume.pdf",
          is_current: true,
          shared_with_schools: [schoolId],
        },
        {
          id: "doc-2",
          user_id: "user-1",
          type: "highlight_video",
          title: "Highlights",
          file_url: "https://example.com/video.mp4",
          is_current: true,
          shared_with_schools: ["other-school-id"],
        },
        {
          id: "doc-3",
          user_id: "user-1",
          type: "transcript",
          title: "Transcript",
          file_url: "https://example.com/transcript.pdf",
          is_current: true,
          shared_with_schools: [],
        },
      ];

      // Filter documents where schoolId is in shared_with_schools array
      const schoolDocuments = mockDocuments.filter((doc: Document) =>
        (doc.shared_with_schools as string[] | undefined)?.includes(schoolId),
      );

      expect(schoolDocuments).toHaveLength(1);
      expect(schoolDocuments[0].id).toBe("doc-1");
      expect(schoolDocuments[0].shared_with_schools).toContain(schoolId);
    });

    it('should show "no documents" message when no documents are shared', async () => {
      const mockDocuments: Document[] = [
        {
          id: "doc-1",
          user_id: "user-1",
          type: "resume",
          title: "My Resume",
          file_url: "https://example.com/resume.pdf",
          is_current: true,
          shared_with_schools: ["other-school-id"],
        },
      ];

      const schoolDocuments = mockDocuments.filter((doc: Document) =>
        (doc.shared_with_schools as string[] | undefined)?.includes(schoolId),
      );

      expect(schoolDocuments).toHaveLength(0);
    });

    it("should display multiple documents if multiple are shared with school", async () => {
      const mockDocuments: Document[] = [
        {
          id: "doc-1",
          user_id: "user-1",
          type: "resume",
          title: "My Resume",
          file_url: "https://example.com/resume.pdf",
          is_current: true,
          shared_with_schools: [schoolId],
        },
        {
          id: "doc-2",
          user_id: "user-1",
          type: "highlight_video",
          title: "Highlights",
          file_url: "https://example.com/video.mp4",
          is_current: true,
          shared_with_schools: [schoolId],
        },
      ];

      const schoolDocuments = mockDocuments.filter((doc: Document) =>
        (doc.shared_with_schools as string[] | undefined)?.includes(schoolId),
      );

      expect(schoolDocuments).toHaveLength(2);
    });
  });

  // "should maintain document metadata when sharing" was also removed here:
  // it only asserted an object literal against the same literal's own field
  // values (self-referential, cannot fail), and never called shareDocument.
  // Real metadata-preservation coverage for shareDocument already exists in
  // tests/unit/composables/useDocumentsConsolidated.spec.ts, so this was a
  // tautological duplicate rather than a gap to fill.
});
