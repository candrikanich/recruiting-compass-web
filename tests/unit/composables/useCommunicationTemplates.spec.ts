import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import type { CommunicationTemplate } from "~/types/models";

// Mock Supabase
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({
              data: [],
              error: null,
            }),
          ),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: "1",
                name: "Test Template",
                template_type: "email",
                body: "Test body",
                subject: "Test subject",
                is_favorite: false,
                use_count: 0,
              } as CommunicationTemplate,
              error: null,
            }),
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            error: null,
          }),
        ),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            error: null,
          }),
        ),
      })),
    })),
  })),
}));

// Mock user store
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user1" },
  })),
}));

describe("useCommunicationTemplates", () => {
  let composable: ReturnType<typeof useCommunicationTemplates>;

  beforeEach(() => {
    vi.clearAllMocks();
    composable = useCommunicationTemplates();
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      expect(composable.templates.value).toEqual([]);
      expect(composable.isLoading.value).toBe(false);
      expect(composable.error.value).toBeNull();
    });

    it("should have computed properties", () => {
      expect(composable.emailTemplates).toBeDefined();
      expect(composable.messageTemplates).toBeDefined();
      expect(composable.phoneScriptTemplates).toBeDefined();
      expect(composable.favoriteTemplates).toBeDefined();
      expect(composable.allTemplates).toBeDefined();
    });

    it("should have CRUD methods", () => {
      expect(composable.loadTemplates).toBeDefined();
      expect(composable.createTemplate).toBeDefined();
      expect(composable.updateTemplate).toBeDefined();
      expect(composable.deleteTemplate).toBeDefined();
      expect(composable.toggleFavorite).toBeDefined();
    });
  });

  describe("template filtering", () => {
    beforeEach(() => {
      composable.templates.value = [
        {
          id: "1",
          name: "Email Template",
          type: "email",
          body: "Body",
          is_favorite: true,
          use_count: 5,
        } as CommunicationTemplate,
        {
          id: "2",
          name: "Message Template",
          type: "message",
          body: "Body",
          is_favorite: false,
          use_count: 2,
        } as CommunicationTemplate,
        {
          id: "3",
          name: "Phone Template",
          type: "phone_script",
          body: "Body",
          is_favorite: true,
          use_count: 1,
        } as CommunicationTemplate,
      ];
    });

    it("should filter email templates", () => {
      expect(composable.emailTemplates.value).toHaveLength(1);
      expect(composable.emailTemplates.value[0].type).toBe("email");
    });

    it("should filter message templates", () => {
      expect(composable.messageTemplates.value).toHaveLength(1);
      expect(composable.messageTemplates.value[0].type).toBe("message");
    });

    it("should filter phone script templates", () => {
      expect(composable.phoneScriptTemplates.value).toHaveLength(1);
      expect(composable.phoneScriptTemplates.value[0].type).toBe("phone_script");
    });

    it("should filter favorite templates", () => {
      expect(composable.favoriteTemplates.value).toHaveLength(2);
      expect(
        composable.favoriteTemplates.value.every((t) => t.is_favorite),
      ).toBe(true);
    });

    it("should sort favorites by use count descending", () => {
      const favorites = composable.favoriteTemplates.value;
      expect(favorites[0].use_count).toBeGreaterThanOrEqual(favorites[1].use_count);
    });
  });

  describe("renderTemplate", () => {
    it("should replace variables in template body", () => {
      const template: CommunicationTemplate = {
        id: "1",
        name: "Test",
        type: "email",
        body: "Hello {{playerName}}, your GPA is {{gpa}}",
        is_favorite: false,
        use_count: 0,
      } as CommunicationTemplate;

      const result = composable.renderTemplate(template, {
        playerName: "John",
        gpa: "3.8",
      });

      expect(result).toBe("Hello John, your GPA is 3.8");
    });

    it("should handle missing variables", () => {
      const template: CommunicationTemplate = {
        id: "1",
        name: "Test",
        type: "email",
        body: "Hello {{playerName}}",
        is_favorite: false,
        use_count: 0,
      } as CommunicationTemplate;

      const result = composable.renderTemplate(template, {});

      expect(result).toBe("Hello {{playerName}}");
    });

    it("should replace multiple occurrences", () => {
      const template: CommunicationTemplate = {
        id: "1",
        name: "Test",
        type: "email",
        body: "{{name}} {{name}} {{name}}",
        is_favorite: false,
        use_count: 0,
      } as CommunicationTemplate;

      const result = composable.renderTemplate(template, { name: "John" });

      expect(result).toBe("John John John");
    });
  });

  describe("interpolateTemplate", () => {
    it("should be alias for renderTemplate", () => {
      const template: CommunicationTemplate = {
        id: "1",
        name: "Test",
        type: "email",
        body: "Hello {{name}}",
        is_favorite: false,
        use_count: 0,
      } as CommunicationTemplate;

      const renderResult = composable.renderTemplate(template, {
        name: "John",
      });
      const interpolateResult = composable.interpolateTemplate(template, {
        name: "John",
      });

      expect(renderResult).toBe(interpolateResult);
    });
  });

  describe("getTemplate", () => {
    it("should find template by id", () => {
      const template: CommunicationTemplate = {
        id: "1",
        name: "Test",
        type: "email",
        body: "Body",
        is_favorite: false,
        use_count: 0,
      } as CommunicationTemplate;

      composable.templates.value = [template];
      const result = composable.getTemplate("1");

      expect(result).toEqual(template);
    });

    it("should return undefined if template not found", () => {
      composable.templates.value = [];
      const result = composable.getTemplate("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("getTemplatesByType", () => {
    beforeEach(() => {
      composable.templates.value = [
        {
          id: "1",
          type: "email",
          name: "Email",
          body: "Body",
          is_favorite: false,
          use_count: 0,
        } as CommunicationTemplate,
        {
          id: "2",
          type: "email",
          name: "Email 2",
          body: "Body",
          is_favorite: false,
          use_count: 0,
        } as CommunicationTemplate,
        {
          id: "3",
          type: "message",
          name: "Message",
          body: "Body",
          is_favorite: false,
          use_count: 0,
        } as CommunicationTemplate,
      ];
    });

    it("should return templates of specified type", () => {
      const emailTemplates = composable.getTemplatesByType("email");
      expect(emailTemplates).toHaveLength(2);
      expect(emailTemplates.every((t) => t.type === "email")).toBe(true);
    });

    it("should return empty array if no templates match", () => {
      const result = composable.getTemplatesByType("phone_script");
      expect(result).toHaveLength(0);
    });
  });

  describe("searchTemplates", () => {
    beforeEach(() => {
      composable.templates.value = [
        {
          id: "1",
          type: "email",
          name: "Welcome Email",
          body: "Welcome to the program",
          tags: ["greeting", "introduction"],
          is_favorite: false,
          use_count: 0,
        } as CommunicationTemplate,
        {
          id: "2",
          type: "email",
          name: "Offer Confirmation",
          body: "Congratulations on your offer",
          tags: ["offer"],
          is_favorite: false,
          use_count: 0,
        } as CommunicationTemplate,
      ];
    });

    it("should find templates by name", () => {
      const results = composable.searchTemplates("Welcome");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Welcome Email");
    });

    it("should find templates by body content", () => {
      const results = composable.searchTemplates("Congratulations");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Offer Confirmation");
    });

    it("should find templates by tag", () => {
      const results = composable.searchTemplates("greeting");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Welcome Email");
    });

    it("should be case-insensitive", () => {
      const results = composable.searchTemplates("welcome");
      expect(results).toHaveLength(1);
    });

    it("should filter by type if provided", () => {
      composable.templates.value.push({
        id: "3",
        type: "message",
        name: "Welcome Message",
        body: "Welcome",
        is_favorite: false,
        use_count: 0,
      } as CommunicationTemplate);

      const results = composable.searchTemplates("Welcome", "email");
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("email");
    });

    it("should return all templates if query is empty", () => {
      const results = composable.searchTemplates("");
      expect(results).toHaveLength(composable.templates.value.length);
    });
  });
});
