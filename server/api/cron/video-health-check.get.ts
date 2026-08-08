/**
 * GET /api/cron/video-health-check
 * Scheduled cron job that HEAD-checks every video_links row and records its
 * reachability. Triggered by Vercel Cron (daily at 06:00 UTC) or manually.
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 * Manual callers may also pass it as "x-cron-secret: <secret>".
 */

import { defineEventHandler, createError, getHeader } from "h3";
import { isIP } from "node:net";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { verifySharedSecret } from "~/server/utils/secrets";
import { isPrivateIp, resolvesToPublicIp } from "~/server/utils/faviconLookup";
import type { Database } from "~/types/database";

type VideoLinkUpdate = Database["public"]["Tables"]["video_links"]["Update"];

const FETCH_TIMEOUT_MS = 8000;

interface CronResult {
  total: number;
  healthy: number;
  broken: number;
}

/**
 * video_links.url is user-supplied, so this HEAD probe is an SSRF sink even
 * though the cron itself is secret-gated. Gate every target the same way the
 * favicon lookup does: only http(s), reject IP-literals in private ranges, and
 * DNS-pre-resolve hostnames so nothing pointing at loopback / RFC1918 /
 * link-local (169.254 metadata) is ever fetched. redirect: "manual" stops a
 * public host from 302-ing the probe into internal space. Residual DNS-rebinding
 * TOCTOU is accepted, same as faviconLookup.
 */
async function checkLinkHealth(rawUrl: string): Promise<"healthy" | "broken"> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return "broken";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "broken";

  // URL.hostname keeps the brackets on IPv6 literals ("[::1]"), which isIP
  // rejects — strip them so the private-range check actually sees the address.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateIp(host)) return "broken";
  } else if (!(await resolvesToPublicIp(host))) {
    return "broken";
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return response.ok || (response.status >= 300 && response.status < 400)
      ? "healthy"
      : "broken";
  } catch {
    return "broken";
  }
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "cron/video-health-check");
  try {
    // Verify cron secret — Vercel sends "Authorization: Bearer <CRON_SECRET>",
    // manual callers may use the legacy "x-cron-secret" header.
    const expectedSecret = process.env.CRON_SECRET;
    const authHeader = getHeader(event, "authorization");
    const legacyHeader = getHeader(event, "x-cron-secret");
    const bearerSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;
    const providedSecret = bearerSecret ?? legacyHeader;

    if (
      !expectedSecret ||
      !providedSecret ||
      !verifySharedSecret(providedSecret, expectedSecret)
    ) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized: Invalid cron secret",
      });
    }

    const supabase = createServerSupabaseClient();

    const response = await supabase.from("video_links").select("id, url");
    const { data: links, error: fetchError } = response as {
      data: Array<{ id: string; url: string }> | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    if (fetchError || !links) {
      throw createError({
        statusCode: 500,
        message: "Failed to fetch video links",
      });
    }

    const result: CronResult = { total: links.length, healthy: 0, broken: 0 };

    // Process sequentially to avoid hammering third-party hosts at once.
    for (const link of links) {
      const healthStatus = await checkLinkHealth(link.url);
      if (healthStatus === "healthy") {
        result.healthy++;
      } else {
        result.broken++;
      }

      const update: VideoLinkUpdate = {
        health_status: healthStatus,
        last_health_check: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("video_links")
        .update(update)
        .eq("id", link.id);

      if (updateError) {
        logger.error(`Failed to update health status for link ${link.id}`, updateError);
      }
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }

    logger.error("Unexpected error in cron/video-health-check", error);
    throw createError({
      statusCode: 500,
      message: "Failed to run video-health-check cron job",
    });
  }
});
