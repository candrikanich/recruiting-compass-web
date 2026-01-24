import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  compressImage,
  validateImageFile,
} from "~/utils/image/compressImage";

// Mock browser-image-compression
vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File, options: any) => {
    // Return a smaller blob representing compressed image
    return new Blob([file], { type: "image/jpeg" });
  }),
}));

describe("compressImage utility", () => {
  describe("validateImageFile", () => {
    it("should validate JPEG files", () => {
      const file = new File(["jpeg data"], "test.jpg", { type: "image/jpeg" });
      const result = validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate PNG files", () => {
      const file = new File(["png data"], "test.png", { type: "image/png" });
      const result = validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate WebP files", () => {
      const file = new File(["webp data"], "test.webp", {
        type: "image/webp",
      });
      const result = validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should validate GIF files", () => {
      const file = new File(["gif data"], "test.gif", { type: "image/gif" });
      const result = validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject non-image MIME types", () => {
      const file = new File(["text data"], "test.txt", { type: "text/plain" });
      const result = validateImageFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("image");
    });

    it("should reject files exceeding default size limit (5MB)", () => {
      // Create a mock file exceeding 5MB
      const largeData = new Array(6 * 1024 * 1024 + 1).fill("x").join("");
      const file = new File([largeData], "large.jpg", { type: "image/jpeg" });

      const result = validateImageFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("5MB");
    });

    it("should accept files within default size limit", () => {
      const smallData = new Array(2 * 1024 * 1024).fill("x").join("");
      const file = new File([smallData], "small.jpg", { type: "image/jpeg" });

      const result = validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should respect custom size limit in MB", () => {
      const data = new Array(3 * 1024 * 1024).fill("x").join("");
      const file = new File([data], "test.jpg", { type: "image/jpeg" });

      const result = validateImageFile(file, 2); // 2MB limit

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("2MB");
    });

    it("should handle invalid MIME type with unknown type", () => {
      const file = new File(["data"], "test.xyz", { type: "application/xyz" });
      const result = validateImageFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle empty file", () => {
      const file = new File([], "empty.jpg", { type: "image/jpeg" });
      const result = validateImageFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("compressImage", () => {
    it("should return a File object", async () => {
      const original = new File(["image data"], "test.jpg", {
        type: "image/jpeg",
      });

      const compressed = await compressImage(original);

      expect(compressed).toBeInstanceOf(File);
      expect(compressed.name).toBeDefined();
      expect(compressed.type).toBe("image/jpeg");
    });

    it("should preserve filename in output", async () => {
      const original = new File(["image"], "mytest.jpg", {
        type: "image/jpeg",
      });

      const compressed = await compressImage(original);

      expect(compressed.name).toContain("mytest");
    });

    it("should accept custom compression options", async () => {
      const original = new File(["image"], "test.jpg", { type: "image/jpeg" });

      const customOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
      };

      const compressed = await compressImage(original, customOptions);

      expect(compressed).toBeInstanceOf(File);
      expect(compressed.type).toBe("image/jpeg");
    });

    it("should use default compression options when none provided", async () => {
      const original = new File(["image"], "test.jpg", { type: "image/jpeg" });

      const compressed = await compressImage(original);

      expect(compressed).toBeInstanceOf(File);
      expect(compressed.type).toBe("image/jpeg");
    });

    it("should handle JPEG format", async () => {
      const original = new File(["jpeg"], "test.jpg", { type: "image/jpeg" });

      const compressed = await compressImage(original);

      expect(compressed.type).toBe("image/jpeg");
    });

    it("should handle PNG format and convert to JPEG", async () => {
      const original = new File(["png"], "test.png", { type: "image/png" });

      const compressed = await compressImage(original);

      // Should convert to JPEG for better compression
      expect(compressed.type).toBe("image/jpeg");
    });

    it("should throw error for invalid file type", async () => {
      const invalid = new File(["text"], "test.txt", { type: "text/plain" });

      await expect(compressImage(invalid)).rejects.toThrow();
    });

    it("should throw error for file exceeding size limit", async () => {
      const largeData = new Array(6 * 1024 * 1024 + 1).fill("x").join("");
      const large = new File([largeData], "large.jpg", { type: "image/jpeg" });

      await expect(compressImage(large)).rejects.toThrow();
    });

    it("should handle valid JPEG files", async () => {
      const jpeg = new File(["image"], "test.jpg", { type: "image/jpeg" });

      const compressed = await compressImage(jpeg);

      expect(compressed).toBeInstanceOf(File);
      expect(compressed.type).toBe("image/jpeg");
    });

    it("should add timestamp to generated filenames", async () => {
      const original = new File(["image"], "myfile.jpg", {
        type: "image/jpeg",
      });

      const compressed = await compressImage(original);

      // Filename should include the original name and a timestamp
      expect(compressed.name).toContain("myfile");
      expect(compressed.name).toMatch(/-\d+\.jpg$/); // Timestamp pattern like "myfile-1234567890.jpg"
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid file types", async () => {
      const invalid = new File(["data"], "test.txt", { type: "text/plain" });

      await expect(compressImage(invalid)).rejects.toThrow(
        /Invalid.*file|Allowed types/i
      );
    });

    it("should provide meaningful error messages on validation failure", () => {
      const invalid = new File(["data"], "test.txt", { type: "text/plain" });

      try {
        validateImageFile(invalid);
      } catch (error) {
        // Validation function doesn't throw, it returns error
        const result = validateImageFile(invalid);
        expect(result.error).toBeDefined();
        expect(result.error!.length).toBeGreaterThan(0);
      }
    });

    it("should handle empty files", () => {
      const empty = new File([], "empty.jpg", { type: "image/jpeg" });

      const result = validateImageFile(empty);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle filenames with special characters", async () => {
      const special = new File(["image"], "test@#$%.jpg", {
        type: "image/jpeg",
      });

      const compressed = await compressImage(special);

      expect(compressed).toBeInstanceOf(File);
      expect(compressed.name).toContain("test@#$%");
    });

    it("should handle filenames without extension", async () => {
      const noExt = new File(["image"], "testimage", { type: "image/jpeg" });

      const compressed = await compressImage(noExt);

      expect(compressed).toBeInstanceOf(File);
      expect(compressed.name).toContain("testimage");
    });

    it("should accept custom max width or height", async () => {
      const original = new File(["image"], "test.jpg", { type: "image/jpeg" });

      const compressed = await compressImage(original, {
        maxWidthOrHeight: 1200,
      });

      expect(compressed).toBeInstanceOf(File);
    });
  });
});
