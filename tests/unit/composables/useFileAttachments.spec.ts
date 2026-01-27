import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFileAttachments } from "~/composables/useFileAttachments";

// Mock Supabase
const mockSupabase = {
  storage: {
    from: vi.fn(function (bucket: string) {
      return {
        upload: vi.fn().mockResolvedValue({ error: null }),
        download: vi.fn().mockResolvedValue({
          data: new Blob(["content"]),
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://example.com/${bucket}/${path}` },
        })),
      };
    }),
  },
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "user-123" },
  }),
}));

describe("useFileAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Core Functionality - Upload", () => {
    it("should upload files successfully", async () => {
      const { uploadAttachments } = useFileAttachments();
      const files = [new File(["content"], "test.pdf", { type: "application/pdf" })];

      const urls = await uploadAttachments("interaction-123", files);

      expect(urls).toHaveLength(1);
      expect(urls[0]).toContain("interaction-attachments");
    });

    it("should track upload progress", async () => {
      const { uploadAttachments, uploadProgress } = useFileAttachments();
      const files = [
        new File(["content"], "file1.pdf", { type: "application/pdf" }),
        new File(["content"], "file2.pdf", { type: "application/pdf" }),
      ];

      uploadAttachments("interaction-123", files);
      // Progress should update during upload
      expect(uploadProgress.value).toBeDefined();
    });

    it("should set uploading state during upload", async () => {
      const { uploadAttachments, uploading } = useFileAttachments();
      const files = [new File(["content"], "test.pdf", { type: "application/pdf" })];

      const uploadPromise = uploadAttachments("interaction-123", files);
      // While uploading, state should be true or update
      await uploadPromise;
      // After upload, should be false
      expect(uploading.value).toBe(false);
    });

    it("should return empty array for no files", async () => {
      const { uploadAttachments } = useFileAttachments();
      const urls = await uploadAttachments("interaction-123", []);

      expect(urls).toEqual([]);
    });

    it("should create unique file paths for each file", async () => {
      const { uploadAttachments } = useFileAttachments();
      const files = [
        new File(["content1"], "file1.pdf", { type: "application/pdf" }),
        new File(["content2"], "file2.pdf", { type: "application/pdf" }),
      ];

      const urls = await uploadAttachments("interaction-123", files);

      // Should have successfully uploaded both files
      expect(urls.length).toBe(2);
      // URLs should be different (unique paths)
      expect(urls[0]).not.toBe(urls[1]);
    });
  });

  describe("Core Functionality - Download", () => {
    it("should download attachment by URL", async () => {
      const { downloadAttachment } = useFileAttachments();

      // Mock document methods
      const linkElement = document.createElement("a");
      vi.spyOn(document, "createElement").mockReturnValue(linkElement);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => linkElement);
      vi.spyOn(document.body, "removeChild").mockImplementation(() => linkElement);
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      await downloadAttachment(
        "interaction-attachments/user-123/interaction-123/file.pdf",
        "file.pdf"
      );

      expect(document.createElement).toHaveBeenCalledWith("a");
    });

  });

  describe("Core Functionality - Delete", () => {
    it("should delete attachment by URL", async () => {
      const { deleteAttachment } = useFileAttachments();

      const result = await deleteAttachment(
        "https://example.com/interaction-attachments/user-123/interaction-123/file.pdf"
      );

      expect(result).toBe(true);
    });

    it("should return false on delete error", async () => {
      const mockSupabaseWithError = {
        storage: {
          from: vi.fn(() => ({
            remove: vi.fn().mockResolvedValue({ error: new Error("Delete failed") }),
          })),
        },
      };

      vi.doMock("~/composables/useSupabase", () => ({
        useSupabase: () => mockSupabaseWithError,
      }));

      const { deleteAttachment } = useFileAttachments();
      const result = await deleteAttachment("https://example.com/invalid-url");

      expect(result).toBe(false);
    });

    it("should handle invalid file URLs", async () => {
      const { deleteAttachment } = useFileAttachments();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await deleteAttachment("invalid-url");

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Validation", () => {
    it("should reject invalid file types", async () => {
      const { uploadAttachments } = useFileAttachments();
      const files = [new File(["content"], "test.exe", { type: "application/x-msdownload" })];

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await uploadAttachments("interaction-123", files);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should reject files exceeding size limit", async () => {
      const { isValidFile } = useFileAttachments();
      // Create a file larger than 50MB
      const largeFile = new File(
        [new ArrayBuffer(51 * 1024 * 1024)],
        "large.pdf",
        { type: "application/pdf" }
      );

      const result = isValidFile(largeFile);
      expect(result).toBe(false);
    });

    it("should accept valid file types", async () => {
      const { isValidFile } = useFileAttachments();
      const validFiles = [
        new File(["content"], "test.pdf", { type: "application/pdf" }),
        new File(["content"], "test.jpg", { type: "image/jpeg" }),
        new File(["content"], "test.doc", { type: "application/msword" }),
      ];

      for (const file of validFiles) {
        expect(isValidFile(file)).toBe(true);
      }
    });
  });

  describe("Utility Functions", () => {
    it("should get correct file icon for PDF", () => {
      const { getFileIcon } = useFileAttachments();
      const icon = getFileIcon("https://example.com/file.pdf");

      expect(icon).toBe("📄");
    });

    it("should get correct file icon for images", () => {
      const { getFileIcon } = useFileAttachments();
      const pngIcon = getFileIcon("https://example.com/image.png");
      const jpgIcon = getFileIcon("https://example.com/photo.jpg");

      expect(pngIcon).toBe("🖼️");
      expect(jpgIcon).toBe("🖼️");
    });

    it("should get correct file icon for documents", () => {
      const { getFileIcon } = useFileAttachments();
      const docIcon = getFileIcon("https://example.com/document.doc");
      const excelIcon = getFileIcon("https://example.com/spreadsheet.xlsx");

      expect(docIcon).toBe("📝");
      expect(excelIcon).toBe("📊");
    });

    it("should return generic icon for unknown file types", () => {
      const { getFileIcon } = useFileAttachments();
      const icon = getFileIcon("https://example.com/file.unknown");

      expect(icon).toBe("📎");
    });

    it("should extract human-readable filename from URL", () => {
      const { getFileName } = useFileAttachments();
      const filename = getFileName(
        "https://example.com/interaction-attachments/user-123/interaction-123/1234567-abc123.pdf"
      );

      expect(filename).not.toContain("1234567");
      expect(filename).toContain("pdf");
    });

    it("should handle encoded filenames", () => {
      const { getFileName } = useFileAttachments();
      const filename = getFileName(
        "https://example.com/interaction-attachments/user-123/interaction-123/1234567-abc123.My%20Document.pdf"
      );

      expect(filename).toBeDefined();
    });
  });

  describe("Integration", () => {
    it("should work with feature flag enabled", () => {
      const { uploadAttachments, getFileIcon } = useFileAttachments();

      expect(uploadAttachments).toBeDefined();
      expect(getFileIcon).toBeDefined();
    });
  });
});
