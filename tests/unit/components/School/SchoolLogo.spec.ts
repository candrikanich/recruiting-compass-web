import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import { createMockSchool } from "~/tests/fixtures/schools.fixture";

const mockFetchSchoolLogo = vi.fn();
const mockGetSchoolLogoCached = vi.fn();
const mockIsLoading = { value: false };

vi.mock("~/composables/useSchoolLogos", () => ({
  useSchoolLogos: () => ({
    fetchSchoolLogo: mockFetchSchoolLogo,
    getSchoolLogoCached: mockGetSchoolLogoCached,
    isLoading: mockIsLoading,
  }),
}));

describe("SchoolLogo", () => {
  const defaultSchool = createMockSchool({ id: "s1", name: "Florida State" });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSchoolLogoCached.mockReturnValue(undefined);
    mockFetchSchoolLogo.mockResolvedValue(null);
    mockIsLoading.value = false;
  });

  const mountLogo = (props: Record<string, unknown> = {}) =>
    mount(SchoolLogo, {
      props: { school: defaultSchool, ...props },
    });

  describe("rendering", () => {
    it("renders fallback with first letter when no logo URL", async () => {
      const wrapper = mountLogo();
      await flushPromises();

      expect(wrapper.find(".logo-fallback").exists()).toBe(true);
      expect(wrapper.find(".logo-fallback").text()).toBe("F");
    });

    it("renders emoji fallback when school has no name", async () => {
      // createMockSchool treats empty string as falsy, so override directly
      const school = { ...createMockSchool(), name: "" };
      const wrapper = mount(SchoolLogo, {
        props: { school },
      });
      await flushPromises();

      expect(wrapper.find(".logo-fallback").text()).toContain("\uD83C\uDFEB");
    });

    it("renders image when logo URL is available from cache", async () => {
      mockGetSchoolLogoCached.mockReturnValue("https://example.com/logo.png");
      const wrapper = mountLogo();
      await flushPromises();

      const img = wrapper.find(".logo-image");
      expect(img.exists()).toBe(true);
      expect(img.attributes("src")).toBe("https://example.com/logo.png");
    });

    it("renders image when logo URL is fetched", async () => {
      mockFetchSchoolLogo.mockResolvedValue("https://example.com/fetched.png");
      const wrapper = mountLogo();
      await flushPromises();

      const img = wrapper.find(".logo-image");
      expect(img.exists()).toBe(true);
      expect(img.attributes("src")).toBe("https://example.com/fetched.png");
    });

    it("sets alt text from school name", async () => {
      mockGetSchoolLogoCached.mockReturnValue("https://example.com/logo.png");
      const wrapper = mountLogo();
      await flushPromises();

      expect(wrapper.find(".logo-image").attributes("alt")).toBe(
        "Florida State logo",
      );
    });
  });

  describe("size prop", () => {
    it("applies default md size class", () => {
      const wrapper = mountLogo();
      expect(wrapper.find(".school-logo").classes()).toContain("logo-md");
    });

    it.each(["xs", "sm", "md", "lg", "xl"] as const)(
      "applies %s size class",
      (size) => {
        const wrapper = mountLogo({ size });
        expect(wrapper.find(".school-logo").classes()).toContain(
          `logo-${size}`,
        );
      },
    );

    it("sets correct pixel dimensions for fallback", async () => {
      const wrapper = mountLogo({ size: "lg" });
      await flushPromises();

      const fallback = wrapper.find(".logo-fallback");
      expect(fallback.attributes("style")).toContain("width: 64px");
      expect(fallback.attributes("style")).toContain("height: 64px");
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when fetching", async () => {
      mockFetchSchoolLogo.mockReturnValue(new Promise(() => {}));
      const wrapper = mountLogo();
      await vi.dynamicImportSettled();

      expect(wrapper.find(".logo-loading").exists()).toBe(true);
    });

    it("shows loading spinner when composable is loading", async () => {
      mockIsLoading.value = true;
      const wrapper = mountLogo();
      await flushPromises();

      expect(wrapper.find(".logo-loading").exists()).toBe(true);
    });

    it("hides spinner after fetch completes", async () => {
      mockFetchSchoolLogo.mockResolvedValue("https://example.com/logo.png");
      const wrapper = mountLogo();
      await flushPromises();

      expect(wrapper.find(".logo-loading").exists()).toBe(false);
    });
  });

  describe("cache behavior", () => {
    it("uses cached logo without calling fetch", async () => {
      mockGetSchoolLogoCached.mockReturnValue("https://cached.com/logo.png");
      mountLogo();
      await flushPromises();

      expect(mockGetSchoolLogoCached).toHaveBeenCalledWith("s1");
      expect(mockFetchSchoolLogo).not.toHaveBeenCalled();
    });

    it("fetches when cache returns undefined", async () => {
      mockGetSchoolLogoCached.mockReturnValue(undefined);
      mountLogo();
      await flushPromises();

      expect(mockFetchSchoolLogo).toHaveBeenCalledWith(defaultSchool);
    });
  });

  describe("fetchOnMount prop", () => {
    it("fetches on mount by default", async () => {
      mountLogo();
      await flushPromises();

      expect(mockGetSchoolLogoCached).toHaveBeenCalled();
    });

    it("does not fetch when fetchOnMount is false", async () => {
      mountLogo({ fetchOnMount: false });
      await flushPromises();

      expect(mockGetSchoolLogoCached).not.toHaveBeenCalled();
      expect(mockFetchSchoolLogo).not.toHaveBeenCalled();
    });
  });

  describe("school.id watcher", () => {
    it("refetches when school.id changes", async () => {
      const wrapper = mountLogo();
      await flushPromises();
      vi.clearAllMocks();

      const newSchool = createMockSchool({ id: "s2", name: "Georgia Tech" });
      await wrapper.setProps({ school: newSchool });
      await flushPromises();

      expect(mockGetSchoolLogoCached).toHaveBeenCalledWith("s2");
    });
  });

  describe("image error handling", () => {
    it("shows fallback when image fails to load", async () => {
      mockGetSchoolLogoCached.mockReturnValue("https://example.com/broken.png");
      const wrapper = mountLogo();
      await flushPromises();

      expect(wrapper.find(".logo-image").exists()).toBe(true);

      await wrapper.find(".logo-image").trigger("error");

      expect(wrapper.find(".logo-image").exists()).toBe(false);
      expect(wrapper.find(".logo-fallback").exists()).toBe(true);
    });
  });

  describe("fetch error handling", () => {
    it("shows fallback when fetch fails", async () => {
      mockFetchSchoolLogo.mockRejectedValue(new Error("Network error"));
      const wrapper = mountLogo();
      await flushPromises();

      expect(wrapper.find(".logo-fallback").exists()).toBe(true);
      expect(wrapper.find(".logo-fallback").text()).toBe("F");
    });
  });
});
