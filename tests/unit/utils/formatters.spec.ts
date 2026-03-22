import { describe, it, expect } from "vitest";
import { extractFilename, formatFileSize } from "~/utils/formatters";

describe("formatters", () => {
  describe("extractFilename", () => {
    it("extracts filename from a full URL", () => {
      expect(extractFilename("https://example.com/path/to/file.pdf")).toBe(
        "file.pdf",
      );
    });

    it("returns the input when there is no slash", () => {
      expect(extractFilename("bare-filename.pdf")).toBe("bare-filename.pdf");
    });

    it("returns empty string for empty input", () => {
      expect(extractFilename("")).toBe("");
    });

    it("extracts filename from a simple path", () => {
      expect(extractFilename("/documents/report.docx")).toBe("report.docx");
    });
  });

  describe("formatFileSize", () => {
    it("returns '0 Bytes' for zero", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
    });

    it("formats bytes below 1 KB", () => {
      expect(formatFileSize(500)).toContain("Bytes");
    });

    it("formats exactly 1 KB", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
    });

    it("formats exactly 1 MB", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
    });

    it("formats exactly 1 GB", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });

    it("rounds to two decimal places", () => {
      // 1536 bytes = 1.5 KB
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });
  });
});
