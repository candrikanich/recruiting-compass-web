import {
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  setHeader,
} from "h3";
import type { PublicProfileData } from "~/types/models";
import { STATIC_MARKDOWN } from "~/server/agent-content/static";
import { renderProfileMarkdown } from "~/server/agent-content/profile";
import { shouldServeMarkdown } from "~/server/agent-content/negotiation";

const PROFILE_PATH_RE = /^\/p\/([a-z0-9]{6}|[a-z0-9][a-z0-9-]{0,28}[a-z0-9])$/;

export default defineEventHandler(async (event) => {
  const method = event.method;
  if (method !== "GET" && method !== "HEAD") return;

  const accept = getRequestHeader(event, "accept");
  if (!shouldServeMarkdown(accept)) return;

  const url = getRequestURL(event);
  const rawPath = url.pathname;
  const path =
    rawPath.length > 1 && rawPath.endsWith("/")
      ? rawPath.slice(0, -1)
      : rawPath;

  let body: string | null = null;

  if (Object.hasOwn(STATIC_MARKDOWN, path)) {
    body = STATIC_MARKDOWN[path];
  } else {
    const profileMatch = path.match(PROFILE_PATH_RE);
    if (profileMatch) {
      const slug = profileMatch[1];
      try {
        const profile = await $fetch<PublicProfileData>(
          `/api/public/profile/${slug}`,
          {
            baseURL: `${url.protocol}//${url.host}`,
            headers: { accept: "application/json" },
          },
        );
        body = renderProfileMarkdown(slug, profile);
      } catch {
        // Profile not found / unpublished — fall through to default routing
        // so the client gets the normal 404/410 HTML response.
        return;
      }
    }
  }

  if (body === null) return;

  setHeader(event, "Content-Type", "text/markdown; charset=utf-8");
  setHeader(event, "Vary", "Accept");
  setHeader(event, "X-Markdown-Tokens", String(Math.ceil(body.length / 4)));

  if (method === "HEAD") return "";
  return body;
});
