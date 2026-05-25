import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  sanitizeHtml: (input: string | null | undefined) => input ?? "",
}));

import { TwitterService } from "~/server/utils/twitterService";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("TwitterService", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as never);
    Object.values(loggerMock).forEach((fn) => fn.mockClear());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getUserTweets", () => {
    it("returns [] and warns when bearer token is empty", async () => {
      const svc = new TwitterService("");
      const result = await svc.getUserTweets("coach");
      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Twitter Bearer Token not configured",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns [] on 404 user lookup", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("missing");
      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        "Twitter user not found: missing",
      );
    });

    it("returns [] and logs error on 429 user lookup", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 429));
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");
      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Twitter API rate limit exceeded",
      );
    });

    it("returns [] and logs caught error on non-429 user-lookup failure", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");
      expect(result).toEqual([]);
      const [msg, err] = loggerMock.error.mock.calls[0];
      expect(msg).toContain("Error fetching tweets for coach");
      expect((err as Error).message).toContain("500");
    });

    it("returns [] and logs error on 429 tweets fetch", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            data: { id: "uid", username: "coach", name: "Coach Name" },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({}, 429));
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");
      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Twitter API rate limit exceeded",
      );
    });

    it("returns [] on non-429 tweets fetch failure", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            data: { id: "uid", username: "coach", name: "Coach Name" },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({}, 503));
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");
      expect(result).toEqual([]);
      const [, err] = loggerMock.error.mock.calls[0];
      expect((err as Error).message).toContain("503");
    });

    it("returns [] when tweets payload has no data", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            data: { id: "uid", username: "coach", name: "Coach Name" },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({}));
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");
      expect(result).toEqual([]);
    });

    it("maps tweets to SocialMediaPostData with recruiting detection and includes user name", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            data: { id: "uid", username: "coach", name: "Fallback Name" },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [
              {
                id: "t1",
                text: "Excited to commit to State!",
                created_at: "2026-01-01T00:00:00Z",
                author_id: "uid",
                public_metrics: {
                  retweet_count: 2,
                  reply_count: 3,
                  like_count: 10,
                  quote_count: 1,
                },
              },
              {
                id: "t2",
                text: "Just a regular tweet",
                created_at: "2026-01-02T00:00:00Z",
                author_id: "uid",
                public_metrics: {
                  retweet_count: 0,
                  reply_count: 0,
                  like_count: 0,
                  quote_count: 0,
                },
              },
            ],
            includes: {
              users: [
                { id: "uid", username: "coach", name: "Included Coach Name" },
              ],
            },
          }),
        );
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        platform: "twitter",
        post_url: "https://twitter.com/coach/status/t1",
        post_content: "Excited to commit to State!",
        post_date: "2026-01-01T00:00:00Z",
        author_name: "Included Coach Name",
        author_handle: "coach",
        engagement_count: 15, // 10 + 2 + 3 (quote_count excluded by impl)
        is_recruiting_related: true,
      });
      expect(result[1]).toMatchObject({
        engagement_count: 0,
        is_recruiting_related: false,
      });
    });

    it("falls back to userData.data.name when includes.users is absent", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            data: { id: "uid", username: "coach", name: "Fallback Name" },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: [
              {
                id: "t1",
                text: "hello world",
                created_at: "2026-01-01T00:00:00Z",
                author_id: "uid",
                public_metrics: {
                  retweet_count: 0,
                  reply_count: 0,
                  like_count: 0,
                  quote_count: 0,
                },
              },
            ],
          }),
        );
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");
      expect(result[0].author_name).toBe("Fallback Name");
    });

    it("clamps max_results to 100 in the request URL", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            data: { id: "uid", username: "coach", name: "n" },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ data: [] }));
      const svc = new TwitterService("token");
      await svc.getUserTweets("coach", 9999);
      const tweetsUrl = fetchMock.mock.calls[1][0] as string;
      expect(tweetsUrl).toContain("max_results=100");
    });

    it("URL-encodes username in user lookup", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
      const svc = new TwitterService("token");
      await svc.getUserTweets("name with space");
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("name%20with%20space");
    });

    it("sends Bearer auth header on both requests", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            data: { id: "uid", username: "coach", name: "n" },
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ data: [] }));
      const svc = new TwitterService("secret-token");
      await svc.getUserTweets("coach");
      const [, lookupInit] = fetchMock.mock.calls[0];
      const [, tweetsInit] = fetchMock.mock.calls[1];
      expect(lookupInit.headers.Authorization).toBe("Bearer secret-token");
      expect(tweetsInit.headers.Authorization).toBe("Bearer secret-token");
    });

    it("catches fetch network errors and returns []", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));
      const svc = new TwitterService("token");
      const result = await svc.getUserTweets("coach");
      expect(result).toEqual([]);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe("fetchTweetsForHandles", () => {
    it("aggregates results from multiple handles", async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes("users/by/username/a")) {
          return jsonResponse({
            data: { id: "ua", username: "a", name: "A" },
          });
        }
        if (url.includes("users/by/username/b")) {
          return jsonResponse({
            data: { id: "ub", username: "b", name: "B" },
          });
        }
        if (url.includes("/users/ua/tweets")) {
          return jsonResponse({
            data: [
              {
                id: "t1",
                text: "scholarship news",
                created_at: "2026-01-01T00:00:00Z",
                author_id: "ua",
                public_metrics: {
                  retweet_count: 0,
                  reply_count: 0,
                  like_count: 5,
                  quote_count: 0,
                },
              },
            ],
          });
        }
        if (url.includes("/users/ub/tweets")) {
          return jsonResponse({ data: [] });
        }
        throw new Error(`Unexpected URL: ${url}`);
      });

      const svc = new TwitterService("token");
      const result = await svc.fetchTweetsForHandles(["a", "b"]);
      expect(result).toHaveLength(1);
      expect(result[0].author_handle).toBe("a");
      expect(result[0].is_recruiting_related).toBe(true);
    });

    it("returns [] for empty handle list", async () => {
      const svc = new TwitterService("token");
      const result = await svc.fetchTweetsForHandles([]);
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
