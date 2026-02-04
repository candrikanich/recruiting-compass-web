import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import PreviewModeBanner from "~/components/PreviewModeBanner.vue";

vi.mock("~/composables/useParentPreviewMode", () => ({
  useParentPreviewMode: vi.fn(),
}));

describe("PreviewModeBanner", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useParentPreviewMode } =
      await import("~/composables/useParentPreviewMode");
    vi.mocked(useParentPreviewMode).mockClear();
  });

  describe("Rendering", () => {
    it("should render banner when in preview mode", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      expect(wrapper.find('[data-testid="preview-mode-banner"]').exists()).toBe(
        true,
      );
    });

    it("should not render banner when not in preview mode", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: false },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => false),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      expect(wrapper.find('[data-testid="preview-mode-banner"]').exists()).toBe(
        false,
      );
    });

    it("should display correct banner text", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.text()).toContain(
        "Preview Mode — Enter a Family Code to start your player's real journey",
      );
    });

    it("should have red warning styling", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.classes()).toContain("bg-red-600");
    });

    it("should be fixed to top", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.classes()).toContain("fixed");
      expect(banner.classes()).toContain("top-0");
    });

    it("should have white text for contrast", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.classes()).toContain("text-white");
    });
  });

  describe("Interaction", () => {
    it("should emit open-family-code-modal event on click", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      await banner.trigger("click");

      expect(wrapper.emitted("open-family-code-modal")).toBeTruthy();
    });

    it("should be keyboard accessible", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.attributes("role")).toBe("button");
      expect(banner.attributes("tabindex")).toBe("0");
    });

    it("should emit event on Enter key press", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      await banner.trigger("keydown.enter");

      expect(wrapper.emitted("open-family-code-modal")).toBeTruthy();
    });

    it("should be full width and clickable", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.classes()).toContain("w-full");
      expect(banner.attributes("role")).toBe("button");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA role", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.attributes("role")).toBe("button");
    });

    it("should have aria-label describing action", async () => {
      const { useParentPreviewMode } =
        await import("~/composables/useParentPreviewMode");
      vi.mocked(useParentPreviewMode).mockReturnValue({
        isPreviewMode: { value: true },
        demoProfile: { value: null },
        loading: { value: false },
        error: { value: null },
        enterPreviewMode: vi.fn(),
        exitPreviewMode: vi.fn(),
        isInPreviewMode: vi.fn(() => true),
        getDemoProfileData: vi.fn(),
      });

      const wrapper = mount(PreviewModeBanner);
      const banner = wrapper.find('[data-testid="preview-mode-banner"]');

      expect(banner.attributes("aria-label")).toBeTruthy();
    });
  });
});
