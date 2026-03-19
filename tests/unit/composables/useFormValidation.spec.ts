import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";
import { useFormValidation } from "~/composables/useFormValidation";

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number({ invalid_type_error: "Age must be a number" }).min(0, "Age must be non-negative"),
});

function makeFile(
  name: string,
  type: string,
  sizeBytes: number,
): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes, configurable: true });
  return file;
}

describe("useFormValidation", () => {
  let v: ReturnType<typeof useFormValidation>;

  beforeEach(() => {
    v = useFormValidation();
  });

  // ─── Initial state ────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("errors is empty", () => {
      expect(v.errors.value).toEqual([]);
    });

    it("fileErrors is empty", () => {
      expect(v.fileErrors.value).toEqual([]);
    });

    it("hasErrors is false", () => {
      expect(v.hasErrors.value).toBe(false);
    });

    it("hasFileErrors is false", () => {
      expect(v.hasFileErrors.value).toBe(false);
    });

    it("fieldErrors is empty object", () => {
      expect(v.fieldErrors.value).toEqual({});
    });
  });

  // ─── validate() ──────────────────────────────────────────────────────────

  describe("validate()", () => {
    it("returns parsed data and clears errors on valid input", async () => {
      // Seed an error first to verify clearing
      v.setErrors([{ field: "old", message: "stale" }]);

      const result = await v.validate({ name: "Alice", age: 25 }, testSchema);

      expect(result).toEqual({ name: "Alice", age: 25 });
      expect(v.errors.value).toEqual([]);
      expect(v.hasErrors.value).toBe(false);
    });

    it("returns null and populates errors on invalid input", async () => {
      const result = await v.validate({ name: "", age: 25 }, testSchema);

      expect(result).toBeNull();
      expect(v.hasErrors.value).toBe(true);
      expect(v.errors.value.some((e) => e.field === "name")).toBe(true);
    });

    it("maps field path correctly for nested errors", async () => {
      const nestedSchema = z.object({ user: z.object({ email: z.string().email("Bad email") }) });
      await v.validate({ user: { email: "not-an-email" } }, nestedSchema);

      const paths = v.errors.value.map((e) => e.field);
      expect(paths).toContain("user.email");
    });

    it("returns null when no schema provided", async () => {
      const result = await v.validate({ name: "Alice" });

      expect(result).toBeNull();
    });

    it("returns null and sets generic error for non-Zod throw", async () => {
      const throwingSchema = {
        parseAsync: async () => { throw new Error("unexpected"); },
      } as unknown as z.ZodSchema;

      const result = await v.validate({}, throwingSchema);

      expect(result).toBeNull();
      expect(v.errors.value).toEqual([{ field: "form", message: "Validation failed" }]);
    });

    it("collects all field errors (not just first)", async () => {
      const result = await v.validate({ name: "", age: -1 }, testSchema);

      expect(result).toBeNull();
      expect(v.errors.value.length).toBeGreaterThanOrEqual(2);
    });

    it("age field: reports error when age is negative", async () => {
      await v.validate({ name: "Bob", age: -5 }, testSchema);

      expect(v.fieldErrors.value.age).toBeDefined();
    });
  });

  // ─── validateField() ─────────────────────────────────────────────────────

  describe("validateField()", () => {
    it("returns true and removes existing error on valid value", async () => {
      const schema = z.string().min(1, "Required");
      // Plant an error first
      v.setErrors([{ field: "name", message: "Required" }]);

      const ok = await v.validateField("name", "Alice", schema);

      expect(ok).toBe(true);
      expect(v.errors.value.find((e) => e.field === "name")).toBeUndefined();
    });

    it("returns false and adds new error on invalid value", async () => {
      const schema = z.string().min(5, "Too short");

      const ok = await v.validateField("title", "ab", schema);

      expect(ok).toBe(false);
      const err = v.errors.value.find((e) => e.field === "title");
      expect(err?.message).toBe("Too short");
    });

    it("updates existing error in place when field is re-validated", async () => {
      const schema = z.string().min(5, "Too short");
      await v.validateField("name", "ab", schema);
      expect(v.errors.value.length).toBe(1);

      await v.validateField("name", "abc", schema);
      // Still only one error entry for the field (not duplicated)
      expect(v.errors.value.filter((e) => e.field === "name").length).toBe(1);
    });

    it("creates a new error object on update (immutable update)", async () => {
      const schema = z.string().min(5, "Too short");
      await v.validateField("name", "ab", schema);
      const firstRef = v.errors.value[0];

      await v.validateField("name", "xyz", schema);

      expect(v.errors.value[0]).not.toBe(firstRef);
    });

    it("does not remove errors for other fields when one is valid", async () => {
      const schema = z.string().min(1);
      v.setErrors([
        { field: "other", message: "Other error" },
        { field: "name", message: "Required" },
      ]);

      await v.validateField("name", "Alice", schema);

      expect(v.errors.value.find((e) => e.field === "other")).toBeDefined();
    });
  });

  // ─── clearErrors() ───────────────────────────────────────────────────────

  describe("clearErrors()", () => {
    it("empties errors ref", () => {
      v.setErrors([{ field: "x", message: "err" }]);
      v.clearErrors();

      expect(v.errors.value).toEqual([]);
      expect(v.hasErrors.value).toBe(false);
    });
  });

  // ─── clearFieldError() ───────────────────────────────────────────────────

  describe("clearFieldError()", () => {
    it("removes only the targeted field error", () => {
      v.setErrors([
        { field: "name", message: "Required" },
        { field: "email", message: "Invalid" },
      ]);

      v.clearFieldError("name");

      expect(v.errors.value.find((e) => e.field === "name")).toBeUndefined();
      expect(v.errors.value.find((e) => e.field === "email")).toBeDefined();
    });

    it("is a no-op when field has no error", () => {
      v.setErrors([{ field: "email", message: "Invalid" }]);
      v.clearFieldError("name");

      expect(v.errors.value.length).toBe(1);
    });
  });

  // ─── setErrors() ─────────────────────────────────────────────────────────

  describe("setErrors()", () => {
    it("replaces existing errors with new set", () => {
      v.setErrors([{ field: "old", message: "old error" }]);
      v.setErrors([{ field: "new", message: "new error" }]);

      expect(v.errors.value).toEqual([{ field: "new", message: "new error" }]);
    });

    it("sets hasErrors true when errors provided", () => {
      v.setErrors([{ field: "x", message: "bad" }]);
      expect(v.hasErrors.value).toBe(true);
    });
  });

  // ─── fieldErrors computed ─────────────────────────────────────────────────

  describe("fieldErrors computed", () => {
    it("maps field name to message", () => {
      v.setErrors([
        { field: "name", message: "Name required" },
        { field: "email", message: "Invalid email" },
      ]);

      expect(v.fieldErrors.value).toEqual({
        name: "Name required",
        email: "Invalid email",
      });
    });

    it("last error wins when same field appears twice", () => {
      v.setErrors([
        { field: "name", message: "First" },
        { field: "name", message: "Second" },
      ]);

      expect(v.fieldErrors.value.name).toBe("Second");
    });
  });

  // ─── validateFile() ───────────────────────────────────────────────────────

  describe("validateFile()", () => {
    describe("transcript (PDF/TXT, 10MB max)", () => {
      it("does not throw for valid PDF within size limit", () => {
        const file = makeFile("report.pdf", "application/pdf", 1024);
        expect(() => v.validateFile(file, "transcript")).not.toThrow();
      });

      it("does not throw for valid TXT file", () => {
        const file = makeFile("notes.txt", "text/plain", 512);
        expect(() => v.validateFile(file, "transcript")).not.toThrow();
      });

      it("throws INVALID_TYPE for wrong MIME type", () => {
        const file = makeFile("photo.jpg", "image/jpeg", 1024);
        expect(() => v.validateFile(file, "transcript")).toThrow();
        try {
          v.validateFile(file, "transcript");
        } catch (err: unknown) {
          const e = err as { code: string; message: string };
          expect(e.code).toBe("INVALID_TYPE");
          expect(e.message).toContain("Invalid file type");
        }
      });

      it("throws INVALID_EXTENSION for correct MIME but wrong extension", () => {
        // application/pdf MIME but .txt extension would mismatch — use MIME that passes but ext that fails
        const file = makeFile("report.docx", "application/pdf", 1024);
        expect(() => v.validateFile(file, "transcript")).toThrow();
        try {
          v.validateFile(file, "transcript");
        } catch (err: unknown) {
          const e = err as { code: string };
          expect(e.code).toBe("INVALID_EXTENSION");
        }
      });

      it("throws INVALID_SIZE when file exceeds 10MB", () => {
        const file = makeFile("big.pdf", "application/pdf", 11 * 1024 * 1024);
        expect(() => v.validateFile(file, "transcript")).toThrow();
        try {
          v.validateFile(file, "transcript");
        } catch (err: unknown) {
          const e = err as { code: string; message: string };
          expect(e.code).toBe("INVALID_SIZE");
          expect(e.message).toContain("10MB");
        }
      });

      it("passes for file exactly at the size boundary (10MB)", () => {
        const file = makeFile("exact.pdf", "application/pdf", 10 * 1024 * 1024);
        expect(() => v.validateFile(file, "transcript")).not.toThrow();
      });
    });

    describe("highlight_video (MP4/MOV/AVI, 500MB max)", () => {
      it("accepts mp4", () => {
        const file = makeFile("clip.mp4", "video/mp4", 1024);
        expect(() => v.validateFile(file, "highlight_video")).not.toThrow();
      });

      it("accepts mov", () => {
        const file = makeFile("clip.mov", "video/quicktime", 1024);
        expect(() => v.validateFile(file, "highlight_video")).not.toThrow();
      });

      it("throws INVALID_TYPE for non-video MIME", () => {
        const file = makeFile("doc.pdf", "application/pdf", 1024);
        try {
          v.validateFile(file, "highlight_video");
          expect.fail("should have thrown");
        } catch (err: unknown) {
          expect((err as { code: string }).code).toBe("INVALID_TYPE");
        }
      });

      it("throws INVALID_SIZE above 500MB", () => {
        const file = makeFile("huge.mp4", "video/mp4", 501 * 1024 * 1024);
        try {
          v.validateFile(file, "highlight_video");
          expect.fail("should have thrown");
        } catch (err: unknown) {
          const e = err as { code: string; message: string };
          expect(e.code).toBe("INVALID_SIZE");
          expect(e.message).toContain("500MB");
        }
      });
    });

    describe("resume (PDF/DOC/DOCX, 5MB max)", () => {
      it("accepts docx", () => {
        const file = makeFile(
          "resume.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          1024,
        );
        expect(() => v.validateFile(file, "resume")).not.toThrow();
      });

      it("throws INVALID_SIZE above 5MB", () => {
        const file = makeFile("resume.pdf", "application/pdf", 6 * 1024 * 1024);
        try {
          v.validateFile(file, "resume");
          expect.fail("should have thrown");
        } catch (err: unknown) {
          expect((err as { code: string }).code).toBe("INVALID_SIZE");
        }
      });
    });

    describe("rec_letter (PDF only, 5MB max)", () => {
      it("accepts pdf", () => {
        const file = makeFile("letter.pdf", "application/pdf", 100);
        expect(() => v.validateFile(file, "rec_letter")).not.toThrow();
      });

      it("rejects doc MIME type", () => {
        const file = makeFile("letter.doc", "application/msword", 100);
        try {
          v.validateFile(file, "rec_letter");
          expect.fail("should have thrown");
        } catch (err: unknown) {
          expect((err as { code: string }).code).toBe("INVALID_TYPE");
        }
      });
    });

    describe("stats_sheet (CSV/XLS/XLSX, 10MB max)", () => {
      it("accepts csv", () => {
        const file = makeFile("data.csv", "text/csv", 512);
        expect(() => v.validateFile(file, "stats_sheet")).not.toThrow();
      });

      it("rejects pdf", () => {
        const file = makeFile("report.pdf", "application/pdf", 512);
        try {
          v.validateFile(file, "stats_sheet");
          expect.fail("should have thrown");
        } catch (err: unknown) {
          expect((err as { code: string }).code).toBe("INVALID_TYPE");
        }
      });
    });

    describe("attachment (multiple types, 10MB max)", () => {
      it("accepts image/png", () => {
        const file = makeFile("photo.png", "image/png", 1024);
        expect(() => v.validateFile(file, "attachment")).not.toThrow();
      });

      it("accepts image/jpeg", () => {
        const file = makeFile("photo.jpg", "image/jpeg", 1024);
        expect(() => v.validateFile(file, "attachment")).not.toThrow();
      });

      it("accepts image/gif", () => {
        const file = makeFile("anim.gif", "image/gif", 1024);
        expect(() => v.validateFile(file, "attachment")).not.toThrow();
      });

      it("rejects video MIME", () => {
        const file = makeFile("video.mp4", "video/mp4", 1024);
        try {
          v.validateFile(file, "attachment");
          expect.fail("should have thrown");
        } catch (err: unknown) {
          expect((err as { code: string }).code).toBe("INVALID_TYPE");
        }
      });
    });
  });

  // ─── validateFiles() ──────────────────────────────────────────────────────

  describe("validateFiles()", () => {
    it("does not throw or set fileErrors when all files are valid", () => {
      const files = [
        makeFile("a.pdf", "application/pdf", 1024),
        makeFile("b.pdf", "application/pdf", 2048),
      ];

      expect(() => v.validateFiles(files, "transcript")).not.toThrow();
      expect(v.fileErrors.value).toEqual([]);
    });

    it("throws and populates fileErrors when a file is invalid", () => {
      const files = [
        makeFile("good.pdf", "application/pdf", 1024),
        makeFile("bad.jpg", "image/jpeg", 1024),
      ];

      expect(() => v.validateFiles(files, "transcript")).toThrow();
      expect(v.fileErrors.value.length).toBeGreaterThan(0);
    });

    it("prefixes filename in the error message", () => {
      const files = [makeFile("bad.jpg", "image/jpeg", 1024)];

      try {
        v.validateFiles(files, "transcript");
      } catch {
        // expected
      }

      expect(v.fileErrors.value[0].message).toContain("bad.jpg");
    });

    it("collects errors from all invalid files before throwing", () => {
      const files = [
        makeFile("bad1.jpg", "image/jpeg", 1024),
        makeFile("bad2.jpg", "image/jpeg", 1024),
      ];

      try {
        v.validateFiles(files, "transcript");
      } catch {
        // expected
      }

      expect(v.fileErrors.value.length).toBe(2);
      expect(v.hasFileErrors.value).toBe(true);
    });

    it("accepts FileList-like objects (Array.from compatible)", () => {
      // Simulate FileList behaviour via an array — validateFiles uses Array.from internally
      const files = [makeFile("notes.txt", "text/plain", 100)];
      expect(() => v.validateFiles(files, "transcript")).not.toThrow();
    });
  });

  // ─── clearFileErrors() ────────────────────────────────────────────────────

  describe("clearFileErrors()", () => {
    it("empties fileErrors", () => {
      const files = [makeFile("bad.jpg", "image/jpeg", 1024)];
      try { v.validateFiles(files, "transcript"); } catch { /* expected */ }

      v.clearFileErrors();

      expect(v.fileErrors.value).toEqual([]);
      expect(v.hasFileErrors.value).toBe(false);
    });
  });

  // ─── Utility methods ──────────────────────────────────────────────────────

  describe("getSupportedExtensions()", () => {
    it("returns correct extensions for transcript", () => {
      expect(v.getSupportedExtensions("transcript")).toEqual([".pdf", ".txt"]);
    });

    it("returns correct extensions for highlight_video", () => {
      expect(v.getSupportedExtensions("highlight_video")).toEqual([".mp4", ".mov", ".avi"]);
    });
  });

  describe("getFileSizeLimit()", () => {
    it("returns 10MB for transcript", () => {
      expect(v.getFileSizeLimit("transcript")).toBe(10 * 1024 * 1024);
    });

    it("returns 500MB for highlight_video", () => {
      expect(v.getFileSizeLimit("highlight_video")).toBe(500 * 1024 * 1024);
    });

    it("returns 5MB for resume", () => {
      expect(v.getFileSizeLimit("resume")).toBe(5 * 1024 * 1024);
    });
  });

  describe("getFileDescription()", () => {
    it("returns description string for transcript", () => {
      expect(v.getFileDescription("transcript")).toBe("PDF or text files");
    });

    it("returns description string for highlight_video", () => {
      expect(v.getFileDescription("highlight_video")).toBe("Video files (MP4, MOV, AVI)");
    });

    it("returns description string for attachment", () => {
      expect(v.getFileDescription("attachment")).toBe("Common document and image files");
    });
  });
});
