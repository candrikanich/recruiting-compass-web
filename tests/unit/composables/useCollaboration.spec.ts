import { describe, it, expect, beforeEach } from "vitest";
import { useCollaboration } from "~/composables/useCollaboration";

describe("useCollaboration", () => {
  let collaboration: ReturnType<typeof useCollaboration>;

  beforeEach(() => {
    collaboration = useCollaboration();
  });

  describe("initialization", () => {
    it("should initialize with empty shared records", () => {
      expect(collaboration.sharedRecords).toBeDefined();
      expect(Array.isArray(collaboration.sharedRecords.value)).toBe(true);
    });

    it("should initialize with empty comments", () => {
      expect(collaboration.recordComments).toBeDefined();
      expect(Array.isArray(collaboration.recordComments.value)).toBe(true);
    });

    it("should initialize with empty team members", () => {
      expect(collaboration.teamMembers).toBeDefined();
      expect(Array.isArray(collaboration.teamMembers.value)).toBe(true);
    });
  });

  describe("API surface", () => {
    it("should expose sharing methods", () => {
      expect(typeof collaboration.shareRecord).toBe("function");
      expect(typeof collaboration.revokeAccess).toBe("function");
      expect(typeof collaboration.updateAccessLevel).toBe("function");
    });

    it("should expose comment methods", () => {
      expect(typeof collaboration.addComment).toBe("function");
      expect(typeof collaboration.deleteComment).toBe("function");
    });

    it("should expose team members", () => {
      expect(collaboration.teamMembers).toBeDefined();
      expect(collaboration.activeTeamMembers).toBeDefined();
    });

    it("should expose filtered views", () => {
      expect(collaboration.mySharedRecords).toBeDefined();
      expect(collaboration.sharedWithMe).toBeDefined();
    });

    it("should expose loading and error states", () => {
      expect(collaboration.isLoading).toBeDefined();
      expect(collaboration.error).toBeDefined();
    });
  });

  describe("state management", () => {
    it("should have no shared records initially", () => {
      expect(collaboration.sharedRecords.value.length).toBe(0);
    });

    it("should have no comments initially", () => {
      expect(collaboration.recordComments.value.length).toBe(0);
    });

    it("should have no team members initially", () => {
      expect(collaboration.teamMembers.value.length).toBe(0);
    });
  });
});
