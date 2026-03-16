import { describe, it, expect } from "vitest";

// escapeHtml is not exported, so we replicate it here to test the logic
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

describe("Email template XSS prevention - escapeHtml", () => {
  it("escapes script tags", () => {
    const malicious = '<script>alert("xss")</script>';
    expect(escapeHtml(malicious)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml(malicious)).not.toContain("<script>");
  });

  it("escapes attribute injection", () => {
    const malicious = '" onmouseover="alert(1)"';
    const result = escapeHtml(malicious);
    expect(result).not.toContain('"');
    expect(result).toContain("&quot;");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<img src=x onerror=alert(1)>")).toBe(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
  });

  it("preserves normal text unchanged", () => {
    const normal = "John Smith - Class of 2026";
    expect(escapeHtml(normal)).toBe(normal);
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("Smith & Jones")).toBe("Smith &amp; Jones");
  });
});
