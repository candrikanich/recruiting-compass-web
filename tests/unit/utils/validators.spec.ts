import { describe, it, expect } from "vitest";
import { urlSchema } from "~/utils/validation/validators";

describe("urlSchema", () => {
  describe("Full URLs (unchanged)", () => {
    it("should accept https:// URLs as-is", async () => {
      const result = await urlSchema.parseAsync("https://stanford.edu");
      expect(result).toBe("https://stanford.edu");
    });

    it("should accept http:// URLs as-is", async () => {
      const result = await urlSchema.parseAsync("http://stanford.edu");
      expect(result).toBe("http://stanford.edu");
    });

    it("should accept URLs with paths", async () => {
      const result = await urlSchema.parseAsync(
        "https://stanford.edu/athletics",
      );
      expect(result).toBe("https://stanford.edu/athletics");
    });
  });

  describe("Bare domain normalization (iOS parity)", () => {
    it("should normalize bare domain to https://", async () => {
      const result = await urlSchema.parseAsync("stanford.edu");
      expect(result).toBe("https://stanford.edu");
    });

    it("should normalize www. domain to https://", async () => {
      const result = await urlSchema.parseAsync("www.stanford.edu");
      expect(result).toBe("https://www.stanford.edu");
    });

    it("should normalize bare domain with path", async () => {
      const result = await urlSchema.parseAsync("stanford.edu/athletics");
      expect(result).toBe("https://stanford.edu/athletics");
    });

    it("should trim whitespace before normalizing", async () => {
      const result = await urlSchema.parseAsync("  stanford.edu  ");
      expect(result).toBe("https://stanford.edu");
    });
  });

  describe("Dangerous protocol rejection", () => {
    it("should reject javascript: protocol", async () => {
      await expect(
        urlSchema.parseAsync('javascript:alert("XSS")'),
      ).rejects.toThrow();
    });

    it("should reject data: protocol", async () => {
      await expect(
        urlSchema.parseAsync('data:text/html,<script>alert("XSS")</script>'),
      ).rejects.toThrow();
    });

    it("should reject vbscript: protocol", async () => {
      await expect(
        urlSchema.parseAsync('vbscript:alert("XSS")'),
      ).rejects.toThrow();
    });

    it("should reject file: protocol", async () => {
      await expect(
        urlSchema.parseAsync("file:///etc/passwd"),
      ).rejects.toThrow();
    });
  });

  describe("Invalid inputs", () => {
    it("should reject clearly malformed input", async () => {
      await expect(urlSchema.parseAsync("not a url at all!!!")).rejects.toThrow(
        "Please enter a valid URL",
      );
    });
  });
});
