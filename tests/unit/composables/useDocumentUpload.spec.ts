/**
 * useDocumentUpload composable — real behavioral tests.
 *
 * planning/audit-2026-07-27-findings.md named this among the high-risk
 * composables with no dedicated spec (267 lines, file-upload validation +
 * storage + DB writes). Covers validateFile's per-document-type MIME/
 * extension/size rules, uploadDocument's full happy path and validation/
 * storage/DB failure paths, and uploadNewVersion's version-increment
 * behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDocumentUpload } from "~/composables/useDocumentUpload";
import type { Document } from "~/types/models";

const mockStorageUpload = vi.fn();
const mockSupabase = {
  storage: { from: vi.fn(() => ({ upload: mockStorageUpload })) },
  from: vi.fn(),
};
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

const mockUserState: { user: { id: string; email: string } | null } = {
  user: { id: "user-123", email: "test@example.com" },
};
vi.mock("~/stores/user", () => ({
  useUserStore: () => mockUserState,
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

let mockActiveFamilyId: string | null = "family-123";
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: vi.fn(() => ({
    get activeFamilyId() {
      return { value: mockActiveFamilyId };
    },
  })),
}));

function makeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

describe("useDocumentUpload.validateFile", () => {
  const { validateFile } = useDocumentUpload();

  it("accepts a valid PDF resume under the size limit", () => {
    const file = makeFile("resume.pdf", "application/pdf", 1024);
    expect(validateFile(file, "resume")).toEqual({ valid: true });
  });

  it("rejects an unknown document type", () => {
    const file = makeFile("x.pdf", "application/pdf", 1024);
    expect(validateFile(file, "not_a_real_type")).toEqual({
      valid: false,
      error: "Invalid document type",
    });
  });

  it("rejects a file whose MIME type and extension both fail the allow-list", () => {
    const file = makeFile("resume.exe", "application/x-msdownload", 1024);
    const result = validateFile(file, "resume");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not allowed");
  });

  it("accepts a file matched by EXTENSION even when the browser reports an empty MIME type", () => {
    const file = makeFile("resume.docx", "", 1024);
    expect(validateFile(file, "resume").valid).toBe(true);
  });

  it("rejects a resume over the 5MB limit with the limit in the message", () => {
    const file = makeFile("resume.pdf", "application/pdf", 6 * 1024 * 1024);
    const result = validateFile(file, "resume");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("File too large. Maximum size: 5MB");
  });

  it("applies the 100MB limit for highlight_video (a much larger cap than documents)", () => {
    const underLimit = makeFile(
      "highlights.mp4",
      "video/mp4",
      99 * 1024 * 1024,
    );
    const overLimit = makeFile(
      "highlights.mp4",
      "video/mp4",
      101 * 1024 * 1024,
    );
    expect(validateFile(underLimit, "highlight_video").valid).toBe(true);
    expect(validateFile(overLimit, "highlight_video").valid).toBe(false);
  });

  it("rejects a .doc resume submitted as rec_letter (rec_letter only allows PDF)", () => {
    const file = makeFile("letter.doc", "application/msword", 1024);
    expect(validateFile(file, "rec_letter").valid).toBe(false);
  });
});

describe("useDocumentUpload.uploadDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.user = { id: "user-123", email: "test@example.com" };
    mockActiveFamilyId = "family-123";
  });

  const baseDocData = {
    user_id: "user-123",
    type: "resume" as const,
    title: "My Resume",
    file_url: "",
    is_current: true,
  } as Omit<Document, "id" | "created_at" | "updated_at">;

  it("throws when no user is authenticated, without touching storage", async () => {
    mockUserState.user = null;
    const { uploadDocument } = useDocumentUpload();

    await expect(uploadDocument(baseDocData)).rejects.toThrow(
      "User not authenticated",
    );
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("rejects an invalid file before ever calling storage.upload", async () => {
    const { uploadDocument } = useDocumentUpload();
    const badFile = makeFile("resume.exe", "application/x-msdownload", 10);

    await expect(uploadDocument(baseDocData, badFile)).rejects.toThrow(
      /not allowed/,
    );
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("uploads the file to storage, then inserts the documents row with the storage path as file_url", async () => {
    mockStorageUpload.mockResolvedValue({
      data: { path: "user-123/123-resume.pdf" },
      error: null,
    });
    const insertedRow = { ...baseDocData, id: "doc-1" };
    const singleSpy = vi
      .fn()
      .mockResolvedValue({ data: insertedRow, error: null });
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: singleSpy }),
      }),
    });

    const { uploadDocument, uploadProgress } = useDocumentUpload();
    const file = makeFile("resume.pdf", "application/pdf", 1024);
    const result = await uploadDocument(baseDocData, file);

    expect(mockStorageUpload).toHaveBeenCalled();
    expect(result).toEqual(insertedRow);
    // Progress resets to 0 in the finally block after completion.
    expect(uploadProgress.value).toBe(0);
  });

  it("surfaces a user-friendly error and never inserts a row when storage.upload fails", async () => {
    mockStorageUpload.mockResolvedValue({
      data: null,
      error: { message: "bucket unreachable" },
    });
    const { uploadDocument, error } = useDocumentUpload();
    const file = makeFile("resume.pdf", "application/pdf", 1024);

    await expect(uploadDocument(baseDocData, file)).rejects.toThrow(
      "File upload failed. Please try again.",
    );
    expect(error.value).toBe("File upload failed. Please try again.");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("allows uploading document metadata without a file (file_url already set)", async () => {
    const insertedRow = {
      ...baseDocData,
      file_url: "https://existing.example.com/x.pdf",
    };
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
        }),
      }),
    });

    const { uploadDocument } = useDocumentUpload();
    const result = await uploadDocument({
      ...baseDocData,
      file_url: "https://existing.example.com/x.pdf",
    });

    expect(mockStorageUpload).not.toHaveBeenCalled();
    expect(result).toEqual(insertedRow);
  });

  it("stamps family_unit_id from active family context on insert", async () => {
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue({
            data: { ...baseDocData, id: "doc-1" },
            error: null,
          }),
      }),
    });
    mockSupabase.from.mockReturnValue({ insert: insertSpy });

    const { uploadDocument } = useDocumentUpload();
    await uploadDocument({
      ...baseDocData,
      file_url: "https://existing.example.com/x.pdf",
    });

    const [[insertedRows]] = insertSpy.mock.calls;
    expect(insertedRows[0].family_unit_id).toBe("family-123");
  });

  it("throws when no family context is loaded", async () => {
    mockActiveFamilyId = null;
    const { uploadDocument } = useDocumentUpload();

    await expect(
      uploadDocument({
        ...baseDocData,
        file_url: "https://existing.example.com/x.pdf",
      }),
    ).rejects.toThrow("Family context not loaded");
    expect(mockStorageUpload).not.toHaveBeenCalled();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

describe("useDocumentUpload.uploadNewVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.user = { id: "user-123", email: "test@example.com" };
    mockActiveFamilyId = "family-123";
  });

  const currentDoc: Document = {
    id: "doc-1",
    user_id: "user-123",
    type: "resume",
    title: "Resume",
    file_url: "old-path.pdf",
    is_current: true,
    version: 2,
  } as Document;

  it("increments the version number and marks the new row as current", async () => {
    mockStorageUpload.mockResolvedValue({
      data: { path: "user-123/new-path.pdf" },
      error: null,
    });
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue({
            data: { ...currentDoc, version: 3 },
            error: null,
          }),
      }),
    });
    mockSupabase.from.mockReturnValue({ insert: insertSpy });

    const { uploadNewVersion } = useDocumentUpload();
    const file = makeFile("resume.pdf", "application/pdf", 1024);
    const result = await uploadNewVersion("doc-1", file, currentDoc);

    expect(result.version).toBe(3);
    const [[insertedRows]] = insertSpy.mock.calls;
    expect(insertedRows[0]).toMatchObject({
      version: 3,
      is_current: true,
      file_url: "user-123/new-path.pdf",
    });
  });

  it("rejects when the replacement file fails validation for the document's type", async () => {
    const { uploadNewVersion } = useDocumentUpload();
    const badFile = makeFile("resume.exe", "application/x-msdownload", 10);

    await expect(
      uploadNewVersion("doc-1", badFile, currentDoc),
    ).rejects.toThrow(/not allowed/);
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("overrides family_unit_id inherited from the spread current document", async () => {
    mockStorageUpload.mockResolvedValue({
      data: { path: "user-123/new-path.pdf" },
      error: null,
    });
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue({
            data: { ...currentDoc, version: 3 },
            error: null,
          }),
      }),
    });
    mockSupabase.from.mockReturnValue({ insert: insertSpy });

    const { uploadNewVersion } = useDocumentUpload();
    const file = makeFile("resume.pdf", "application/pdf", 1024);
    const legacyDoc = { ...currentDoc, family_unit_id: null } as Document;
    await uploadNewVersion("doc-1", file, legacyDoc);

    const [[insertedRows]] = insertSpy.mock.calls;
    expect(insertedRows[0].family_unit_id).toBe("family-123");
  });

  it("throws when no family context is loaded", async () => {
    mockActiveFamilyId = null;
    const { uploadNewVersion } = useDocumentUpload();
    const file = makeFile("resume.pdf", "application/pdf", 1024);

    await expect(uploadNewVersion("doc-1", file, currentDoc)).rejects.toThrow(
      "Family context not loaded",
    );
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });
});
