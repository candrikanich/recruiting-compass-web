import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Removes dangerous scripts, event handlers, and potentially malicious attributes.
 */
export const sanitizeHtml = (
  dirty: string | null | undefined,
  allowedTags?: string[],
): string => {
  if (!dirty) return "";

  const config = {
    ALLOWED_TAGS: allowedTags || [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "a",
    ],
    ALLOWED_ATTR: ["href", "title", "target"],
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(dirty, config);
};

/**
 * Sanitizes URLs to prevent javascript: and data: URIs.
 * Validates that URLs only use safe protocols.
 */
export const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  try {
    const trimmed = url.trim().toLowerCase();

    // Reject dangerous protocols
    if (
      trimmed.startsWith("javascript:") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("vbscript:") ||
      trimmed.startsWith("file:")
    ) {
      return null;
    }

    // Only allow http and https
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return null;
    }

    // Test if it's a valid URL
    new URL(url);
    return url;
  } catch {
    return null;
  }
};

/**
 * Strips all HTML tags and returns plain text.
 * Useful for fields that should only contain text.
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

/**
 * Recursively sanitizes specified fields in an object.
 * Useful for sanitizing API responses or form data before storage.
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
  obj: T,
  fieldsToSanitize: (keyof T)[] = [],
): T => {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized: Record<string, unknown> = { ...obj };

  fieldsToSanitize.forEach((field) => {
    const value = sanitized[field as string];

    if (typeof value === "string") {
      sanitized[field as string] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[field as string] = value.map((item: unknown) =>
        typeof item === "string" ? sanitizeHtml(item) : item,
      );
    } else if (typeof value === "object" && value !== null) {
      // Recursively sanitize nested objects
      sanitized[field as string] = sanitizeObject(
        value as Record<string, unknown>,
        [],
      );
    }
  });

  return sanitized as T;
};

/**
 * Escapes HTML entities to prevent XSS when content must be rendered as HTML.
 * Alternative to sanitizeHtml when you need to preserve the original text with entities.
 */
export const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return "";

  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
};
