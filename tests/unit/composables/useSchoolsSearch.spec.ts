import { describe, it, expect, beforeEach } from "vitest";
import { ref } from "vue";
import { useUniversalFilter } from "../../../composables/useUniversalFilter";

// Minimal school type for testing
interface MockSchool {
  id: string;
  name: string;
  location: string;
  division: string;
  status: string;
  is_favorite: boolean;
}

describe("Schools Page Search", () => {
  let mockSchools: MockSchool[];
  let filterConfigs: any[];

  beforeEach(() => {
    mockSchools = [
      {
        id: "1",
        name: "Ohio State University",
        location: "Columbus, OH",
        division: "D1",
        status: "researching",
        is_favorite: false,
      },
      {
        id: "2",
        name: "University of Michigan",
        location: "Ann Arbor, MI",
        division: "D1",
        status: "interested",
        is_favorite: true,
      },
      {
        id: "3",
        name: "University of Toledo",
        location: "Toledo, OH",
        division: "D1",
        status: "contacted",
        is_favorite: false,
      },
    ] as MockSchool[];

    filterConfigs = [
      {
        type: "text",
        field: "name",
        label: "Search",
        placeholder: "School name or location...",
        filterFn: (item: MockSchool, filterValue: string) => {
          if (!filterValue) return true;
          const query = String(filterValue).toLowerCase();
          return (
            item.name.toLowerCase().includes(query) ||
            item.location?.toLowerCase().includes(query)
          );
        },
      },
    ];
  });

  it('should filter schools by partial name "Ohio"', () => {
    const { filterValues, filteredItems, setFilterValue } = useUniversalFilter(
      ref(mockSchools),
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", "Ohio");

    const results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(1);
    expect(results.map((s) => s.name)).toContain("Ohio State University");
  });

  it('should filter schools by location "Columbus"', () => {
    const { filterValues, filteredItems, setFilterValue } = useUniversalFilter(
      ref(mockSchools),
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", "Columbus");

    const results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Ohio State University");
  });

  it('should filter schools by full word "Michigan"', () => {
    const { filterValues, filteredItems, setFilterValue } = useUniversalFilter(
      ref(mockSchools),
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", "Michigan");

    const results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("University of Michigan");
  });

  it("should return all schools when search is empty", () => {
    const { filterValues, filteredItems, setFilterValue } = useUniversalFilter(
      ref(mockSchools),
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", "");

    const results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(3);
  });

  it("should be case insensitive", () => {
    const { filterValues, filteredItems, setFilterValue } = useUniversalFilter(
      ref(mockSchools),
      filterConfigs,
      { persistState: false },
    );

    // Test lowercase
    setFilterValue("name", "ohio");
    let results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(1);

    // Test uppercase
    setFilterValue("name", "OHIO");
    results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(1);

    // Test mixed case
    setFilterValue("name", "OhIo");
    results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(1);
  });

  it('should filter by partial match "OH"', () => {
    const { filterValues, filteredItems, setFilterValue } = useUniversalFilter(
      ref(mockSchools),
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", "OH");

    const results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(2);
    expect(results.map((s) => s.name)).toContain("Ohio State University");
    expect(results.map((s) => s.name)).toContain("University of Toledo");
  });

  it('should filter by state "OH" in location', () => {
    const { filterValues, filteredItems, setFilterValue } = useUniversalFilter(
      ref(mockSchools),
      filterConfigs,
      { persistState: false },
    );

    setFilterValue("name", ", OH");

    const results = filteredItems.value as unknown as MockSchool[];
    expect(results).toHaveLength(2);
    expect(results.map((s) => s.name)).toContain("Ohio State University");
    expect(results.map((s) => s.name)).toContain("University of Toledo");
  });
});
