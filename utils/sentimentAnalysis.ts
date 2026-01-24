/**
 * Simple sentiment analysis utility for social media posts
 * Uses keyword-based analysis for recruiting context
 */

type Sentiment = "very_positive" | "positive" | "neutral" | "negative";

interface SentimentResult {
  sentiment: Sentiment;
  score: number; // -1 to 1
  keywords: string[];
}

// Recruiting-specific positive keywords
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
  "amazing",
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
  "champion",
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
  "worried",
];

/**
 * Analyze sentiment of social media post content
 */
export function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];

  let score = 0;

  // Check very positive keywords (weight: +0.3)
  for (const keyword of VERY_POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 0.3;
      foundKeywords.push(keyword);
    }
  }

  // Check positive keywords (weight: +0.15)
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score += 0.15;
      foundKeywords.push(keyword);
    }
  }

  // Check negative keywords (weight: -0.25)
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      score -= 0.25;
      foundKeywords.push(keyword);
    }
  }

  // Clamp score between -1 and 1
  score = Math.max(-1, Math.min(1, score));

  // Determine sentiment category
  let sentiment: Sentiment;
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
    keywords: [...new Set(foundKeywords)],
  };
}

/**
 * Get emoji for sentiment display
 */
export function getSentimentEmoji(
  sentiment: Sentiment | null | undefined,
): string {
  switch (sentiment) {
    case "very_positive":
      return "🔥";
    case "positive":
      return "👍";
    case "negative":
      return "👎";
    case "neutral":
    default:
      return "😐";
  }
}

/**
 * Get color class for sentiment badge
 */
export function getSentimentColor(
  sentiment: Sentiment | null | undefined,
): string {
  switch (sentiment) {
    case "very_positive":
      return "bg-green-100 text-green-800";
    case "positive":
      return "bg-blue-100 text-blue-800";
    case "negative":
      return "bg-red-100 text-red-800";
    case "neutral":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get label for sentiment
 */
export function getSentimentLabel(
  sentiment: Sentiment | null | undefined,
): string {
  switch (sentiment) {
    case "very_positive":
      return "Very Positive";
    case "positive":
      return "Positive";
    case "negative":
      return "Negative";
    case "neutral":
    default:
      return "Neutral";
  }
}
