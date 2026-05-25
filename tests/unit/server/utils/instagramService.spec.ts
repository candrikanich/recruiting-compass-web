import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoisted shared logger mock — vi.hoisted gives us a reference safe to use
// inside vi.mock factories.
const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => loggerMock,
}));

vi.mock("~/utils/validation/sanitize", () => ({
  // Identity sanitizer keeps assertions readable; XSS sanitization itself is
  // tested in the sanitize util spec.
  sanitizeHtml: (input: string | null | undefined) => input ?? "",
}));

import { InstagramService } from "~/server/utils/instagramService";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("InstagramService", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as never);
    Object.values(loggerMock).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getUserMedia", () => {
    it("returns [] and warns when access token is empty", async () => {
      const svc = new InstagramService("");
      const result = await svc.getUserMedia("athletics");
      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Instagram Access Token not configured",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns [] when user lookup returns 404", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("ghostuser");
      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Instagram user not found: ghostuser",
      );
    });

    it("returns [] and logs error on 429 rate limit at lookup", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Instagram API rate limit exceeded",
      );
    });

    it("returns [] on 400 invalid user", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 400));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("bad name");
      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Invalid Instagram user: bad name",
      );
    });

    it("returns [] and logs when user lookup throws on other status", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalled();
      const [msg, err] = loggerMock.error.mock.calls[0];
      expect(msg).toContain("Error fetching media for athlete");
      expect((err as Error).message).toContain("500");
    });

    it("returns [] when user data array is empty", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Instagram user not found: athlete",
      );
    });

    it("returns [] when user data field is missing", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
    });

    it("returns [] and logs error when media fetch responds 429", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ data: [{ id: "u1", username: "athlete" }] }),
        )
        .mockResolvedValueOnce(jsonResponse({}, 429));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Instagram API rate limit exceeded",
      );
    });

    it("throws and returns [] when media fetch fails with non-429", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ data: [{ id: "u1", username: "athlete" }] }),
        )
        .mockResolvedValueOnce(jsonResponse({}, 502));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
      const [msg, err] = loggerMock.error.mock.calls[0];
      expect(msg).toContain("Error fetching media for athlete");
      expect((err as Error).message).toContain("502");
    });

    it("returns [] when media data field is absent", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ data: [{ id: "u1", username: "athlete" }] }),
        )
        .mockResolvedValueOnce(jsonResponse({}));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
    });

    it("maps media to SocialMediaPostData and detects recruiting keywords", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ data: [{ id: "u1", username: "athlete" }] }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [
              {
                id: "post-1",
                caption: "Big recruit visit today!",
                media_type: "IMAGE",
                media_url: "https://example.com/img.jpg",
                timestamp: "2026-01-01T00:00:00Z",
                like_count: 10,
                comments_count: 5,
              },
              {
                id: "post-2",
                caption: undefined,
                media_type: "VIDEO",
                media_url: "https://example.com/v.mp4",
                timestamp: "2026-01-02T00:00:00Z",
              },
            ],
          }),
        );
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete", 5);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        platform: "instagram",
        post_url: "https://instagram.com/p/post-1/",
        post_content: "Big recruit visit today!",
        post_date: "2026-01-01T00:00:00Z",
        author_name: "athlete",
        author_handle: "athlete",
        engagement_count: 15,
        is_recruiting_related: true,
      });
      // Missing caption falls back to "VIDEO post" and no recruiting keyword
      expect(result[1]).toMatchObject({
        platform: "instagram",
        post_url: "https://instagram.com/p/post-2/",
        post_content: "VIDEO post",
        engagement_count: 0,
        is_recruiting_related: false,
      });

      // Verify limit is clamped to 50
      const svc2 = new InstagramService("token");
      fetchMock.mockReset();
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ data: [{ id: "u1", username: "x" }] }),
        )
        .mockResolvedValueOnce(jsonResponse({ data: [] }));
      await svc2.getUserMedia("x", 999);
      const lastCall = fetchMock.mock.calls[1][0] as string;
      expect(lastCall).toContain("limit=50");
    });

    it("catches fetch network errors and returns []", async () => {
      fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
      const svc = new InstagramService("token");
      const result = await svc.getUserMedia("athlete");
      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe("fetchMediaForHandles", () => {
    it("aggregates results from multiple handles", async () => {
      // Parallel Promise.all means fetch order is not guaranteed.
      // Route by URL instead of relying on call order.
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes("ig_hashtag_search")) {
          if (url.includes("user_id=a")) {
            return jsonResponse({ data: [{ id: "ua", username: "a" }] });
          }
          if (url.includes("user_id=b")) {
            return jsonResponse({ data: [{ id: "ub", username: "b" }] });
          }
        }
        if (url.includes("/ua/media")) {
          return jsonResponse({
            data: [
              {
                id: "p1",
                caption: "scholarship offer",
                media_type: "IMAGE",
                media_url: "x",
                timestamp: "2026-01-01T00:00:00Z",
              },
            ],
          });
        }
        if (url.includes("/ub/media")) {
          return jsonResponse({ data: [] });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const svc = new InstagramService("token");
      const result = await svc.fetchMediaForHandles(["a", "b"]);
      expect(result).toHaveLength(1);
      expect(result[0].author_handle).toBe("a");
      expect(result[0].is_recruiting_related).toBe(true);
    });

    it("returns [] for empty handle list", async () => {
      const svc = new InstagramService("token");
      const result = await svc.fetchMediaForHandles([]);
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
