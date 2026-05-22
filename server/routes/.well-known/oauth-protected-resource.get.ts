import { defineEventHandler, setHeader, createError } from "h3";
import { useLogger } from "~/server/utils/logger";

const SITE_URL = (process.env.NUXT_PUBLIC_SITE_URL ?? "https://myrecruitingcompass.com").replace(
  /\/$/,
  "",
);

export default defineEventHandler((event) => {
  const logger = useLogger(event, ".well-known/oauth-protected-resource");

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) {
    logger.error("NUXT_PUBLIC_SUPABASE_URL is not configured");
    throw createError({
      statusCode: 500,
      statusMessage: "Authorization server URL not configured",
    });
  }

  setHeader(event, "content-type", "application/json; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600");

  return {
    resource: SITE_URL,
    authorization_servers: [`${supabaseUrl}/auth/v1`],
    bearer_methods_supported: ["header"],
    scopes_supported: [],
    resource_documentation: `${SITE_URL}/about`,
    resource_policy_uri: `${SITE_URL}/legal/privacy`,
    resource_tos_uri: `${SITE_URL}/legal/terms`,
  };
});
