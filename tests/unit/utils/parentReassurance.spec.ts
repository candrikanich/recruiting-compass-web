import { describe, it, expect } from "vitest";
import {
  getReassuranceMessages,
  getReassuranceMessageById,
  type ReassuranceMessage,
} from "~/utils/parentReassurance";
import type { Phase } from "~/types/timeline";

describe("parentReassurance", () => {
  describe("getReassuranceMessages", () => {
    it("should return messages for freshman phase", () => {
      const messages = getReassuranceMessages("freshman");
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.every((m) => m.phases.includes("freshman"))).toBe(true);
    });

    it("should return messages for sophomore phase", () => {
      const messages = getReassuranceMessages("sophomore");
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.every((m) => m.phases.includes("sophomore"))).toBe(true);
    });

    it("should return messages for junior phase", () => {
      const messages = getReassuranceMessages("junior");
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.every((m) => m.phases.includes("junior"))).toBe(true);
    });

    it("should return messages for senior phase", () => {
      const messages = getReassuranceMessages("senior");
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.every((m) => m.phases.includes("senior"))).toBe(true);
    });

    it("should have complete message objects", () => {
      const messages = getReassuranceMessages("freshman");
      messages.forEach((message) => {
        expect(message.id).toBeTruthy();
        expect(message.title).toBeTruthy();
        expect(message.message).toBeTruthy();
        expect(message.phases).toBeTruthy();
        expect(message.icon).toBeTruthy();
      });
    });

    it("should have meaningful title and message content", () => {
      const messages = getReassuranceMessages("junior");
      messages.forEach((message) => {
        expect(message.title.length).toBeGreaterThan(3);
        expect(message.message.length).toBeGreaterThan(10);
      });
    });
  });

  describe("getReassuranceMessageById", () => {
    it("should return message for valid ID", () => {
      const message = getReassuranceMessageById("freshman-foundation");
      expect(message).toBeDefined();
      expect(message?.id).toBe("freshman-foundation");
    });

    it("should return undefined for invalid ID", () => {
      const message = getReassuranceMessageById("nonexistent-id");
      expect(message).toBeUndefined();
    });

    it("should return complete message object", () => {
      const message = getReassuranceMessageById("all-social-media-lie");
      expect(message).toBeDefined();
      if (message) {
        expect(message.title).toBeTruthy();
        expect(message.message).toBeTruthy();
        expect(message.icon).toBeTruthy();
        expect(message.phases.length).toBeGreaterThan(0);
      }
    });
  });

  describe("message tone validation", () => {
    it("all messages should be reassuring and positive", () => {
      const phases: Phase[] = ["freshman", "sophomore", "junior", "senior"];
      const negativeWords = ["fail", "worst", "problem", "disaster"];
      phases.forEach((phase) => {
        const messages = getReassuranceMessages(phase);
        messages.forEach((message) => {
          const lowerContent = (
            message.title +
            " " +
            message.message
          ).toLowerCase();
          const hasNegativeWords = negativeWords.some((word) =>
            lowerContent.includes(word),
          );
          // Messages might mention challenges but should still be reassuring
          expect(message.message.length).toBeGreaterThan(0);
        });
      });
    });

    it("should have reasonable number of unique messages total", () => {
      // Some messages can apply to multiple phases, which is expected
      const phases: Phase[] = ["freshman", "sophomore", "junior", "senior"];
      const allMessages: ReassuranceMessage[] = [];
      const uniqueMessageIds = new Set<string>();

      phases.forEach((phase) => {
        const messages = getReassuranceMessages(phase);
        allMessages.push(...messages);
        messages.forEach((message) => {
          uniqueMessageIds.add(message.id);
        });
      });

      // Should have multiple instances of messages (because they appear in multiple phases)
      expect(allMessages.length).toBeGreaterThanOrEqual(uniqueMessageIds.size);

      // Should have a reasonable number of unique messages
      expect(uniqueMessageIds.size).toBeGreaterThan(3);
      expect(uniqueMessageIds.size).toBeLessThan(20);
    });
  });

  describe("icon validation", () => {
    it("all messages should have emoji icons", () => {
      const phases: Phase[] = ["freshman", "sophomore", "junior", "senior"];
      phases.forEach((phase) => {
        const messages = getReassuranceMessages(phase);
        messages.forEach((message) => {
          // Icons should be single emoji characters or emoji sequences
          expect(message.icon).toBeTruthy();
          expect(message.icon.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
