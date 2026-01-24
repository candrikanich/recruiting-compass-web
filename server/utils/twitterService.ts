/**
 * Twitter API v2 Service
 * Handles fetching tweets from coaches and programs
 */

import { sanitizeHtml } from "~/utils/validation/sanitize";

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface TwitterApiResponse {
  data: TwitterTweet[];
  includes?: {
    users: TwitterUser[];
  };
}

interface SocialMediaPostData {
  platform: "twitter" | "instagram";
  post_url: string;
  post_content: string;
  post_date: string;
  author_name: string;
  author_handle: string;
  engagement_count: number;
  is_recruiting_related: boolean;
}

export class TwitterService {
  private bearerToken: string;
  private apiUrl = "https://api.twitter.com/2";

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  /**
   * Fetch tweets for a single Twitter handle
   */
  async getUserTweets(
    username: string,
    maxResults: number = 10,
  ): Promise<SocialMediaPostData[]> {
    if (!this.bearerToken) {
      console.warn("Twitter Bearer Token not configured");
      return [];
    }

    try {
      // First, get user ID from username
      const userResponse = await fetch(
        `${this.apiUrl}/users/by/username/${encodeURIComponent(username)}`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          console.warn(`Twitter user not found: ${username}`);
          return [];
        }
        if (userResponse.status === 429) {
          console.error("Twitter API rate limit exceeded");
          return [];
        }
        throw new Error(`Twitter user lookup failed: ${userResponse.status}`);
      }

      const userData = (await userResponse.json()) as {
        data: { id: string; username: string; name: string };
      };
      const userId = userData.data.id;

      // Then fetch recent tweets from this user
      const tweetsResponse = await fetch(
        `${this.apiUrl}/users/${userId}/tweets?` +
          `max_results=${Math.min(maxResults, 100)}&` +
          `tweet.fields=created_at,public_metrics&` +
          `expansions=author_id&` +
          `user.fields=username,name`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        },
      );

      if (!tweetsResponse.ok) {
        if (tweetsResponse.status === 429) {
          console.error("Twitter API rate limit exceeded");
          return [];
        }
        throw new Error(
          `Twitter tweets fetch failed: ${tweetsResponse.status}`,
        );
      }

      const tweetsData = (await tweetsResponse.json()) as TwitterApiResponse;
      const user = tweetsData.includes?.users?.[0];

      if (!tweetsData.data) {
        return [];
      }

      // Transform tweets to SocialMediaPostData format
      return tweetsData.data.map((tweet) => ({
        platform: "twitter" as const,
        post_url: `https://twitter.com/${userData.data.username}/status/${tweet.id}`,
        // Sanitize external content to prevent XSS
        post_content: sanitizeHtml(tweet.text),
        post_date: tweet.created_at,
        author_name: sanitizeHtml(user?.name || userData.data.name),
        author_handle: sanitizeHtml(userData.data.username),
        engagement_count:
          tweet.public_metrics.like_count +
          tweet.public_metrics.retweet_count +
          tweet.public_metrics.reply_count,
        is_recruiting_related: this.isRecruitingRelated(tweet.text),
      }));
    } catch (error) {
      console.error(`Error fetching tweets for ${username}:`, error);
      return [];
    }
  }

  /**
   * Fetch tweets from multiple Twitter handles in parallel
   */
  async fetchTweetsForHandles(
    handles: string[],
  ): Promise<SocialMediaPostData[]> {
    const results = await Promise.all(
      handles.map((handle) => this.getUserTweets(handle)),
    );
    return results.flat();
  }

  /**
   * Simple heuristic to detect if tweet is recruiting-related
   */
  private isRecruitingRelated(text: string): boolean {
    const recruitingKeywords = [
      "recruit",
      "scholarship",
      "offer",
      "commit",
      "committed",
      "signing day",
      "visit",
      "camp",
      "prospect",
      "elite",
      "ranked",
      "baseball",
    ];
    const lowerText = text.toLowerCase();
    return recruitingKeywords.some((keyword) => lowerText.includes(keyword));
  }
}
