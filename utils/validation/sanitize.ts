import type { default as SanitizeHtmlFn } from "sanitize-html";

const DEFAULT_ALLOWED_TAGS = [
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
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target"],
};

// Tags whose entire content (not just the tag) must be discarded
const DISCARD_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "button",
  "select",
]);

// Attributes that hold URLs and must be validated
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction"]);

const SAFE_URL_RE = /^(https?:|mailto:|tel:|ftp:|\/|#)/i;

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  // Relative URLs (no colon before first slash or hash) are safe
  if (!trimmed.includes(":")) return true;
  return SAFE_URL_RE.test(trimmed);
}

function sanitizeWithDOMParser(
  dirty: string,
  allowedTags: string[],
  allowedAttributes: Record<string, string[]>,
): string {
  const doc = new DOMParser().parseFromString(dirty, "text/html");

  function processNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    // Completely discard dangerous tags and all their content
    if (DISCARD_TAGS.has(tagName)) return null;

    if (!allowedTags.includes(tagName)) {
      // Unwrap: keep children, drop the tag itself
      const frag = document.createDocumentFragment();
      for (const child of Array.from(el.childNodes)) {
        const processed = processNode(child);
        if (processed) frag.appendChild(processed);
      }
      return frag;
    }

    const newEl = document.createElement(tagName);
    const allowedAttrs = allowedAttributes[tagName] ?? [];
    for (const attr of Array.from(el.attributes)) {
      if (!allowedAttrs.includes(attr.name)) continue;
      if (URL_ATTRIBUTES.has(attr.name) && !isSafeUrl(attr.value)) continue;
      newEl.setAttribute(attr.name, attr.value);
    }
    for (const child of Array.from(el.childNodes)) {
      const processed = processNode(child);
      if (processed) newEl.appendChild(processed);
    }
    return newEl;
  }

  const wrapper = document.createElement("div");
  for (const child of Array.from(doc.body.childNodes)) {
    const processed = processNode(child);
    if (processed) wrapper.appendChild(processed);
  }
  return wrapper.innerHTML;
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Server: uses sanitize-html (full parser). Client: uses native DOMParser (browser sandbox).
 */
export const sanitizeHtml = (
  dirty: string | null | undefined,
  allowedTags?: string[],
): string => {
  if (!dirty) return "";

  const tags = allowedTags ?? DEFAULT_ALLOWED_TAGS;

  if (import.meta.server) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lib = require("sanitize-html") as typeof SanitizeHtmlFn;
    return lib(dirty, {
      allowedTags: tags,
      allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
    });
  }

  return sanitizeWithDOMParser(dirty, tags, DEFAULT_ALLOWED_ATTRIBUTES);
};

/**
 * Sanitizes URLs to prevent javascript: and data: URIs.
 */
export const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  try {
    const trimmed = url.trim().toLowerCase();

    if (
      trimmed.startsWith("javascript:") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("vbscript:") ||
      trimmed.startsWith("file:")
    ) {
      return null;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return null;
    }

    new URL(url);
    return url;
  } catch {
    return null;
  }
};

/**
 * Strips all HTML tags and returns plain text.
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

/**
 * Recursively sanitizes specified fields in an object.
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
