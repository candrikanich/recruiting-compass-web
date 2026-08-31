import type { PublicProfileData } from "~/types/models";
import type { SocialPlatform } from "~/utils/social";

export interface SocialLink {
  platform: SocialPlatform;
  handle: string;
  url: string;
  icon: string;
}

type PublicSocial = PublicProfileData["social"];

const PLATFORM_META: Record<
  SocialPlatform,
  {
    key: keyof NonNullable<PublicSocial>;
    icon: string;
    toUrl: (h: string) => string;
  }
> = {
  twitter: {
    key: "twitter_handle",
    icon: "i-heroicons-at-symbol",
    toUrl: (h) => `https://x.com/${h}`,
  },
  instagram: {
    key: "instagram_handle",
    icon: "i-heroicons-camera",
    toUrl: (h) => `https://instagram.com/${h}`,
  },
  tiktok: {
    key: "tiktok_handle",
    icon: "i-heroicons-musical-note",
    toUrl: (h) => `https://tiktok.com/@${h}`,
  },
};

/**
 * Pure builder: present-only social handles → renderable links.
 * facebook_url is intentionally excluded — the hero mockup shows X/IG/TikTok
 * only, and facebook_url is a full profile URL rather than a handle.
 */
export function buildSocialLinks(social: PublicSocial): SocialLink[] {
  if (!social) return [];

  return (Object.keys(PLATFORM_META) as SocialPlatform[]).reduce<SocialLink[]>(
    (links, platform) => {
      const meta = PLATFORM_META[platform];
      const raw = social[meta.key];
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      if (!trimmed) return links;

      const bare = trimmed.replace(/^@/, "");
      links.push({
        platform,
        handle: `@${bare}`,
        url: meta.toUrl(bare),
        icon: meta.icon,
      });
      return links;
    },
    [],
  );
}
