import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  exportInteractionsToCSV,
  downloadInteractionsCSV,
} from "~/utils/interactions/exportCSV";
import type { Interaction } from "~/types/models";

describe("Interaction CSV Export", () => {
  let createObjectURLSpy: any;
  let appendChildSpy: any;
  let removeChildSpy: any;

  beforeEach(() => {
    createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:url");
    appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => null as any);
    removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => null as any);
  });

  // ============================================
  // exportInteractionsToCSV Tests
  // ============================================

  describe("exportInteractionsToCSV", () => {
    const createInteraction = (overrides?: Partial<Interaction>): Interaction =>
      ({
        id: "1",
        user_id: "user-1",
        school_id: "school-1",
        coach_id: "coach-1",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Test Subject",
        content: "Test Content",
        sentiment: "positive" as const,
        occurred_at: "2024-02-04T10:00:00Z",
        created_at: "2024-02-04T10:00:00Z",
        updated_at: "2024-02-04T10:00:00Z",
        attachment_count: 0,
        ...overrides,
      }) as Interaction;

    it("should return empty string for empty interactions array", () => {
      const result = exportInteractionsToCSV([]);

      expect(result).toBe("");
    });

    it("should include CSV headers", () => {
      const interactions = [createInteraction()];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain(
        '"Date","Type","Direction","School","Coach","Subject","Content","Sentiment"',
      );
    });

    it("should format single interaction correctly", () => {
      const interactions = [
        createInteraction({
          occurred_at: "2024-02-04T10:00:00Z",
          type: "email" as const,
          direction: "outbound" as const,
          subject: "Test Subject",
          content: "Test Content",
          sentiment: "positive" as const,
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain("2/4/2024");
      expect(result).toContain("email");
      expect(result).toContain("outbound");
      expect(result).toContain("Test Subject");
      expect(result).toContain("Test Content");
      expect(result).toContain("positive");
    });

    it("should format date correctly", () => {
      const interactions = [
        createInteraction({
          occurred_at: "2024-12-25T15:30:00Z",
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain("12/25/2024");
    });

    it("should escape quotes in content", () => {
      const interactions = [
        createInteraction({
          content: 'He said "hello"',
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain('""hello""');
    });

    it("should wrap all fields in quotes", () => {
      const interactions = [createInteraction()];

      const result = exportInteractionsToCSV(interactions);

      const lines = result.split("\n");
      expect(lines[0]).toMatch(/^".*",".*",".*"/);
    });

    it("should handle null sentiment", () => {
      const interactions = [
        createInteraction({
          sentiment: null as any,
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain('""');
    });

    it("should handle missing subject", () => {
      const interactions = [
        createInteraction({
          subject: null as any,
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toBeDefined();
    });

    it("should handle missing content", () => {
      const interactions = [
        createInteraction({
          content: null as any,
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toBeDefined();
    });

    it("should handle missing school_id", () => {
      const interactions = [
        createInteraction({
          school_id: null as any,
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain('""');
    });

    it("should handle missing coach_id", () => {
      const interactions = [
        createInteraction({
          coach_id: null as any,
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toBeDefined();
    });

    it("should export multiple interactions", () => {
      const interactions = [
        createInteraction({ id: "1", subject: "First" }),
        createInteraction({ id: "2", subject: "Second" }),
        createInteraction({ id: "3", subject: "Third" }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain("First");
      expect(result).toContain("Second");
      expect(result).toContain("Third");

      const lines = result.split("\n");
      expect(lines).toHaveLength(4); // 1 header + 3 data rows
    });

    it("should handle content with commas", () => {
      const interactions = [
        createInteraction({
          content: "Multiple, comma, separated, values",
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain('"Multiple, comma, separated, values"');
    });

    it("should handle content with newlines", () => {
      const interactions = [
        createInteraction({
          content: "Line 1\nLine 2\nLine 3",
        }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain("Line 1\nLine 2\nLine 3");
    });

    it("should handle different sentiment types", () => {
      const sentiments = [
        "positive",
        "negative",
        "neutral",
        "very_positive",
        "very_negative",
      ];
      const interactions = sentiments.map((sentiment) =>
        createInteraction({
          sentiment: sentiment as any,
        }),
      );

      const result = exportInteractionsToCSV(interactions);

      sentiments.forEach((sentiment) => {
        expect(result).toContain(sentiment);
      });
    });

    it("should handle different interaction types", () => {
      const types = ["email", "phone", "in_person", "message", "social_media"];
      const interactions = types.map((type) =>
        createInteraction({
          type: type as any,
        }),
      );

      const result = exportInteractionsToCSV(interactions);

      types.forEach((type) => {
        expect(result).toContain(type);
      });
    });

    it("should handle both inbound and outbound directions", () => {
      const interactions = [
        createInteraction({ direction: "outbound" as const }),
        createInteraction({ direction: "inbound" as const }),
      ];

      const result = exportInteractionsToCSV(interactions);

      expect(result).toContain("outbound");
      expect(result).toContain("inbound");
    });
  });

  // ============================================
  // downloadInteractionsCSV Tests
  // ============================================

  describe("downloadInteractionsCSV", () => {
    const createInteraction = (): Interaction =>
      ({
        id: "1",
        user_id: "user-1",
        school_id: "school-1",
        coach_id: "coach-1",
        type: "email" as const,
        direction: "outbound" as const,
        subject: "Test",
        content: "Content",
        sentiment: "positive" as const,
        occurred_at: "2024-02-04T10:00:00Z",
        created_at: "2024-02-04T10:00:00Z",
        updated_at: "2024-02-04T10:00:00Z",
        attachment_count: 0,
      }) as Interaction;

    it("should create blob with CSV content", () => {
      const interactions = [createInteraction()];
      const blobSpy = vi.spyOn(globalThis, "Blob" as any);

      downloadInteractionsCSV(interactions);

      expect(blobSpy).toHaveBeenCalled();
    });

    it("should use correct MIME type", () => {
      const interactions = [createInteraction()];
      const blobSpy = vi.spyOn(globalThis, "Blob" as any);

      downloadInteractionsCSV(interactions);

      const [, { type }] = blobSpy.mock.calls[0];
      expect(type).toBe("text/csv;charset=utf-8;");
    });

    it("should create download link", () => {
      const interactions = [createInteraction()];
      const createElementSpy = vi.spyOn(document, "createElement");

      downloadInteractionsCSV(interactions);

      expect(createElementSpy).toHaveBeenCalledWith("a");
    });

    it("should set href attribute from blob URL", () => {
      const interactions = [createInteraction()];
      const linkMock = {
        setAttribute: vi.fn(),
        style: { visibility: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(linkMock as any);

      downloadInteractionsCSV(interactions);

      expect(linkMock.setAttribute).toHaveBeenCalledWith("href", "blob:url");
    });

    it("should set download filename with current date", () => {
      const interactions = [createInteraction()];
      const linkMock = {
        setAttribute: vi.fn(),
        style: { visibility: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(linkMock as any);

      downloadInteractionsCSV(interactions);

      const dateStr = new Date().toISOString().split("T")[0];
      expect(linkMock.setAttribute).toHaveBeenCalledWith(
        "download",
        `interactions-${dateStr}.csv`,
      );
    });

    it("should set link visibility to hidden", () => {
      const interactions = [createInteraction()];
      const linkMock = {
        setAttribute: vi.fn(),
        style: { visibility: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(linkMock as any);

      downloadInteractionsCSV(interactions);

      expect(linkMock.style.visibility).toBe("hidden");
    });

    it("should append link to document body", () => {
      const interactions = [createInteraction()];
      const linkMock = {
        setAttribute: vi.fn(),
        style: { visibility: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(linkMock as any);

      downloadInteractionsCSV(interactions);

      expect(appendChildSpy).toHaveBeenCalledWith(linkMock);
    });

    it("should trigger click on link", () => {
      const interactions = [createInteraction()];
      const linkMock = {
        setAttribute: vi.fn(),
        style: { visibility: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(linkMock as any);

      downloadInteractionsCSV(interactions);

      expect(linkMock.click).toHaveBeenCalled();
    });

    it("should remove link from document after download", () => {
      const interactions = [createInteraction()];
      const linkMock = {
        setAttribute: vi.fn(),
        style: { visibility: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(linkMock as any);

      downloadInteractionsCSV(interactions);

      expect(removeChildSpy).toHaveBeenCalledWith(linkMock);
    });

    it("should return early if no interactions", () => {
      const linkSpy = vi.spyOn(document, "createElement");

      downloadInteractionsCSV([]);

      expect(linkSpy).not.toHaveBeenCalled();
    });

    it("should handle single interaction", () => {
      const interactions = [createInteraction()];

      expect(() => downloadInteractionsCSV(interactions)).not.toThrow();
    });

    it("should handle multiple interactions", () => {
      const interactions = [
        createInteraction(),
        createInteraction(),
        createInteraction(),
      ];

      expect(() => downloadInteractionsCSV(interactions)).not.toThrow();
    });
  });
});
