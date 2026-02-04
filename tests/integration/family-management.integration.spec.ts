import { describe, it, expect } from "vitest";
import { useFamilyInvite } from "~/composables/useFamilyInvite";
import { useParentPreviewMode } from "~/composables/useParentPreviewMode";

describe("Family Management Integration", () => {
  describe("useFamilyInvite composable", () => {
    it("should provide family invite functions", () => {
      const familyInvite = useFamilyInvite();
      expect(familyInvite).toHaveProperty("loading");
      expect(familyInvite).toHaveProperty("error");
      expect(familyInvite).toHaveProperty("lastInvitedEmail");
    });

    it("should have sendParentInvite method", () => {
      const familyInvite = useFamilyInvite();
      expect(typeof familyInvite.sendParentInvite).toBe("function");
    });

    it("should have linkParentWithCode method", () => {
      const familyInvite = useFamilyInvite();
      expect(typeof familyInvite.linkParentWithCode).toBe("function");
    });

    it("should start with no loading", () => {
      const familyInvite = useFamilyInvite();
      expect(familyInvite.loading.value).toBe(false);
    });

    it("should start with no error", () => {
      const familyInvite = useFamilyInvite();
      expect(familyInvite.error.value).toBeNull();
    });
  });

  describe("useParentPreviewMode composable", () => {
    it("should provide preview mode functions", () => {
      const preview = useParentPreviewMode();
      expect(preview).toHaveProperty("isPreviewMode");
      expect(preview).toHaveProperty("demoProfile");
      expect(preview).toHaveProperty("loading");
      expect(preview).toHaveProperty("error");
    });

    it("should have enterPreviewMode method", () => {
      const preview = useParentPreviewMode();
      expect(typeof preview.enterPreviewMode).toBe("function");
    });

    it("should have exitPreviewMode method", () => {
      const preview = useParentPreviewMode();
      expect(typeof preview.exitPreviewMode).toBe("function");
    });

    it("should have isInPreviewMode method", () => {
      const preview = useParentPreviewMode();
      expect(typeof preview.isInPreviewMode).toBe("function");
    });

    it("should have getDemoProfileData method", () => {
      const preview = useParentPreviewMode();
      expect(typeof preview.getDemoProfileData).toBe("function");
    });

    it("should start with preview mode disabled", () => {
      const preview = useParentPreviewMode();
      expect(preview.isInPreviewMode()).toBe(false);
    });

    it("should return null demo data when not in preview", () => {
      const preview = useParentPreviewMode();
      expect(preview.getDemoProfileData()).toBeNull();
    });
  });

  describe("Family management workflow", () => {
    it("parent invite workflow should have both methods available", () => {
      const familyInvite = useFamilyInvite();
      expect(typeof familyInvite.sendParentInvite).toBe("function");
      expect(typeof familyInvite.linkParentWithCode).toBe("function");
    });

    it("preview mode workflow should have both methods available", () => {
      const preview = useParentPreviewMode();
      expect(typeof preview.enterPreviewMode).toBe("function");
      expect(typeof preview.exitPreviewMode).toBe("function");
    });
  });
});
