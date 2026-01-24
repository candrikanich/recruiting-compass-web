import { describe, it, expect, beforeEach } from "vitest";
import { ref } from "vue";
import { useUniversalFilter } from "~/composables/useUniversalFilter";
import type { FilterConfig } from "~/types/filters";

interface TestSchool {
  id: string;
  name: string;
  location: string;
  division: string;
}

describe("useUniversalFilter - Text Search", () => {
  let schools: TestSchool[];
  let filterConfigs: FilterConfig[];

  beforeEach(() => {
    schools = [
      {
        id: "1",
        name: "Ohio State University",
        location: "Columbus, Ohio",
        division: "D1",
      },
      {
        id: "2",
        name: "University of Michigan",
        location: "Ann Arbor, Michigan",
        division: "D1",
      },
      {
        id: "3",
        name: "Kent State University",
        location: "Kent, Ohio",
        division: "D2",
      },
      {
        id: "4",
        name: "Harvard University",
        location: "Cambridge, Massachusetts",
        division: "D3",
      },
      {
        id: "5",
        name: "Yale University",
        location: "New Haven, Connecticut",
        division: "D3",
      },
    ];

    filterConfigs = [
      { type: "text", field: "name", label: "School Name" },
      { type: "text", field: "location", label: "Location" },
      { type: "select", field: "division", label: "Division" },
    ];
  });

  it("should filter schools by full word in name", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", "Ohio");

    // Only "Ohio State University" contains "Ohio" in the name
    expect(filteredItems.value).toHaveLength(1);
    expect(filteredItems.value.map((s) => s.id)).toEqual(["1"]);
  });

  it("should filter schools by single character in name", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", "O");

    // Should find all schools with 'O' (case-insensitive)
    expect(filteredItems.value.length).toBeGreaterThan(0);
    // But should NOT just return one result for one character
    expect(filteredItems.value.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter schools by location with full word", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue, clearFilters } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    clearFilters();
    setFilterValue("location", "Ohio");

    // Both "Columbus, Ohio" and "Kent, Ohio" contain "Ohio" in location
    expect(filteredItems.value).toHaveLength(2);
    expect(filteredItems.value.map((s) => s.id)).toEqual(
      expect.arrayContaining(["1", "3"]),
    );
  });

  it("should be case insensitive", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue, clearFilters } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    clearFilters();
    setFilterValue("name", "ohio");

    // Only "Ohio State University" contains "ohio" in the name (case-insensitive)
    expect(filteredItems.value).toHaveLength(1);
    expect(filteredItems.value.map((s) => s.id)).toEqual(["1"]);
  });

  it("should find partial matches", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue, clearFilters } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    clearFilters();
    setFilterValue("name", "State");

    expect(filteredItems.value).toHaveLength(2); // Ohio State and Kent State
    expect(filteredItems.value.map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("should handle empty search", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue, clearFilters } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    clearFilters();
    // First filter by something
    setFilterValue("name", "State");
    // Then clear the filter
    setFilterValue("name", "");

    // Should return all schools when filter is empty
    expect(filteredItems.value).toHaveLength(5);
  });

  it("should return no results for non-matching search", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue, clearFilters } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    clearFilters();
    setFilterValue("name", "Nonexistent");

    expect(filteredItems.value).toHaveLength(0);
  });

  it("should apply multiple filters together", () => {
    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue, clearFilters } = useUniversalFilter(
      schoolsRef,
      filterConfigs,
      { persistState: false },
    );

    clearFilters();
    setFilterValue("name", "University");
    setFilterValue("division", "D1");

    // Schools with "University" in name AND division D1: Ohio State (1) and University of Michigan (2)
    expect(filteredItems.value).toHaveLength(2);
    expect(filteredItems.value.map((s) => s.id)).toEqual(
      expect.arrayContaining(["1", "2"]),
    );
  });

  it("should support custom filter function", () => {
    const customConfigs: FilterConfig[] = [
      {
        type: "text",
        field: "name",
        label: "School Name",
        filterFn: (item: any, value: string) => {
          // Custom filter that only matches if name starts with the search term
          return item.name.toLowerCase().startsWith(value.toLowerCase());
        },
      },
      { type: "select", field: "division", label: "Division" },
    ];

    const schoolsRef = ref(schools);
    const { filteredItems, setFilterValue, clearFilters } = useUniversalFilter(
      schoolsRef,
      customConfigs,
      { persistState: false },
    );

    clearFilters();
    setFilterValue("name", "Ohio");

    // Should only find "Ohio State" (starts with Ohio), not "Kent State"
    expect(filteredItems.value).toHaveLength(1);
    expect(filteredItems.value[0].id).toBe("1");
  });
});
