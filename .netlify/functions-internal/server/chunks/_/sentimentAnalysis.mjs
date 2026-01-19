import { b as sanitizeHtml } from './sanitize.mjs';

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
class TwitterService {
  constructor(bearerToken) {
    __publicField$1(this, "bearerToken");
    __publicField$1(this, "apiUrl", "https://api.twitter.com/2");
    this.bearerToken = bearerToken;
  }
  /**
   * Fetch tweets for a single Twitter handle
   */
  async getUserTweets(username, maxResults = 10) {
    var _a, _b;
    if (!this.bearerToken) {
      console.warn("Twitter Bearer Token not configured");
      return [];
    }
    try {
      const userResponse = await fetch(
        `${this.apiUrl}/users/by/username/${encodeURIComponent(username)}`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`
          }
        }
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
      const userData = await userResponse.json();
      const userId = userData.data.id;
      const tweetsResponse = await fetch(
        `${this.apiUrl}/users/${userId}/tweets?max_results=${Math.min(maxResults, 100)}&tweet.fields=created_at,public_metrics&expansions=author_id&user.fields=username,name`,
        {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`
          }
        }
      );
      if (!tweetsResponse.ok) {
        if (tweetsResponse.status === 429) {
          console.error("Twitter API rate limit exceeded");
          return [];
        }
        throw new Error(`Twitter tweets fetch failed: ${tweetsResponse.status}`);
      }
      const tweetsData = await tweetsResponse.json();
      const user = (_b = (_a = tweetsData.includes) == null ? void 0 : _a.users) == null ? void 0 : _b[0];
      if (!tweetsData.data) {
        return [];
      }
      return tweetsData.data.map((tweet) => ({
        platform: "twitter",
        post_url: `https://twitter.com/${userData.data.username}/status/${tweet.id}`,
        // Sanitize external content to prevent XSS
        post_content: sanitizeHtml(tweet.text),
        post_date: tweet.created_at,
        author_name: sanitizeHtml((user == null ? void 0 : user.name) || userData.data.name),
        author_handle: sanitizeHtml(userData.data.username),
        engagement_count: tweet.public_metrics.like_count + tweet.public_metrics.retweet_count + tweet.public_metrics.reply_count,
        is_recruiting_related: this.isRecruitingRelated(tweet.text)
      }));
    } catch (error) {
      console.error(`Error fetching tweets for ${username}:`, error);
      return [];
    }
  }
  /**
   * Fetch tweets from multiple Twitter handles in parallel
   */
  async fetchTweetsForHandles(handles) {
    const results = await Promise.all(
      handles.map((handle) => this.getUserTweets(handle))
    );
    return results.flat();
  }
  /**
   * Simple heuristic to detect if tweet is recruiting-related
   */
  isRecruitingRelated(text) {
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
      "baseball"
    ];
    const lowerText = text.toLowerCase();
    return recruitingKeywords.some((keyword) => lowerText.includes(keyword));
  }
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class InstagramService {
  constructor(accessToken) {
    __publicField(this, "accessToken");
    __publicField(this, "apiUrl", "https://graph.instagram.com");
    this.accessToken = accessToken;
  }
  /**
   * Fetch media for a single Instagram handle
   */
  async getUserMedia(username, limit = 10) {
    if (!this.accessToken) {
      console.warn("Instagram Access Token not configured");
      return [];
    }
    try {
      const userResponse = await fetch(
        `${this.apiUrl}/ig_hashtag_search?user_id=${username}&fields=id,username&access_token=${this.accessToken}`,
        { method: "GET" }
      );
      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          console.warn(`Instagram user not found: ${username}`);
          return [];
        }
        if (userResponse.status === 429) {
          console.error("Instagram API rate limit exceeded");
          return [];
        }
        if (userResponse.status === 400) {
          console.warn(`Invalid Instagram user: ${username}`);
          return [];
        }
        throw new Error(`Instagram user lookup failed: ${userResponse.status}`);
      }
      const userData = await userResponse.json();
      if (!userData.data || userData.data.length === 0) {
        console.warn(`Instagram user not found: ${username}`);
        return [];
      }
      const userId = userData.data[0].id;
      const mediaResponse = await fetch(
        `${this.apiUrl}/${userId}/media?fields=id,caption,media_type,media_url,timestamp,like_count,comments_count&limit=${Math.min(limit, 50)}&access_token=${this.accessToken}`,
        { method: "GET" }
      );
      if (!mediaResponse.ok) {
        if (mediaResponse.status === 429) {
          console.error("Instagram API rate limit exceeded");
          return [];
        }
        throw new Error(`Instagram media fetch failed: ${mediaResponse.status}`);
      }
      const mediaData = await mediaResponse.json();
      if (!mediaData.data) {
        return [];
      }
      return mediaData.data.map((media) => ({
        platform: "instagram",
        post_url: `https://instagram.com/p/${media.id}/`,
        // Sanitize external content to prevent XSS
        post_content: sanitizeHtml(media.caption || `${media.media_type} post`),
        post_date: media.timestamp,
        author_name: sanitizeHtml(username),
        author_handle: sanitizeHtml(username),
        engagement_count: (media.like_count || 0) + (media.comments_count || 0),
        is_recruiting_related: this.isRecruitingRelated(media.caption || "")
      }));
    } catch (error) {
      console.error(`Error fetching media for ${username}:`, error);
      return [];
    }
  }
  /**
   * Fetch media from multiple Instagram handles in parallel
   */
  async fetchMediaForHandles(handles) {
    const results = await Promise.all(
      handles.map((handle) => this.getUserMedia(handle))
    );
    return results.flat();
  }
  /**
   * Simple heuristic to detect if post is recruiting-related
   */
  isRecruitingRelated(caption) {
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
      "baseball"
    ];
    const lowerCaption = caption.toLowerCase();
    return recruitingKeywords.some((keyword) => lowerCaption.includes(keyword));
  }
}

const VERY_POSITIVE_KEYWORDS = [
  "commit",
  "committed",
  "signed",
  "offer",
  "scholarship",
  "excited",
  "welcome",
  "officially",
  "proud",
  "congratulations",
  "congrats",
  "dream",
  "blessed",
  "honored",
  "thrilled",
  "amazing"
];
const POSITIVE_KEYWORDS = [
  "visit",
  "visited",
  "camp",
  "impressed",
  "great",
  "awesome",
  "looking forward",
  "interest",
  "interested",
  "talented",
  "prospect",
  "workout",
  "showcase",
  "opportunity",
  "potential",
  "strong",
  "thank",
  "thanks",
  "grateful",
  "love",
  "good",
  "nice",
  "excellent",
  "fantastic",
  "outstanding",
  "win",
  "victory",
  "champion"
];
const NEGATIVE_KEYWORDS = [
  "decommit",
  "decommitted",
  "declined",
  "unfortunately",
  "injury",
  "injured",
  "hurt",
  "loss",
  "lost",
  "disappointed",
  "frustrating",
  "cancelled",
  "canceled",
  "postponed",
  "concern",
  "worried"
];
function analyzeSentiment(text) {
  const lowerText = text.toLowerCase();
  const foundKeywords = [];
  let score = 0;
  for (const keyword of VERY_POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 0.3;
      foundKeywords.push(keyword);
    }
  }
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 0.15;
      foundKeywords.push(keyword);
    }
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score -= 0.25;
      foundKeywords.push(keyword);
    }
  }
  score = Math.max(-1, Math.min(1, score));
  let sentiment;
  if (score >= 0.5) {
    sentiment = "very_positive";
  } else if (score >= 0.15) {
    sentiment = "positive";
  } else if (score <= -0.15) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
  }
  return {
    sentiment,
    score: Math.round(score * 100) / 100,
    keywords: [...new Set(foundKeywords)]
  };
}

export { InstagramService as I, TwitterService as T, analyzeSentiment as a };
//# sourceMappingURL=sentimentAnalysis.mjs.map
