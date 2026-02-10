import type { BadgeColor } from "~/components/DesignSystem/Badge.vue";

/**
 * Sentiment types for interactions
 */
export type Sentiment =
  | "very_positive"
  | "positive"
  | "neutral"
  | "negative"
  | null;

/**
 * Get badge color for a given sentiment value
 */
export const getSentimentBadgeColor = (
  sentiment: string | null | undefined,
): BadgeColor => {
  if (!sentiment) return "slate";

  const sentimentMap: Record<string, BadgeColor> = {
    very_positive: "emerald",
    positive: "blue",
    neutral: "slate",
    negative: "red",
  };

  return sentimentMap[sentiment] || "slate";
};

/**
 * Get direction badge color (inbound/outbound)
 */
export const getDirectionBadgeColor = (
  direction: string | undefined,
): BadgeColor => {
  if (direction === "inbound") return "emerald";
  if (direction === "outbound") return "purple";
  return "slate";
};

/**
 * Get interaction type badge color
 */
export const getTypeBadgeColor = (_type: string | undefined): BadgeColor => {
  return "blue";
};
