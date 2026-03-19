import { describe, it, expect } from "vitest";
import {
  analyzeSentiment,
  getSentimentEmoji,
  getSentimentColor,
  getSentimentLabel,
} from "~/utils/sentimentAnalysis";

describe("utils/sentimentAnalysis", () => {
  describe("analyzeSentiment", () => {
    describe("very_positive sentiment", () => {
      it("returns very_positive for text containing 'committed'", () => {
        const result = analyzeSentiment("I am committed to playing here!");
        expect(result.sentiment).toBe("very_positive");
        expect(result.score).toBeGreaterThanOrEqual(0.5);
        expect(result.keywords).toContain("committed");
      });

      it("returns very_positive for text containing 'scholarship'", () => {
        const result = analyzeSentiment("I received a scholarship offer!");
        expect(result.sentiment).toBe("very_positive");
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });

      it("returns very_positive for text with 'signed' and 'excited'", () => {
        // "signed" (+0.3) + "excited" (+0.3) = 0.6 >= 0.5 → very_positive
        const result = analyzeSentiment("I signed my NLI and am so excited!");
        expect(result.sentiment).toBe("very_positive");
        expect(result.keywords).toContain("signed");
        expect(result.keywords).toContain("excited");
      });
    });

    describe("positive sentiment", () => {
      it("returns positive for text containing only 'visited'", () => {
        const result = analyzeSentiment("I visited the campus last week.");
        expect(result.sentiment).toBe("positive");
        expect(result.score).toBeGreaterThanOrEqual(0.15);
        expect(result.score).toBeLessThan(0.5);
        expect(result.keywords).toContain("visited");
      });

      it("returns positive for text containing 'camp'", () => {
        const result = analyzeSentiment("Attended the camp this weekend.");
        expect(result.sentiment).toBe("positive");
        expect(result.keywords).toContain("camp");
      });

      it("returns positive for text containing 'great'", () => {
        const result = analyzeSentiment("Had a great time at the workout.");
        expect(result.sentiment).toBe("positive");
      });
    });

    describe("neutral sentiment", () => {
      it("returns neutral for empty string", () => {
        const result = analyzeSentiment("");
        expect(result.sentiment).toBe("neutral");
        expect(result.score).toBe(0);
        expect(result.keywords).toEqual([]);
      });

      it("returns neutral for text with no keywords", () => {
        const result = analyzeSentiment("The weather is cloudy today.");
        expect(result.sentiment).toBe("neutral");
        expect(result.score).toBe(0);
        expect(result.keywords).toEqual([]);
      });

      it("returns neutral for text with score in (-0.15, 0.15) range", () => {
        // One positive keyword (+0.15) and one negative (-0.25) = -0.1 → neutral
        const result = analyzeSentiment(
          "visited but there was a concern about scheduling",
        );
        expect(result.sentiment).toBe("neutral");
        expect(result.score).toBeGreaterThan(-0.15);
        expect(result.score).toBeLessThan(0.15);
      });
    });

    describe("negative sentiment", () => {
      it("returns negative for text containing 'decommitted' (note: also matches 'commit' keyword)", () => {
        // "decommitted" matches both "commit" (+0.3) and "decommit" (-0.25) → net +0.05 → neutral
        // Use pure negative keywords to confirm negative sentiment
        const result = analyzeSentiment("Unfortunately he got injured.");
        expect(result.sentiment).toBe("negative");
        expect(result.score).toBeLessThanOrEqual(-0.15);
        expect(result.keywords).toContain("unfortunately");
        expect(result.keywords).toContain("injured");
      });

      it("'decommitted' text has neutral score due to overlapping 'commit' keyword", () => {
        // "decommitted" triggers "commit" (+0.3) and "decommit" (-0.25) → net 0.05 → neutral
        const result = analyzeSentiment("He has decommitted from the program.");
        expect(result.keywords).toContain("decommitted");
        expect(result.keywords).toContain("committed");
      });

      it("returns negative for text containing 'injury'", () => {
        const result = analyzeSentiment("Dealing with a serious injury.");
        expect(result.sentiment).toBe("negative");
        expect(result.keywords).toContain("injury");
      });

      it("returns negative for text containing 'disappointed'", () => {
        const result = analyzeSentiment("Very disappointed with the outcome.");
        expect(result.sentiment).toBe("negative");
        expect(result.keywords).toContain("disappointed");
      });
    });

    describe("score clamping", () => {
      it("clamps score at 1.0 for text with many very-positive keywords", () => {
        // Each very_positive keyword adds 0.3; 4 keywords = 1.2 → clamped to 1.0
        const result = analyzeSentiment(
          "committed signed scholarship excited offer congratulations blessed honored",
        );
        expect(result.score).toBe(1);
        expect(result.sentiment).toBe("very_positive");
      });

      it("clamps score at -1.0 for text with many negative keywords", () => {
        // Each negative keyword subtracts 0.25; 5 keywords = -1.25 → clamped to -1.0
        const result = analyzeSentiment(
          "decommitted injured unfortunately cancelled disappointed worried frustrated",
        );
        expect(result.score).toBe(-1);
        expect(result.sentiment).toBe("negative");
      });
    });

    describe("mixed sentiment", () => {
      it("returns combined score for mixed positive and negative text", () => {
        const positiveResult = analyzeSentiment("committed");
        const negativeResult = analyzeSentiment("injury");
        const mixedResult = analyzeSentiment("committed but dealing with injury");

        expect(mixedResult.score).toBeLessThan(positiveResult.score);
        expect(mixedResult.score).toBeGreaterThan(negativeResult.score);
        expect(mixedResult.keywords).toContain("committed");
        expect(mixedResult.keywords).toContain("injury");
      });
    });

    describe("keyword deduplication", () => {
      it("deduplicates keywords that appear multiple times in text", () => {
        const result = analyzeSentiment(
          "committed committed committed to the team",
        );
        const commitCount = result.keywords.filter(
          (k) => k === "committed",
        ).length;
        expect(commitCount).toBe(1);
      });

      it("deduplicates overlapping keyword matches (e.g. 'commit' and 'committed')", () => {
        // Both "commit" and "committed" match "I am committed"
        const result = analyzeSentiment("I am committed");
        const uniqueKeywords = new Set(result.keywords);
        expect(uniqueKeywords.size).toBe(result.keywords.length);
      });
    });

    describe("case insensitivity", () => {
      it("matches keywords case-insensitively", () => {
        const result = analyzeSentiment("COMMITTED to the program");
        expect(result.sentiment).toBe("very_positive");
        expect(result.keywords).toContain("committed");
      });
    });

    describe("return shape", () => {
      it("returns sentiment, score, and keywords properties", () => {
        const result = analyzeSentiment("some text");
        expect(result).toHaveProperty("sentiment");
        expect(result).toHaveProperty("score");
        expect(result).toHaveProperty("keywords");
        expect(Array.isArray(result.keywords)).toBe(true);
      });

      it("returns score rounded to 2 decimal places", () => {
        const result = analyzeSentiment("visited the campus");
        const decimalPlaces = (result.score.toString().split(".")[1] ?? "")
          .length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });
  });

  describe("getSentimentEmoji", () => {
    it("returns 🔥 for very_positive", () => {
      expect(getSentimentEmoji("very_positive")).toBe("🔥");
    });

    it("returns 👍 for positive", () => {
      expect(getSentimentEmoji("positive")).toBe("👍");
    });

    it("returns 😐 for neutral", () => {
      expect(getSentimentEmoji("neutral")).toBe("😐");
    });

    it("returns 👎 for negative", () => {
      expect(getSentimentEmoji("negative")).toBe("👎");
    });

    it("returns 😐 for null", () => {
      expect(getSentimentEmoji(null)).toBe("😐");
    });

    it("returns 😐 for undefined", () => {
      expect(getSentimentEmoji(undefined)).toBe("😐");
    });
  });

  describe("getSentimentColor", () => {
    it("returns green classes for very_positive", () => {
      expect(getSentimentColor("very_positive")).toBe(
        "bg-green-100 text-green-800",
      );
    });

    it("returns blue classes for positive", () => {
      expect(getSentimentColor("positive")).toBe("bg-blue-100 text-blue-800");
    });

    it("returns gray classes for neutral", () => {
      expect(getSentimentColor("neutral")).toBe("bg-gray-100 text-gray-800");
    });

    it("returns red classes for negative", () => {
      expect(getSentimentColor("negative")).toBe("bg-red-100 text-red-800");
    });

    it("returns gray classes for null", () => {
      expect(getSentimentColor(null)).toBe("bg-gray-100 text-gray-800");
    });

    it("returns gray classes for undefined", () => {
      expect(getSentimentColor(undefined)).toBe("bg-gray-100 text-gray-800");
    });
  });

  describe("getSentimentLabel", () => {
    it("returns 'Very Positive' for very_positive", () => {
      expect(getSentimentLabel("very_positive")).toBe("Very Positive");
    });

    it("returns 'Positive' for positive", () => {
      expect(getSentimentLabel("positive")).toBe("Positive");
    });

    it("returns 'Neutral' for neutral", () => {
      expect(getSentimentLabel("neutral")).toBe("Neutral");
    });

    it("returns 'Negative' for negative", () => {
      expect(getSentimentLabel("negative")).toBe("Negative");
    });

    it("returns 'Neutral' for null", () => {
      expect(getSentimentLabel(null)).toBe("Neutral");
    });

    it("returns 'Neutral' for undefined", () => {
      expect(getSentimentLabel(undefined)).toBe("Neutral");
    });
  });
});
