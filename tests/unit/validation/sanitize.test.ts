import { describe, it, expect } from "vitest";
import {
  sanitizeHtml,
  sanitizeUrl,
  stripHtml,
  sanitizeObject,
} from "~/utils/validation/sanitize";

describe("sanitizeHtml", () => {
  it("should remove script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("script");
    expect(result).toContain("Hello");
  });

  it("should remove event handlers", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
  });

  it("should remove javascript: URLs", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("should allow safe HTML", () => {
    const input = "<p>Hello <strong>World</strong></p>";
    const result = sanitizeHtml(input);
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });

  it("should handle null values", () => {
    const result = sanitizeHtml(null);
    expect(result).toBe("");
  });

  it("should handle empty strings", () => {
    const result = sanitizeHtml("");
    expect(result).toBe("");
  });
});

describe("sanitizeUrl", () => {
  it("should allow valid HTTP URLs", () => {
    const url = "http://example.com";
    const result = sanitizeUrl(url);
    expect(result).toBe(url);
  });

  it("should allow valid HTTPS URLs", () => {
    const url = "https://example.com";
    const result = sanitizeUrl(url);
    expect(result).toBe(url);
  });

  it("should reject javascript: URLs", () => {
    const url = "javascript:alert(1)";
    const result = sanitizeUrl(url);
    expect(result).toBeNull();
  });

  it("should reject data: URLs", () => {
    const url = "data:text/html,<script>alert(1)</script>";
    const result = sanitizeUrl(url);
    expect(result).toBeNull();
  });

  it("should handle null values", () => {
    const result = sanitizeUrl(null);
    expect(result).toBeNull();
  });

  it("should handle empty strings", () => {
    const result = sanitizeUrl("");
    expect(result).toBeNull();
  });
});

describe("stripHtml", () => {
  it("should remove all HTML tags", () => {
    const input = "<p>Hello <strong>World</strong></p>";
    const result = stripHtml(input);
    expect(result).toBe("Hello World");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("should handle nested tags", () => {
    const input = "<div><p>Text</p></div>";
    const result = stripHtml(input);
    expect(result).toBe("Text");
  });

  it("should handle self-closing tags", () => {
    const input = "Text<br/>More text";
    const result = stripHtml(input);
    expect(result).toBe("TextMore text");
  });

  it("should handle null values", () => {
    const result = stripHtml(null);
    expect(result).toBe("");
  });

  it("should handle empty strings", () => {
    const result = stripHtml("");
    expect(result).toBe("");
  });
});

describe("sanitizeObject", () => {
  it("should sanitize string fields", () => {
    const obj = {
      name: "Test",
      description: "<script>alert(1)</script>Normal text",
    };
    const result = sanitizeObject(obj, ["description"]);
    expect(result.name).toBe("Test");
    expect(result.description).not.toContain("script");
  });

  it("should sanitize arrays of strings", () => {
    const obj = {
      tags: ["<script>xss</script>tag1", "safe tag"],
    };
    const result = sanitizeObject(obj, ["tags"]);
    expect(result.tags[0]).not.toContain("script");
    expect(result.tags[1]).toBe("safe tag");
  });

  it("should not sanitize unlisted fields", () => {
    const obj = {
      safe: "<p>Keep this</p>",
      unsafe: "<script>alert(1)</script>",
    };
    const result = sanitizeObject(obj, ["unsafe"]);
    expect(result.safe).toContain("<p>");
    expect(result.unsafe).not.toContain("script");
  });

  it("should handle nested objects", () => {
    const obj = {
      nested: {
        field: "<script>xss</script>text",
      },
    };
    const result = sanitizeObject(obj, ["nested"]);
    expect(result.nested.field).not.toContain("script");
  });

  it("should handle null values in fields", () => {
    const obj = {
      field: null,
    };
    const result = sanitizeObject(obj, ["field"]);
    expect(result.field).toBeNull();
  });
});
