// Accept-header content negotiation for the agent markdown variant.
// Spec: RFC 9110 §12.5.1 (Accept), RFC 9110 §12.4.2 (q-values).

export function parseAcceptHeader(accept: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of accept.split(",")) {
    const parts = entry.trim().split(";").map((s) => s.trim());
    const mediaType = parts[0]?.toLowerCase();
    if (!mediaType) continue;
    let q = 1;
    for (let i = 1; i < parts.length; i++) {
      const qMatch = parts[i].match(/^q=([\d.]+)$/i);
      if (qMatch) {
        const parsed = parseFloat(qMatch[1]);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) q = parsed;
      }
    }
    map.set(mediaType, Math.max(map.get(mediaType) ?? 0, q));
  }
  return map;
}

/**
 * Returns true when the client explicitly accepts text/markdown with a
 * preference at least as strong as text/html. Browsers (which never list
 * text/markdown) always get HTML.
 */
export function shouldServeMarkdown(accept: string | undefined): boolean {
  if (!accept) return false;
  const types = parseAcceptHeader(accept);
  const md = types.get("text/markdown") ?? 0;
  if (md <= 0) return false;
  const html = types.get("text/html") ?? 0;
  return md >= html;
}
