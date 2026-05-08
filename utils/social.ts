export type SocialPlatform = "twitter" | "instagram" | "tiktok";

export interface NormalizeHandleResult {
  handle: string;
  isShortUrl: boolean;
}

const SHORT_URL_PATTERNS = /^(https?:\/\/)?(vm|vt)\.tiktok\.com\//;

const URL_PREFIXES: Record<SocialPlatform, RegExp[]> = {
  twitter: [
    /^https?:\/\/(www\.)?x\.com\//,
    /^https?:\/\/(www\.)?twitter\.com\//,
    /^(www\.)?x\.com\//,
    /^(www\.)?twitter\.com\//,
  ],
  instagram: [
    /^https?:\/\/(www\.)?instagram\.com\//,
    /^(www\.)?instagram\.com\//,
  ],
  tiktok: [/^https?:\/\/(www\.)?tiktok\.com\/@?/, /^(www\.)?tiktok\.com\/@?/],
};

export function normalizeHandle(
  value: string,
  platform: SocialPlatform,
): NormalizeHandleResult {
  const trimmed = value.trim();
  if (!trimmed) return { handle: "", isShortUrl: false };

  if (platform === "tiktok" && SHORT_URL_PATTERNS.test(trimmed)) {
    const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
    return { handle: withoutProtocol, isShortUrl: true };
  }

  let handle = trimmed;
  for (const pattern of URL_PREFIXES[platform]) {
    if (pattern.test(handle)) {
      handle = handle.replace(pattern, "");
      break;
    }
  }

  handle = handle
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();

  return { handle, isShortUrl: false };
}
