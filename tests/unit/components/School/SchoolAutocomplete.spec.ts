import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import SchoolAutocomplete from "~/components/School/SchoolAutocomplete.vue";
import type { CollegeSearchResult } from "~/types/api";

const mockResults = ref<CollegeSearchResult[]>([]);
const mockLoading = ref(false);
const mockError = ref<string | null>(null);
const mockSearchColleges = vi.fn();

vi.mock("~/composables/useCollegeAutocomplete", () => ({
  useCollegeAutocomplete: () => ({
    results: mockResults,
    loading: mockLoading,
    error: mockError,
    searchColleges: mockSearchColleges,
  }),
}));

describe("SchoolAutocomplete", () => {
  const sampleResults: CollegeSearchResult[] = [
    {
      id: "1",
      name: "University of Florida",
      location: "Gainesville, FL",
    } as CollegeSearchResult,
    {
      id: "2",
      name: "Florida State University",
      location: "Tallahassee, FL",
    } as CollegeSearchResult,
    {
      id: "3",
      name: "University of Central Florida",
      location: "Orlando, FL",
    } as CollegeSearchResult,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockResults.value = [];
    mockLoading.value = false;
    mockError.value = null;
    mockSearchColleges.mockResolvedValue(undefined);
  });

  const mountComponent = (props: Record<string, unknown> = {}) =>
    mount(SchoolAutocomplete, { props });

  describe("disabled prop", () => {
    it("disables input when disabled is true", () => {
      const wrapper = mountComponent({ disabled: true });
      expect(wrapper.find("input").attributes("disabled")).toBeDefined();
    });

    it("enables input by default", () => {
      const wrapper = mountComponent();
      expect(wrapper.find("input").attributes("disabled")).toBeUndefined();
    });
  });

  describe("search trigger", () => {
    it("does not search when query is less than 3 chars", async () => {
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Fl");
      await input.trigger("input");
      await flushPromises();

      expect(mockSearchColleges).not.toHaveBeenCalled();
    });

    it("triggers search when query is 3+ chars", async () => {
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Flo");
      await input.trigger("input");
      await flushPromises();

      expect(mockSearchColleges).toHaveBeenCalledWith("Flo");
    });

    it("clears results when query is emptied", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("");
      await input.trigger("input");
      await flushPromises();

      expect(mockResults.value).toEqual([]);
    });
  });

  describe("dropdown display", () => {
    it("shows dropdown after input", async () => {
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      const dropdown = wrapper.find(".absolute.top-full");
      expect(dropdown.exists()).toBe(true);
    });

    it("shows loading spinner when searching", async () => {
      mockLoading.value = true;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      expect(wrapper.text()).toContain("Searching...");
    });

    it("shows error message on search error", async () => {
      mockError.value = "Search failed";
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      expect(wrapper.text()).toContain("Search failed");
    });

    it("shows no results message when empty", async () => {
      mockResults.value = [];
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Xyz");
      await input.trigger("input");
      await nextTick();

      expect(wrapper.text()).toContain("No colleges found");
    });

    it("renders search results", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      expect(wrapper.text()).toContain("University of Florida");
      expect(wrapper.text()).toContain("Gainesville, FL");
      expect(wrapper.text()).toContain("Florida State University");
    });
  });

  describe("result selection", () => {
    it("emits select when result is clicked", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      const buttons = wrapper.findAll("button[type='button']");
      await buttons[0].trigger("click");

      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")![0]).toEqual([sampleResults[0]]);
    });

    it("sets query to selected college name", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      const buttons = wrapper.findAll("button[type='button']");
      await buttons[0].trigger("click");
      await nextTick();

      expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
        "University of Florida",
      );
    });

    it("closes dropdown after selection", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      const buttons = wrapper.findAll("button[type='button']");
      await buttons[0].trigger("click");
      await nextTick();

      expect(wrapper.find(".absolute.top-full").exists()).toBe(false);
    });
  });

  describe("keyboard navigation", () => {
    it("moves selection down with ArrowDown", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      const highlighted = wrapper.find(".bg-blue-100");
      expect(highlighted.exists()).toBe(true);
      expect(highlighted.text()).toContain("University of Florida");
    });

    it("moves selection up with ArrowUp", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      // Move down twice, then up once
      await input.trigger("keydown", { key: "ArrowDown" });
      await input.trigger("keydown", { key: "ArrowDown" });
      await input.trigger("keydown", { key: "ArrowUp" });
      await nextTick();

      const highlighted = wrapper.find(".bg-blue-100");
      expect(highlighted.exists()).toBe(true);
      expect(highlighted.text()).toContain("University of Florida");
    });

    it("does not go below last result", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      // Press down more times than results
      for (let i = 0; i < 5; i++) {
        await input.trigger("keydown", { key: "ArrowDown" });
      }
      await nextTick();

      const highlighted = wrapper.findAll(".bg-blue-100");
      expect(highlighted.length).toBe(1);
    });

    it("does not go above -1", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowUp" });
      await nextTick();

      // No item should be highlighted
      expect(wrapper.find(".bg-blue-100").exists()).toBe(false);
    });

    it("selects item on Enter", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await input.trigger("keydown", { key: "Enter" });

      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")![0]).toEqual([sampleResults[0]]);
    });

    it("does not select on Enter when no item highlighted", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      await input.trigger("keydown", { key: "Enter" });

      expect(wrapper.emitted("select")).toBeFalsy();
    });

    it("closes dropdown on Escape", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      expect(wrapper.find(".absolute.top-full").exists()).toBe(true);

      await input.trigger("keydown", { key: "Escape" });
      await nextTick();

      expect(wrapper.find(".absolute.top-full").exists()).toBe(false);
    });
  });

  describe("blur behavior", () => {
    it("closes dropdown after blur delay", async () => {
      vi.useFakeTimers();
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      expect(wrapper.find(".absolute.top-full").exists()).toBe(true);

      await input.trigger("blur");
      vi.advanceTimersByTime(200);
      await nextTick();

      expect(wrapper.find(".absolute.top-full").exists()).toBe(false);
      vi.useRealTimers();
    });
  });

  describe("selected index reset", () => {
    it("resets selected index on new input", async () => {
      mockResults.value = sampleResults;
      const wrapper = mountComponent();
      const input = wrapper.find("input");

      await input.setValue("Florida");
      await input.trigger("input");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      // Type new character to reset
      await input.setValue("Floridax");
      await input.trigger("input");
      await nextTick();

      // Selected index should be reset
      expect(wrapper.find(".bg-blue-100").exists()).toBe(false);
    });
  });
});
