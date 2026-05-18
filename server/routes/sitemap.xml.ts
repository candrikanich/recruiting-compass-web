import { defineEventHandler, setHeader } from "h3";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const SITE_URL = (process.env.NUXT_PUBLIC_SITE_URL ?? "https://myrecruitingcompass.com").replace(
  /\/$/,
  "",
);

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

const STATIC_ENTRIES: SitemapEntry[] = [
  { loc: "/", changefreq: "weekly", priority: 1.0 },
  { loc: "/about", changefreq: "monthly", priority: 0.8 },
  { loc: "/legal/privacy", changefreq: "yearly", priority: 0.3 },
  { loc: "/legal/terms", changefreq: "yearly", priority: 0.3 },
  { loc: "/help", changefreq: "monthly", priority: 0.7 },
  { loc: "/help/getting-started", changefreq: "monthly", priority: 0.6 },
  { loc: "/help/account", changefreq: "monthly", priority: 0.5 },
  { loc: "/help/phases", changefreq: "monthly", priority: 0.5 },
  { loc: "/help/schools", changefreq: "monthly", priority: 0.5 },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderEntry(entry: SitemapEntry): string {
  const parts: string[] = [`    <loc>${escapeXml(SITE_URL + entry.loc)}</loc>`];
  if (entry.lastmod) parts.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  if (entry.priority !== undefined) parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "sitemap");

  const entries: SitemapEntry[] = [...STATIC_ENTRIES];

  try {
    const supabase = useSupabaseAdmin();
    const { data, error } = await supabase
      .from("player_profiles")
      .select("vanity_slug, hash_slug, updated_at")
      .eq("is_published", true);

    if (error) {
      logger.error("Failed to query published player_profiles", error);
    } else if (data) {
      for (const row of data) {
        const slug = (row.vanity_slug as string | null) ?? (row.hash_slug as string | null);
        if (!slug) continue;
        const updatedAt = row.updated_at as string | null;
        entries.push({
          loc: `/p/${slug}`,
          lastmod: updatedAt ? new Date(updatedAt).toISOString().split("T")[0] : undefined,
          changefreq: "weekly",
          priority: 0.5,
        });
      }
      logger.info("Sitemap built", { static: STATIC_ENTRIES.length, profiles: data.length });
    }
  } catch (err) {
    logger.error("Failed to build dynamic sitemap entries", err);
    // Fall through and serve static entries only — never 500 on /sitemap.xml
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderEntry).join("\n")}
</urlset>
`;

  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, s-maxage=3600");
  return body;
});
