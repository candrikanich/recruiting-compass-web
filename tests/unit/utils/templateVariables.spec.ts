import { describe, it, expect, vi } from "vitest";
import {
  AVAILABLE_VARIABLES,
  getVariable,
  getVariableNames,
} from "~/utils/templateVariables";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import type { CommunicationTemplate } from "~/types/models";

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user1" },
  })),
}));

describe("templateVariables", () => {
  describe("getVariable", () => {
    it("returns the matching variable for a known key", () => {
      const result = getVariable("playerName");
      expect(result).toEqual(
        expect.objectContaining({ key: "playerName", name: "Player Name" }),
      );
    });

    it("returns the highlightVideo variable", () => {
      const result = getVariable("highlightVideo");
      expect(result).toEqual(
        expect.objectContaining({
          key: "highlightVideo",
          name: "Highlight Video",
        }),
      );
    });

    it("returns the filmLinks variable", () => {
      const result = getVariable("filmLinks");
      expect(result).toEqual(
        expect.objectContaining({ key: "filmLinks", name: "Film Links" }),
      );
    });

    it("returns undefined for an unknown key", () => {
      expect(getVariable("notARealKey")).toBeUndefined();
    });
  });

  describe("getVariableNames", () => {
    it("returns every variable formatted as {{key}}", () => {
      const names = getVariableNames();
      expect(names).toHaveLength(AVAILABLE_VARIABLES.length);
      expect(names).toContain("{{playerName}}");
      expect(names).toContain("{{schoolName}}");
      expect(names).toContain("{{highlightVideo}}");
      expect(names).toContain("{{filmLinks}}");
      expect(names.every((n) => n.startsWith("{{") && n.endsWith("}}"))).toBe(
        true,
      );
    });
  });

  describe("template rendering with video variables", () => {
    it("substitutes {{highlightVideo}} via renderTemplate", () => {
      const { renderTemplate } = useCommunicationTemplates();
      const template = {
        id: "1",
        body: "Check out my film: {{highlightVideo}}",
      } as CommunicationTemplate;

      const result = renderTemplate(template, {
        highlightVideo: "https://hudl.com/x",
      });

      expect(result).toBe("Check out my film: https://hudl.com/x");
    });

    it("substitutes {{filmLinks}} via renderTemplate", () => {
      const { renderTemplate } = useCommunicationTemplates();
      const template = {
        id: "1",
        body: "Film:\n{{filmLinks}}",
      } as CommunicationTemplate;

      const filmLinks =
        "Highlights (HUDL): https://hudl.com/a\nGame Film (YOUTUBE): https://youtube.com/b";

      const result = renderTemplate(template, { filmLinks });

      expect(result).toBe(`Film:\n${filmLinks}`);
    });
  });
});
