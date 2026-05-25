/**
 * Extended unit tests for useDocumentsConsolidated
 *
 * These tests exercise real code paths in composables/useDocumentsConsolidated.ts
 * by mocking the supabaseQuery layer and storage client. The companion
 * `useDocumentsConsolidated.spec.ts` only validates surface contracts via mocks;
 * this file drives the actual implementation for coverage.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// --- Module mocks (must precede composable import) ---

vi.mock("~/utils/supabaseQuery", () => ({
  querySelect: vi.fn(),
  querySingle: vi.fn(),
  queryInsert: vi.fn(),
  queryUpdate: vi.fn(),
  queryDelete: vi.fn(),
}));

const storageRemove = vi.fn();
const storageUpload = vi.fn();
const storageGetPublicUrl = vi.fn();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    storage: {
      from: vi.fn(() => ({
        remove: storageRemove,
        upload: storageUpload,
        getPublicUrl: storageGetPublicUrl,
      })),
    },
  }),
}));

const validateFileMock = vi.fn();
vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: () => ({
    validateFile: validateFileMock,
    fileErrors: { value: {} },
  }),
}));

vi.mock("~/composables/useErrorHandler", () => ({
  useErrorHandler: () => ({
    getErrorMessage: (err: unknown) =>
      err instanceof Error ? err.message : String(err),
    logError: vi.fn(),
  }),
}));

const posthogCapture = vi.fn();
// Override the global useNuxtApp set in tests/setup.ts so the upload path
// can record a posthog event without throwing.
(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
  $posthog: { capture: posthogCapture },
});

import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useUserStore } from "~/stores/user";
import {
  querySelect,
  querySingle,
  queryInsert,
  queryUpdate,
  queryDelete,
} from "~/utils/supabaseQuery";

const querySelectMock = vi.mocked(querySelect);
const querySingleMock = vi.mocked(querySingle);
const queryInsertMock = vi.mocked(queryInsert);
const queryUpdateMock = vi.mocked(queryUpdate);
const queryDeleteMock = vi.mocked(queryDelete);

interface MinimalDoc {
  id: string;
  user_id: string;
  title: string;
  type: string;
  file_url?: string | null;
  is_current: boolean;
  version?: number;
}

function makeDoc(overrides: Partial<MinimalDoc> = {}): MinimalDoc {
  return {
    id: "doc-1",
    user_id: "user-123",
    title: "My Doc",
    type: "resume",
    file_url: "user-123/file.pdf",
    is_current: true,
    version: 1,
    ...overrides,
  };
}

function makeFile(): File {
  return new File(["hello world"], "resume.pdf", {
    type: "application/pdf",
  });
}

describe("useDocumentsConsolidated (real implementation)", () => {
  let composable: ReturnType<typeof useDocumentsConsolidated>;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    const userStore = useUserStore();
    userStore.user = {
      id: "user-123",
      email: "test@example.com",
      role: "player",
    } as unknown as typeof userStore.user;

    // Default happy-path resolutions for storage
    storageRemove.mockResolvedValue({ data: null, error: null });
    storageUpload.mockResolvedValue({
      data: { path: "user-123/123-resume.pdf" },
      error: null,
    });
    storageGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.test/user-123/123-resume.pdf" },
    });
    validateFileMock.mockReset();

    composable = useDocumentsConsolidated();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchDocuments
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchDocuments", () => {
    it("returns empty array and sets error when user is not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const result = await c.fetchDocuments();

      expect(result).toEqual([]);
      expect(c.error.value).toBe("User not authenticated");
    });

    it("returns documents and updates state on success", async () => {
      const docs = [makeDoc({ id: "a" }), makeDoc({ id: "b" })];
      querySelectMock.mockResolvedValueOnce({ data: docs, error: null });

      const result = await composable.fetchDocuments();

      expect(result).toEqual(docs);
      expect(composable.documents.value).toEqual(docs);
      expect(composable.loading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("applies status, type, and schoolId filters", async () => {
      querySelectMock.mockResolvedValueOnce({ data: [], error: null });

      await composable.fetchDocuments({
        status: "archived",
        type: "resume",
        schoolId: "school-9",
      });

      const call = querySelectMock.mock.calls[0];
      expect(call[0]).toBe("documents");
      expect(call[1]?.filters).toMatchObject({
        user_id: "user-123",
        is_current: false,
        type: "resume",
        school_id: "school-9",
      });
    });

    it("applies is_current=true for status=current", async () => {
      querySelectMock.mockResolvedValueOnce({ data: [], error: null });

      await composable.fetchDocuments({ status: "current" });

      expect(querySelectMock.mock.calls[0][1]?.filters).toMatchObject({
        is_current: true,
      });
    });

    it("handles query error and returns empty array", async () => {
      querySelectMock.mockResolvedValueOnce({
        data: null,
        error: new Error("DB down"),
      });

      const result = await composable.fetchDocuments();

      expect(result).toEqual([]);
      expect(composable.error.value).toBe("DB down");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fetchDocumentVersions
  // ─────────────────────────────────────────────────────────────────────────

  describe("fetchDocumentVersions", () => {
    it("returns [] without query when user is not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const result = await c.fetchDocumentVersions("My Doc");

      expect(result).toEqual([]);
      expect(querySelectMock).not.toHaveBeenCalled();
    });

    it("returns versions on success", async () => {
      const versions = [makeDoc({ version: 2 }), makeDoc({ version: 1 })];
      querySelectMock.mockResolvedValueOnce({ data: versions, error: null });

      const result = await composable.fetchDocumentVersions("My Doc");

      expect(result).toEqual(versions);
      expect(querySelectMock.mock.calls[0][1]?.filters).toMatchObject({
        user_id: "user-123",
        title: "My Doc",
      });
    });

    it("returns [] when query errors", async () => {
      querySelectMock.mockResolvedValueOnce({
        data: null,
        error: new Error("boom"),
      });

      const result = await composable.fetchDocumentVersions("X");

      expect(result).toEqual([]);
    });

    it("is aliased as fetchVersions", () => {
      expect(composable.fetchVersions).toBe(composable.fetchDocumentVersions);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDocument
  // ─────────────────────────────────────────────────────────────────────────

  describe("getDocument", () => {
    it("returns document on success", async () => {
      const doc = makeDoc();
      querySingleMock.mockResolvedValueOnce({ data: doc, error: null });

      const result = await composable.getDocument("doc-1");

      expect(result).toEqual(doc);
    });

    it("returns null on error", async () => {
      querySingleMock.mockResolvedValueOnce({
        data: null,
        error: new Error("not found"),
      });

      const result = await composable.getDocument("doc-1");

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateDocument
  // ─────────────────────────────────────────────────────────────────────────

  describe("updateDocument", () => {
    it("returns null and sets error when not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const result = await c.updateDocument("doc-1", { title: "x" });

      expect(result).toBeNull();
      expect(c.error.value).toBe("User not authenticated");
    });

    it("updates in-place when document exists in state", async () => {
      const docs = [makeDoc({ id: "doc-1", title: "old" })];
      querySelectMock.mockResolvedValueOnce({ data: docs, error: null });
      await composable.fetchDocuments();

      const updated = makeDoc({ id: "doc-1", title: "new" });
      queryUpdateMock.mockResolvedValueOnce({ data: [updated], error: null });

      const result = await composable.updateDocument("doc-1", { title: "new" });

      expect(result).toEqual(updated);
      expect(composable.documents.value[0].title).toBe("new");
    });

    it("returns first record without throwing when id not in current state", async () => {
      const updated = makeDoc({ id: "doc-99" });
      queryUpdateMock.mockResolvedValueOnce({ data: [updated], error: null });

      const result = await composable.updateDocument("doc-99", { title: "x" });

      expect(result).toEqual(updated);
    });

    it("returns null and sets error on query failure", async () => {
      queryUpdateMock.mockResolvedValueOnce({
        data: null,
        error: new Error("update failed"),
      });

      const result = await composable.updateDocument("doc-1", { title: "x" });

      expect(result).toBeNull();
      expect(composable.error.value).toBe("update failed");
    });

    it("returns null when update yields empty array", async () => {
      queryUpdateMock.mockResolvedValueOnce({ data: [], error: null });

      const result = await composable.updateDocument("doc-1", { title: "x" });

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteDocument
  // ─────────────────────────────────────────────────────────────────────────

  describe("deleteDocument", () => {
    it("returns false when not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const ok = await c.deleteDocument("doc-1");

      expect(ok).toBe(false);
      expect(c.error.value).toBe("User not authenticated");
    });

    it("returns false when document lookup fails", async () => {
      querySingleMock.mockResolvedValueOnce({ data: null, error: null });

      const ok = await composable.deleteDocument("doc-1");

      expect(ok).toBe(false);
      expect(composable.error.value).toBe("Document not found");
    });

    it("deletes storage object and removes from state on success", async () => {
      const docs = [makeDoc({ id: "doc-1" }), makeDoc({ id: "doc-2" })];
      querySelectMock.mockResolvedValueOnce({ data: docs, error: null });
      await composable.fetchDocuments();

      querySingleMock.mockResolvedValueOnce({
        data: makeDoc({ id: "doc-1", file_url: "user-123/file.pdf" }),
        error: null,
      });
      queryDeleteMock.mockResolvedValueOnce({ data: null, error: null });

      const ok = await composable.deleteDocument("doc-1");

      expect(ok).toBe(true);
      expect(storageRemove).toHaveBeenCalledWith(["user-123/file.pdf"]);
      expect(composable.documents.value.map((d) => d.id)).toEqual(["doc-2"]);
    });

    it("continues with DB delete when storage removal throws", async () => {
      querySingleMock.mockResolvedValueOnce({
        data: makeDoc(),
        error: null,
      });
      storageRemove.mockRejectedValueOnce(new Error("storage gone"));
      queryDeleteMock.mockResolvedValueOnce({ data: null, error: null });

      const ok = await composable.deleteDocument("doc-1");

      expect(ok).toBe(true);
    });

    it("skips storage removal when file_url is missing", async () => {
      querySingleMock.mockResolvedValueOnce({
        data: makeDoc({ file_url: null }),
        error: null,
      });
      queryDeleteMock.mockResolvedValueOnce({ data: null, error: null });

      const ok = await composable.deleteDocument("doc-1");

      expect(ok).toBe(true);
      expect(storageRemove).not.toHaveBeenCalled();
    });

    it("returns false when DB delete errors", async () => {
      querySingleMock.mockResolvedValueOnce({ data: makeDoc(), error: null });
      queryDeleteMock.mockResolvedValueOnce({
        data: null,
        error: new Error("FK violation"),
      });

      const ok = await composable.deleteDocument("doc-1");

      expect(ok).toBe(false);
      expect(composable.error.value).toBe("FK violation");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // uploadDocument
  // ─────────────────────────────────────────────────────────────────────────

  describe("uploadDocument", () => {
    it("returns error object when not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const res = await c.uploadDocument(makeFile(), "resume", "Title");

      expect(res).toEqual({ success: false, error: "User not authenticated" });
    });

    it("returns error when file validation throws", async () => {
      validateFileMock.mockImplementationOnce(() => {
        throw new Error("too big");
      });

      const res = await composable.uploadDocument(
        makeFile(),
        "resume",
        "Title",
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("too big");
      expect(composable.uploadError.value).toBe("too big");
    });

    it("uploads file, creates record, and prepends to state", async () => {
      const newDoc = makeDoc({ id: "new-doc" });
      queryInsertMock.mockResolvedValueOnce({ data: [newDoc], error: null });

      const res = await composable.uploadDocument(
        makeFile(),
        "resume",
        "Resume",
        "desc",
      );

      expect(res.success).toBe(true);
      expect(res.data).toEqual(newDoc);
      expect(storageUpload).toHaveBeenCalledTimes(1);
      expect(composable.documents.value[0]).toEqual(newDoc);
      expect(posthogCapture).toHaveBeenCalledWith("document_uploaded", {
        document_type: "resume",
      });
      expect(composable.isUploading.value).toBe(false);
    });

    it("handles non-array insert response (single record)", async () => {
      const newDoc = makeDoc({ id: "solo" });
      queryInsertMock.mockResolvedValueOnce({ data: newDoc, error: null });

      const res = await composable.uploadDocument(makeFile(), "resume", "T");

      expect(res.success).toBe(true);
      expect(res.data).toEqual(newDoc);
    });

    it("returns error when storage upload fails", async () => {
      storageUpload.mockResolvedValueOnce({
        data: null,
        error: new Error("storage 500"),
      });

      const res = await composable.uploadDocument(makeFile(), "resume", "T");

      expect(res.success).toBe(false);
      expect(res.error).toBe("storage 500");
      expect(composable.uploadError.value).toBe("storage 500");
    });

    it("returns error when DB insert fails", async () => {
      queryInsertMock.mockResolvedValueOnce({
        data: null,
        error: new Error("insert failed"),
      });

      const res = await composable.uploadDocument(makeFile(), "resume", "T");

      expect(res.success).toBe(false);
      expect(res.error).toBe("insert failed");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // uploadNewVersion
  // ─────────────────────────────────────────────────────────────────────────

  describe("uploadNewVersion", () => {
    it("returns error when not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const res = await c.uploadNewVersion("doc-1", makeFile());

      expect(res).toEqual({ success: false, error: "User not authenticated" });
    });

    it("returns error when original document not found", async () => {
      querySingleMock.mockResolvedValueOnce({ data: null, error: null });

      const res = await composable.uploadNewVersion("doc-1", makeFile());

      expect(res).toEqual({ success: false, error: "Document not found" });
    });

    it("creates new version, archives old, prepends to state", async () => {
      const original = makeDoc({ id: "doc-1", version: 2 });
      // getDocument
      querySingleMock.mockResolvedValueOnce({ data: original, error: null });
      // updateDocument call (mark old as archived)
      queryUpdateMock.mockResolvedValueOnce({
        data: [{ ...original, is_current: false }],
        error: null,
      });
      const newVersion = makeDoc({ id: "doc-2", version: 3 });
      queryInsertMock.mockResolvedValueOnce({
        data: [newVersion],
        error: null,
      });

      const res = await composable.uploadNewVersion("doc-1", makeFile());

      expect(res.success).toBe(true);
      expect(res.data).toEqual(newVersion);
      expect(composable.documents.value[0]).toEqual(newVersion);
    });

    it("returns error when storage upload fails for new version", async () => {
      querySingleMock.mockResolvedValueOnce({ data: makeDoc(), error: null });
      queryUpdateMock.mockResolvedValueOnce({ data: [makeDoc()], error: null });
      storageUpload.mockResolvedValueOnce({
        data: null,
        error: new Error("storage err"),
      });

      const res = await composable.uploadNewVersion("doc-1", makeFile());

      expect(res.success).toBe(false);
      expect(res.error).toBe("storage err");
    });

    it("returns error when validateFile throws", async () => {
      querySingleMock.mockResolvedValueOnce({ data: makeDoc(), error: null });
      validateFileMock.mockImplementationOnce(() => {
        throw new Error("bad type");
      });

      const res = await composable.uploadNewVersion("doc-1", makeFile());

      expect(res.success).toBe(false);
      expect(res.error).toBe("bad type");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // shareDocument / revokeAccess
  // ─────────────────────────────────────────────────────────────────────────

  describe("shareDocument", () => {
    it("returns null when not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const result = await c.shareDocument("doc-1", ["s-1"]);

      expect(result).toBeNull();
      expect(c.sharingError.value).toBe("User not authenticated");
    });

    it("returns updated document on success", async () => {
      const updated = makeDoc({ id: "doc-1" });
      queryUpdateMock.mockResolvedValueOnce({ data: [updated], error: null });

      const result = await composable.shareDocument("doc-1", ["s-1", "s-2"]);

      expect(result).toEqual(updated);
      expect(composable.isSharing.value).toBe(false);
    });

    it("returns null and sets sharingError on failure", async () => {
      queryUpdateMock.mockResolvedValueOnce({
        data: null,
        error: new Error("perm denied"),
      });

      const result = await composable.shareDocument("doc-1", ["s-1"]);

      expect(result).toBeNull();
      expect(composable.sharingError.value).toBe("perm denied");
    });
  });

  describe("revokeAccess", () => {
    it("returns null when not authenticated", async () => {
      const store = useUserStore();
      store.user = null;
      const c = useDocumentsConsolidated();

      const result = await c.revokeAccess("doc-1", ["s-1"]);

      expect(result).toBeNull();
      expect(c.sharingError.value).toBe("User not authenticated");
    });

    it("returns updated document on success", async () => {
      const updated = makeDoc({ id: "doc-1" });
      queryUpdateMock.mockResolvedValueOnce({ data: [updated], error: null });

      const result = await composable.revokeAccess("doc-1", []);

      expect(result).toEqual(updated);
    });

    it("returns null on failure", async () => {
      queryUpdateMock.mockResolvedValueOnce({
        data: null,
        error: new Error("fail"),
      });

      const result = await composable.revokeAccess("doc-1", []);

      expect(result).toBeNull();
      expect(composable.sharingError.value).toBe("fail");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Computed properties
  // ─────────────────────────────────────────────────────────────────────────

  describe("computed state", () => {
    it("groups documents by type", async () => {
      const docs = [
        makeDoc({ id: "1", type: "resume" }),
        makeDoc({ id: "2", type: "resume" }),
        makeDoc({ id: "3", type: "transcript" }),
      ];
      querySelectMock.mockResolvedValueOnce({ data: docs, error: null });
      await composable.fetchDocuments();

      expect(Object.keys(composable.documentsByType.value).sort()).toEqual([
        "resume",
        "transcript",
      ]);
      expect(composable.documentsByType.value.resume).toHaveLength(2);
    });

    it("splits current vs archived documents", async () => {
      const docs = [
        makeDoc({ id: "1", is_current: true }),
        makeDoc({ id: "2", is_current: false }),
        makeDoc({ id: "3", is_current: true }),
      ];
      querySelectMock.mockResolvedValueOnce({ data: docs, error: null });
      await composable.fetchDocuments();

      expect(composable.currentDocuments.value.map((d) => d.id)).toEqual([
        "1",
        "3",
      ]);
      expect(composable.archivedDocuments.value.map((d) => d.id)).toEqual([
        "2",
      ]);
    });

    it("combines error state across fetch / upload / sharing", () => {
      expect(composable.allErrors.value).toBeNull();
      composable.error.value = "fetch err";
      expect(composable.allErrors.value).toBe("fetch err");
      composable.error.value = null;
      composable.uploadError.value = "upload err";
      expect(composable.allErrors.value).toBe("upload err");
      composable.uploadError.value = null;
      composable.sharingError.value = "share err";
      expect(composable.allErrors.value).toBe("share err");
    });

    it("combines loading state across operations", () => {
      expect(composable.isLoading.value).toBe(false);
      composable.loading.value = true;
      expect(composable.isLoading.value).toBe(true);
      composable.loading.value = false;
      composable.isUploading.value = true;
      expect(composable.isLoading.value).toBe(true);
      composable.isUploading.value = false;
      composable.isSharing.value = true;
      expect(composable.isLoading.value).toBe(true);
    });

    it("exposes a stable read-only documents computed", () => {
      expect(composable.documents.value).toEqual([]);
    });
  });
});
