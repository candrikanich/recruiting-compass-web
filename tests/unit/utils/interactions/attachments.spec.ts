import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateAttachmentFile,
  uploadInteractionAttachments,
} from "~/utils/interactions/attachments";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Interaction Attachments", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn(),
      },
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ============================================
  // validateAttachmentFile Tests
  // ============================================

  describe("validateAttachmentFile", () => {
    it("should accept PDF files", () => {
      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept image files (JPEG)", () => {
      const file = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept image files (PNG)", () => {
      const file = new File(["content"], "test.png", {
        type: "image/png",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept image files (GIF)", () => {
      const file = new File(["content"], "test.gif", {
        type: "image/gif",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept Word documents", () => {
      const file = new File(["content"], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept legacy Word documents", () => {
      const file = new File(["content"], "test.doc", {
        type: "application/msword",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept Excel spreadsheets (XLSX)", () => {
      const file = new File(["content"], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept Excel spreadsheets (XLS)", () => {
      const file = new File(["content"], "test.xls", {
        type: "application/vnd.ms-excel",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should accept text files", () => {
      const file = new File(["content"], "test.txt", {
        type: "text/plain",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should reject unsupported file types", () => {
      const file = new File(["content"], "test.exe", {
        type: "application/x-msdownload",
      });

      expect(() => validateAttachmentFile(file)).toThrow(
        /File type .* not allowed/,
      );
    });

    it("should reject HTML files", () => {
      const file = new File(["content"], "test.html", {
        type: "text/html",
      });

      expect(() => validateAttachmentFile(file)).toThrow();
    });

    it("should reject JavaScript files", () => {
      const file = new File(["content"], "test.js", {
        type: "text/javascript",
      });

      expect(() => validateAttachmentFile(file)).toThrow();
    });

    it("should reject files larger than 10MB", () => {
      const largeContent = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], "large.pdf", {
        type: "application/pdf",
      });

      expect(() => validateAttachmentFile(file)).toThrow(
        /File too large.*Maximum: 10MB/,
      );
    });

    it("should reject files at exactly 10MB boundary", () => {
      const boundaryContent = new ArrayBuffer(10 * 1024 * 1024 + 1); // 10MB + 1 byte
      const file = new File([boundaryContent], "boundary.pdf", {
        type: "application/pdf",
      });

      expect(() => validateAttachmentFile(file)).toThrow(/File too large/);
    });

    it("should accept files at exactly 10MB", () => {
      const boundaryContent = new ArrayBuffer(10 * 1024 * 1024); // exactly 10MB
      const file = new File([boundaryContent], "boundary.pdf", {
        type: "application/pdf",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });

    it("should format file size in error message", () => {
      const largeContent = new ArrayBuffer(15.5 * 1024 * 1024); // 15.5MB
      const file = new File([largeContent], "large.pdf", {
        type: "application/pdf",
      });

      expect(() => validateAttachmentFile(file)).toThrow(/15\.5MB/);
    });

    it("should format small file sizes correctly", () => {
      const smallContent = new ArrayBuffer(1.2 * 1024 * 1024); // 1.2MB
      const file = new File([smallContent], "small.pdf", {
        type: "application/pdf",
      });

      expect(() => validateAttachmentFile(file)).not.toThrow();
    });
  });

  // ============================================
  // uploadInteractionAttachments Tests
  // ============================================

  describe("uploadInteractionAttachments", () => {
    it("should upload single file successfully", async () => {
      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const uploadMock = vi.fn().mockResolvedValue({
        data: { path: "interactions/interaction-1/1234567890-test.pdf" },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      const result = await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        [file],
        "interaction-1",
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toContain("interactions/interaction-1/");
      expect(uploadMock).toHaveBeenCalled();
    });

    it("should upload multiple files", async () => {
      const files = [
        new File(["content1"], "test1.pdf", { type: "application/pdf" }),
        new File(["content2"], "test2.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      ];

      const uploadMock = vi
        .fn()
        .mockResolvedValueOnce({
          data: { path: "interactions/interaction-1/1234567890-test1.pdf" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { path: "interactions/interaction-1/1234567891-test2.docx" },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      const result = await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        files,
        "interaction-1",
      );

      expect(result).toHaveLength(2);
      expect(uploadMock).toHaveBeenCalledTimes(2);
    });

    it("should use correct storage bucket", async () => {
      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const fromMock = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: "interactions/interaction-1/1234567890-test.pdf" },
          error: null,
        }),
      });

      mockSupabase.storage.from = fromMock;

      await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        [file],
        "interaction-1",
      );

      expect(fromMock).toHaveBeenCalledWith("interaction-attachments");
    });

    it("should use correct file path structure", async () => {
      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const uploadMock = vi.fn().mockResolvedValue({
        data: { path: "interactions/interaction-1/1234567890-test.pdf" },
        error: null,
      });

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        [file],
        "interaction-1",
      );

      const [filepath] = uploadMock.mock.calls[0];
      expect(filepath).toMatch(/^interactions\/interaction-1\/\d+-test\.pdf$/);
    });

    it("should handle upload error gracefully", async () => {
      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const uploadMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Upload failed"),
      });

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      const result = await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        [file],
        "interaction-1",
      );

      expect(result).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });

    it("should continue uploading after one file fails", async () => {
      const files = [
        new File(["content1"], "test1.pdf", { type: "application/pdf" }),
        new File(["content2"], "test2.pdf", { type: "application/pdf" }),
      ];

      const uploadMock = vi
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: new Error("First file failed"),
        })
        .mockResolvedValueOnce({
          data: { path: "interactions/interaction-1/1234567891-test2.pdf" },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      const result = await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        files,
        "interaction-1",
      );

      expect(result).toHaveLength(1);
      expect(uploadMock).toHaveBeenCalledTimes(2);
    });

    it("should handle exception thrown during upload", async () => {
      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const uploadMock = vi.fn().mockRejectedValue(new Error("Network error"));

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      const result = await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        [file],
        "interaction-1",
      );

      expect(result).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });

    it("should return empty array when no files provided", async () => {
      const result = await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        [],
        "interaction-1",
      );

      expect(result).toHaveLength(0);
    });

    it("should preserve file paths from successful uploads", async () => {
      const files = [
        new File(["content1"], "important.pdf", { type: "application/pdf" }),
        new File(["content2"], "document.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      ];

      const expectedPaths = [
        "interactions/interaction-1/timestamp1-important.pdf",
        "interactions/interaction-1/timestamp2-document.docx",
      ];

      const uploadMock = vi
        .fn()
        .mockResolvedValueOnce({
          data: { path: expectedPaths[0] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { path: expectedPaths[1] },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      const result = await uploadInteractionAttachments(
        mockSupabase as SupabaseClient,
        files,
        "interaction-1",
      );

      expect(result).toEqual(expectedPaths);
    });
  });
});
