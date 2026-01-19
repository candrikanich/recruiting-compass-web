import DOMPurify from 'isomorphic-dompurify';

const sanitizeHtml = (dirty, allowedTags) => {
  if (!dirty) return "";
  const config = {
    ALLOWED_TAGS: [
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
      "a"
    ],
    ALLOWED_ATTR: ["href", "title", "target"],
    KEEP_CONTENT: true
  };
  return DOMPurify.sanitize(dirty, config);
};
const sanitizeUrl = (url) => {
  if (!url) return null;
  try {
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:") || trimmed.startsWith("file:")) {
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
const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};
const escapeHtml = (text) => {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

export { sanitizeUrl as a, sanitizeHtml as b, escapeHtml as e, stripHtml as s };
//# sourceMappingURL=sanitize.mjs.map
