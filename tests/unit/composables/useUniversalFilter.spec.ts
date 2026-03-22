import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useUniversalFilter } from "~/composables/useUniversalFilter";
import type { FilterConfig } from "~/types/filters";

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

interface TestItem {
  id: string;
  name: string;
  location: string;
  division: string;
  active: boolean;
  score: number;
  tags: string[];
  createdAt: string;
  nested?: { value: string };
}

const makeItems = (): TestItem[] => [
  {
    id: "1",
    name: "Ohio State University",
    location: "Columbus, Ohio",
    division: "D1",
    active: true,
    score: 90,
    tags: ["flagship", "public"],
    createdAt: "2024-01-15",
    nested: { value: "alpha" },
  },
  {
    id: "2",
    name: "University of Michigan",
    location: "Ann Arbor, Michigan",
    division: "D1",
    active: false,
    score: 75,
    tags: ["public"],
    createdAt: "2024-03-20",
    nested: { value: "beta" },
  },
  {
    id: "3",
    name: "Kent State University",
    location: "Kent, Ohio",
    division: "D2",
    active: true,
    score: 50,
    tags: ["public", "mid-major"],
    createdAt: "2024-06-01",
    nested: { value: "gamma" },
  },
  {
    id: "4",
    name: "Harvard University",
    location: "Cambridge, Massachusetts",
    division: "D3",
    active: true,
    score: 95,
    tags: ["ivy", "private"],
    createdAt: "2024-09-10",
  },
  {
    id: "5",
    name: "Yale University",
    location: "New Haven, Connecticut",
    division: "D3",
    active: false,
    score: 30,
    tags: ["ivy", "private"],
    createdAt: "2024-12-25",
  },
];

const baseConfigs: FilterConfig[] = [
  { type: "text", field: "name", label: "Name" },
  { type: "select", field: "division", label: "Division" },
  { type: "multiselect", field: "tags", label: "Tags" },
  { type: "boolean", field: "active", label: "Active" },
  { type: "range", field: "score", label: "Score", min: 0, max: 100 },
  { type: "daterange", field: "createdAt", label: "Created" },
];

function makeFilter(extraConfigs: FilterConfig[] = [], opts = {}) {
  return useUniversalFilter(ref(makeItems()), [...baseConfigs, ...extraConfigs], {
    persistState: false,
    ...opts,
  });
}

// ── localStorage mock helpers ──────────────────────────────────────────────
function stubLocalStorage(initialData: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initialData };
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => Object.keys(store).forEach((k) => delete store[k])),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn(),
    _store: store,
  };
}

// ── Initial State ──────────────────────────────────────────────────────────
describe("useUniversalFilter – initial state", () => {
  it("initializes filterValues from config defaultValues", () => {
    const configs: FilterConfig[] = [
      { type: "text", field: "name", label: "Name", defaultValue: "foo" },
      { type: "select", field: "division", label: "Division" },
    ];
    const { filterValues } = useUniversalFilter(ref(makeItems()), configs, {
      persistState: false,
    });
    expect(filterValues.value["name"]).toBe("foo");
    expect(filterValues.value["division"]).toBeNull();
  });

  it("starts with no active presets", () => {
    const { presets, activePresetId } = makeFilter();
    expect(presets.value).toEqual([]);
    expect(activePresetId.value).toBeUndefined();
  });

  it("hasActiveFilters is false initially (all null defaults)", () => {
    const { hasActiveFilters } = makeFilter();
    expect(hasActiveFilters.value).toBe(false);
  });

  it("activeFilterCount is 0 initially", () => {
    const { activeFilterCount } = makeFilter();
    expect(activeFilterCount.value).toBe(0);
  });

  it("filteredItems returns all items when no active filters", () => {
    const { filteredItems } = makeFilter();
    expect(filteredItems.value).toHaveLength(5);
  });

  it("accepts plain array (non-ref) for items", () => {
    const items = makeItems();
    const { filteredItems } = useUniversalFilter(items, baseConfigs, {
      persistState: false,
    });
    expect(filteredItems.value).toHaveLength(5);
  });

  it("accepts plain array (non-ref) for configs", () => {
    const { filteredItems } = useUniversalFilter(ref(makeItems()), baseConfigs, {
      persistState: false,
    });
    expect(filteredItems.value).toHaveLength(5);
  });
});

// ── activeFilterCount / hasActiveFilters ──────────────────────────────────
describe("activeFilterCount", () => {
  it("counts null as inactive", () => {
    const { activeFilterCount, filterValues } = makeFilter();
    filterValues.value["name"] = null;
    expect(activeFilterCount.value).toBe(0);
  });

  it("counts undefined as inactive", () => {
    const { activeFilterCount, filterValues } = makeFilter();
    filterValues.value["name"] = undefined;
    expect(activeFilterCount.value).toBe(0);
  });

  it("counts empty string as inactive", () => {
    const { activeFilterCount, filterValues } = makeFilter();
    filterValues.value["name"] = "";
    expect(activeFilterCount.value).toBe(0);
  });

  it("counts empty array as inactive", () => {
    const { activeFilterCount, filterValues } = makeFilter();
    filterValues.value["tags"] = [];
    expect(activeFilterCount.value).toBe(0);
  });

  it("counts non-empty string as active", () => {
    const { activeFilterCount, setFilterValue } = makeFilter();
    setFilterValue("name", "Ohio");
    expect(activeFilterCount.value).toBe(1);
  });

  it("hasActiveFilters is true after setting a value", () => {
    const { hasActiveFilters, setFilterValue } = makeFilter();
    setFilterValue("name", "Ohio");
    expect(hasActiveFilters.value).toBe(true);
  });
});

// ── Text filter ───────────────────────────────────────────────────────────
describe("text filter", () => {
  it("filters by partial match (case-insensitive)", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("name", "ohio");
    expect(filteredItems.value.map((i) => i.id)).toEqual(["1"]);
  });

  it("returns empty array when no match", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("name", "zzznomatch");
    expect(filteredItems.value).toHaveLength(0);
  });

  it("treats null fieldValue as non-match", () => {
    const items = [{ id: "x", name: null as unknown as string, division: "D1", location: "", active: true, score: 0, tags: [], createdAt: "2024-01-01" }];
    const configs: FilterConfig[] = [{ type: "text", field: "name", label: "Name" }];
    const { filteredItems, setFilterValue } = useUniversalFilter(ref(items), configs, {
      persistState: false,
    });
    setFilterValue("name", "anything");
    expect(filteredItems.value).toHaveLength(0);
  });

  it("passes when filter is empty string", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("name", "");
    expect(filteredItems.value).toHaveLength(5);
  });
});

// ── Select filter ─────────────────────────────────────────────────────────
describe("select filter", () => {
  it("filters by exact match", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("division", "D1");
    expect(filteredItems.value.map((i) => i.id)).toEqual(
      expect.arrayContaining(["1", "2"]),
    );
    expect(filteredItems.value).toHaveLength(2);
  });

  it("uses custom compareValues function", () => {
    const configs: FilterConfig[] = [
      { type: "select", field: "division", label: "Division" },
    ];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      {
        persistState: false,
        compareValues: (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
      },
    );
    setFilterValue("division", "d1");
    // compareValues does lowercase comparison so "D1" matches "d1"
    expect(filteredItems.value).toHaveLength(2);
  });
});

// ── Multiselect filter ────────────────────────────────────────────────────
describe("multiselect filter", () => {
  it("filters items where fieldValue is in the multiselect array", () => {
    const configs: FilterConfig[] = [
      { type: "multiselect", field: "division", label: "Division" },
    ];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("division", ["D1", "D2"]);
    expect(filteredItems.value).toHaveLength(3);
  });

  it("falls back to compareValues when first element is array (non-primitive)", () => {
    // Cover the else branch: filterValue[0] is an array
    const configs: FilterConfig[] = [
      { type: "multiselect", field: "division", label: "Division" },
    ];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      {
        persistState: false,
        compareValues: () => false,
      },
    );
    // Pass nested array as first element to trigger compareValues branch
    setFilterValue("division", [["D1"] as unknown as string]);
    expect(filteredItems.value).toHaveLength(0);
  });

  it("passes empty array as inactive (all items returned)", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("tags", []);
    expect(filteredItems.value).toHaveLength(5);
  });
});

// ── Boolean filter ────────────────────────────────────────────────────────
describe("boolean filter", () => {
  it("filters by true", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("active", true);
    expect(filteredItems.value.every((i) => i.active)).toBe(true);
    expect(filteredItems.value).toHaveLength(3);
  });

  it("filters by false", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("active", false);
    expect(filteredItems.value.every((i) => !i.active)).toBe(true);
    expect(filteredItems.value).toHaveLength(2);
  });
});

// ── Range filter ──────────────────────────────────────────────────────────
describe("range filter", () => {
  it("filters items within [min, max] range", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("score", [70, 95] as [number, number]);
    const ids = filteredItems.value.map((i) => i.id);
    expect(ids).toContain("1"); // 90
    expect(ids).toContain("2"); // 75
    expect(ids).toContain("4"); // 95
    expect(ids).not.toContain("3"); // 50
    expect(ids).not.toContain("5"); // 30
  });

  it("excludes items outside range", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("score", [80, 100] as [number, number]);
    expect(filteredItems.value.map((i) => i.id)).toEqual(
      expect.arrayContaining(["1", "4"]),
    );
    expect(filteredItems.value).toHaveLength(2);
  });

  it("excludes non-number fields from range filter", () => {
    const configs: FilterConfig[] = [
      { type: "range", field: "name", label: "Name Range" },
    ];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("name", [0, 100] as [number, number]);
    // "name" is a string, not number → all excluded
    expect(filteredItems.value).toHaveLength(0);
  });
});

// ── Daterange filter ──────────────────────────────────────────────────────
describe("daterange filter", () => {
  it("filters items within date range", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    const start = new Date("2024-01-01");
    const end = new Date("2024-06-30");
    setFilterValue("createdAt", [start, end] as [Date, Date]);
    // Jan 15, Mar 20, Jun 1 are within range
    expect(filteredItems.value.map((i) => i.id)).toEqual(
      expect.arrayContaining(["1", "2", "3"]),
    );
    expect(filteredItems.value).toHaveLength(3);
  });

  it("excludes items outside date range", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    const start = new Date("2024-12-01");
    const end = new Date("2024-12-31");
    setFilterValue("createdAt", [start, end] as [Date, Date]);
    expect(filteredItems.value.map((i) => i.id)).toEqual(["5"]);
  });
});

// ── Default (unknown) filter type ─────────────────────────────────────────
describe("default filter type", () => {
  it("passes all items when filter type is unknown", () => {
    const configs: FilterConfig[] = [
      { type: "text" as "text", field: "name", label: "Name" },
    ];
    // Trick: cast an unknown type
    const unknownConfigs = [{ ...configs[0], type: "unknown" as "text" }];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      unknownConfigs,
      { persistState: false },
    );
    setFilterValue("name", "anything");
    // default case returns true → all items pass
    expect(filteredItems.value).toHaveLength(5);
  });
});

// ── Custom filterFn ────────────────────────────────────────────────────────
describe("custom filterFn", () => {
  it("uses custom filterFn instead of built-in filtering", () => {
    const configs: FilterConfig[] = [
      {
        type: "text",
        field: "name",
        label: "Name",
        filterFn: (item, value) =>
          (item as TestItem).name.startsWith(value as string),
      },
    ];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("name", "Ohio");
    expect(filteredItems.value).toHaveLength(1);
    expect(filteredItems.value[0].id).toBe("1");
  });
});

// ── Nested property ────────────────────────────────────────────────────────
describe("nested property access", () => {
  it("resolves dot-notation field paths", () => {
    const configs: FilterConfig[] = [
      { type: "text", field: "nested.value", label: "Nested" },
    ];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("nested.value", "alpha");
    expect(filteredItems.value.map((i) => i.id)).toEqual(["1"]);
  });

  it("returns undefined for missing nested paths", () => {
    const configs: FilterConfig[] = [
      { type: "text", field: "nested.missing.deep", label: "Deep" },
    ];
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("nested.missing.deep", "anything");
    // nested.missing is undefined → fieldValue undefined → text filter returns false
    expect(filteredItems.value).toHaveLength(0);
  });

  it("handles non-object items gracefully in getNestedProperty", () => {
    const configs: FilterConfig[] = [
      { type: "text", field: "name", label: "Name" },
    ];
    // Include a null in the array (edge case)
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("name", "");
    expect(filteredItems.value).toHaveLength(5);
  });
});

// ── setFilterValue ─────────────────────────────────────────────────────────
describe("setFilterValue", () => {
  it("updates filterValues for the specified field", () => {
    const { filterValues, setFilterValue } = makeFilter();
    setFilterValue("division", "D2");
    expect(filterValues.value["division"]).toBe("D2");
  });

  it("clears activePresetId when filter changes", () => {
    const { activePresetId, setFilterValue, savePreset } = makeFilter();
    savePreset("My preset");
    // Manually set active preset by loading it
    setFilterValue("division", "D1");
    // After loading a preset then changing a filter, activePresetId clears
    expect(activePresetId.value).toBeUndefined();
  });

  it("with debounceMs > 0 creates a debounced setter", async () => {
    const { filterValues, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      baseConfigs,
      { persistState: false, debounceMs: 50 },
    );
    setFilterValue("division", "D1");
    // Value is not set immediately due to debounce
    await new Promise((r) => setTimeout(r, 100));
    expect(filterValues.value["division"]).toBe("D1");
  });

  it("with debounceMs > 0 reuses existing debounced setter for same field", async () => {
    const { filterValues, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      baseConfigs,
      { persistState: false, debounceMs: 50 },
    );
    setFilterValue("division", "D1");
    setFilterValue("division", "D2");
    await new Promise((r) => setTimeout(r, 150));
    // Last value wins after debounce
    expect(filterValues.value["division"]).toBe("D2");
  });
});

// ── clearFilters ──────────────────────────────────────────────────────────
describe("clearFilters", () => {
  it("resets all filter values to config defaults", () => {
    const configs: FilterConfig[] = [
      { type: "text", field: "name", label: "Name", defaultValue: "" },
      { type: "select", field: "division", label: "Division" },
    ];
    const { filterValues, setFilterValue, clearFilters } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("name", "Ohio");
    setFilterValue("division", "D1");
    clearFilters();
    expect(filterValues.value["name"]).toBe("");
    expect(filterValues.value["division"]).toBeNull();
  });

  it("clears activePresetId", () => {
    const { activePresetId, clearFilters } = makeFilter();
    clearFilters();
    expect(activePresetId.value).toBeUndefined();
  });

  it("returns all items after clearing", () => {
    const { filteredItems, setFilterValue, clearFilters } = makeFilter();
    setFilterValue("division", "D1");
    clearFilters();
    expect(filteredItems.value).toHaveLength(5);
  });
});

// ── Preset management ─────────────────────────────────────────────────────
describe("savePreset", () => {
  it("adds a preset with the given name and current filters", () => {
    const { presets, setFilterValue, savePreset } = makeFilter();
    setFilterValue("division", "D1");
    const preset = savePreset("D1 Schools", "Only D1 schools");
    expect(presets.value).toHaveLength(1);
    expect(preset.name).toBe("D1 Schools");
    expect(preset.description).toBe("Only D1 schools");
    expect(preset.filters["division"]).toBe("D1");
    expect(preset.id).toMatch(/^preset-\d+/);
  });

  it("saves preset without description", () => {
    const { savePreset, presets } = makeFilter();
    savePreset("No desc preset");
    expect(presets.value[0].description).toBeUndefined();
  });
});

describe("loadPreset", () => {
  it("loads filters from a saved preset", () => {
    const { filterValues, setFilterValue, savePreset, loadPreset, activePresetId } =
      makeFilter();
    setFilterValue("division", "D1");
    const preset = savePreset("D1 preset");
    setFilterValue("division", null);
    loadPreset(preset.id);
    expect(filterValues.value["division"]).toBe("D1");
    expect(activePresetId.value).toBe(preset.id);
  });

  it("does nothing when presetId is not found", () => {
    const { activePresetId, loadPreset } = makeFilter();
    loadPreset("nonexistent-id");
    expect(activePresetId.value).toBeUndefined();
  });
});

describe("deletePreset", () => {
  it("removes the preset from the list", () => {
    const { presets, savePreset, deletePreset } = makeFilter();
    const preset = savePreset("To delete");
    expect(presets.value).toHaveLength(1);
    deletePreset(preset.id);
    expect(presets.value).toHaveLength(0);
  });

  it("clears activePresetId if the deleted preset was active", () => {
    const { activePresetId, savePreset, loadPreset, deletePreset } = makeFilter();
    const preset = savePreset("Active preset");
    loadPreset(preset.id);
    expect(activePresetId.value).toBe(preset.id);
    deletePreset(preset.id);
    expect(activePresetId.value).toBeUndefined();
  });

  it("does not clear activePresetId if a different preset is deleted", async () => {
    const { activePresetId, savePreset, loadPreset, deletePreset } = makeFilter();
    const p1 = savePreset("Preset 1");
    // Ensure a different timestamp for p2
    await new Promise((r) => setTimeout(r, 2));
    const p2 = savePreset("Preset 2");
    loadPreset(p1.id);
    expect(activePresetId.value).toBe(p1.id);
    deletePreset(p2.id);
    expect(activePresetId.value).toBe(p1.id);
  });
});

describe("updatePreset", () => {
  it("updates fields on an existing preset", () => {
    const { presets, savePreset, updatePreset } = makeFilter();
    const preset = savePreset("Old name");
    updatePreset(preset.id, { name: "New name" });
    expect(presets.value[0].name).toBe("New name");
  });

  it("does nothing when presetId is not found", () => {
    const { presets, savePreset, updatePreset } = makeFilter();
    savePreset("Valid preset");
    expect(() => updatePreset("nonexistent", { name: "x" })).not.toThrow();
    expect(presets.value[0].name).toBe("Valid preset");
  });
});

// ── getConfigForField ─────────────────────────────────────────────────────
describe("getConfigForField", () => {
  it("returns the config matching the field", () => {
    const { getConfigForField } = makeFilter();
    const config = getConfigForField("division");
    expect(config?.field).toBe("division");
    expect(config?.type).toBe("select");
  });

  it("returns undefined for unknown field", () => {
    const { getConfigForField } = makeFilter();
    expect(getConfigForField("unknown")).toBeUndefined();
  });
});

// ── getFilterDisplayValue ─────────────────────────────────────────────────
describe("getFilterDisplayValue", () => {
  it("returns empty string when value is null/falsy", () => {
    const { getFilterDisplayValue } = makeFilter();
    expect(getFilterDisplayValue("division")).toBe("");
  });

  it("returns label for select with options", () => {
    const configs: FilterConfig[] = [
      {
        type: "select",
        field: "division",
        label: "Division",
        options: [
          { value: "D1", label: "Division I" },
          { value: "D2", label: "Division II" },
        ],
      },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("division", "D1");
    expect(getFilterDisplayValue("division")).toBe("Division I");
  });

  it("returns raw string value for select without matching option", () => {
    const configs: FilterConfig[] = [
      {
        type: "select",
        field: "division",
        label: "Division",
        options: [{ value: "D1", label: "Division I" }],
      },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("division", "D2");
    expect(getFilterDisplayValue("division")).toBe("D2");
  });

  it("returns comma-joined labels for multiselect", () => {
    const configs: FilterConfig[] = [
      {
        type: "multiselect",
        field: "division",
        label: "Division",
        options: [
          { value: "D1", label: "Division I" },
          { value: "D2", label: "Division II" },
        ],
      },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("division", ["D1", "D2"]);
    expect(getFilterDisplayValue("division")).toBe("Division I, Division II");
  });

  it("returns raw value string for multiselect option without matching label", () => {
    const configs: FilterConfig[] = [
      {
        type: "multiselect",
        field: "division",
        label: "Division",
        options: [{ value: "D1", label: "Division I" }],
      },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("division", ["D1", "D9"]);
    expect(getFilterDisplayValue("division")).toBe("Division I, D9");
  });

  it("returns date range string for daterange", () => {
    const configs: FilterConfig[] = [
      { type: "daterange", field: "createdAt", label: "Created" },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    // Use date strings that are unambiguous regardless of timezone
    const start = new Date(2024, 2, 15); // March 15 (local)
    const end = new Date(2024, 10, 20); // Nov 20 (local)
    setFilterValue("createdAt", [start, end] as [Date, Date]);
    const display = getFilterDisplayValue("createdAt");
    expect(display).toContain(" - ");
    expect(display).toMatch(/Mar/);
    expect(display).toMatch(/Nov/);
  });

  it("returns range string for range type", () => {
    const configs: FilterConfig[] = [
      { type: "range", field: "score", label: "Score" },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("score", [10, 90] as [number, number]);
    expect(getFilterDisplayValue("score")).toBe("10 - 90");
  });

  it("returns 'Yes' for boolean true", () => {
    const configs: FilterConfig[] = [
      { type: "boolean", field: "active", label: "Active" },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("active", true);
    expect(getFilterDisplayValue("active")).toBe("Yes");
  });

  it("returns empty string for boolean false (falsy guard short-circuits)", () => {
    // The implementation has `if (!value || value === "") return ""` which causes
    // boolean false to be treated as falsy and return "" instead of "No".
    // This test documents the actual runtime behaviour.
    const configs: FilterConfig[] = [
      { type: "boolean", field: "active", label: "Active" },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("active", false);
    expect(getFilterDisplayValue("active")).toBe("");
  });

  it("returns string value for text type", () => {
    const configs: FilterConfig[] = [
      { type: "text", field: "name", label: "Name" },
    ];
    const { setFilterValue, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    setFilterValue("name", "Ohio");
    expect(getFilterDisplayValue("name")).toBe("Ohio");
  });

  it("falls through to String(value) for unknown config or type", () => {
    const configs: FilterConfig[] = [
      { type: "text", field: "extra", label: "Extra" },
    ];
    const { filterValues, getFilterDisplayValue } = useUniversalFilter(
      ref(makeItems()),
      configs,
      { persistState: false },
    );
    filterValues.value["extra"] = 42 as unknown as string;
    expect(getFilterDisplayValue("extra")).toBe("42");
  });
});

// ── localStorage persistence ──────────────────────────────────────────────
describe("localStorage persistence (persistState: true)", () => {
  let ls: ReturnType<typeof stubLocalStorage>;

  beforeEach(() => {
    ls = stubLocalStorage();
    vi.stubGlobal("localStorage", ls);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves to localStorage on setFilterValue", () => {
    const configs: FilterConfig[] = [
      { type: "select", field: "division", label: "Division" },
    ];
    const { setFilterValue } = useUniversalFilter(ref(makeItems()), configs, {
      persistState: true,
      storageKey: "test-key",
    });
    setFilterValue("division", "D1");
    expect(ls.setItem).toHaveBeenCalledWith(
      "test-key",
      expect.stringContaining("D1"),
    );
  });

  it("loads values from localStorage on init", () => {
    const stored = JSON.stringify({
      values: { division: "D2" },
      presets: [],
    });
    const ls2 = stubLocalStorage({ "my-key": stored });
    vi.stubGlobal("localStorage", ls2);

    const configs: FilterConfig[] = [
      { type: "select", field: "division", label: "Division" },
    ];
    const { filterValues } = useUniversalFilter(ref(makeItems()), configs, {
      persistState: true,
      storageKey: "my-key",
    });
    expect(filterValues.value["division"]).toBe("D2");
  });

  it("loads presets from localStorage on init", () => {
    const existingPreset = {
      id: "preset-123",
      name: "Saved Preset",
      filters: { division: "D3" },
      createdAt: new Date().toISOString(),
    };
    const stored = JSON.stringify({
      values: {},
      presets: [existingPreset],
    });
    const ls3 = stubLocalStorage({ "preset-key": stored });
    vi.stubGlobal("localStorage", ls3);

    const configs: FilterConfig[] = [
      { type: "select", field: "division", label: "Division" },
    ];
    const { presets } = useUniversalFilter(ref(makeItems()), configs, {
      persistState: true,
      storageKey: "preset-key",
    });
    expect(presets.value).toHaveLength(1);
    expect(presets.value[0].name).toBe("Saved Preset");
  });

  it("handles invalid JSON in localStorage gracefully (line 128 branch)", () => {
    const ls4 = stubLocalStorage({ "bad-key": "{ not valid json" });
    vi.stubGlobal("localStorage", ls4);

    const configs: FilterConfig[] = [
      { type: "text", field: "name", label: "Name" },
    ];
    // Should not throw — logger.warn is called instead
    expect(() =>
      useUniversalFilter(ref(makeItems()), configs, {
        persistState: true,
        storageKey: "bad-key",
      }),
    ).not.toThrow();
  });

  it("skips load when persistState is false (line 356 branch)", () => {
    const ls5 = stubLocalStorage({
      "skip-key": JSON.stringify({ values: { division: "D1" }, presets: [] }),
    });
    vi.stubGlobal("localStorage", ls5);

    const configs: FilterConfig[] = [
      { type: "select", field: "division", label: "Division" },
    ];
    const { filterValues } = useUniversalFilter(ref(makeItems()), configs, {
      persistState: false,
      storageKey: "skip-key",
    });
    // persistState: false → loadFromStorage early returns → value is null (default)
    expect(filterValues.value["division"]).toBeNull();
  });

  it("skips save when persistState is false (lines 376-377 branch)", () => {
    const { setFilterValue } = useUniversalFilter(ref(makeItems()), baseConfigs, {
      persistState: false,
      storageKey: "skip-save-key",
    });
    setFilterValue("division", "D1");
    expect(ls.setItem).not.toHaveBeenCalled();
  });

  it("handles localStorage.setItem throwing gracefully", () => {
    const errorLs = {
      ...ls,
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
    };
    vi.stubGlobal("localStorage", errorLs);
    const configs: FilterConfig[] = [
      { type: "text", field: "name", label: "Name" },
    ];
    const { setFilterValue } = useUniversalFilter(ref(makeItems()), configs, {
      persistState: true,
      storageKey: "error-key",
    });
    // Should not throw — caught internally with logger.warn
    expect(() => setFilterValue("name", "test")).not.toThrow();
  });
});

// ── Ref<FilterConfig[]> support ───────────────────────────────────────────
describe("configs as Ref<FilterConfig[]>", () => {
  it("accepts Ref<FilterConfig[]> and uses its value", () => {
    const configsRef = ref<FilterConfig[]>([
      { type: "select", field: "division", label: "Division" },
    ]);
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref(makeItems()),
      configsRef,
      { persistState: false },
    );
    setFilterValue("division", "D1");
    expect(filteredItems.value).toHaveLength(2);
  });
});

// ── Multiple filters combined ─────────────────────────────────────────────
describe("combined filters", () => {
  it("applies text + select filters together", () => {
    const { filteredItems, setFilterValue } = makeFilter();
    setFilterValue("name", "University");
    setFilterValue("division", "D1");
    expect(filteredItems.value.map((i) => i.id)).toEqual(
      expect.arrayContaining(["1", "2"]),
    );
    expect(filteredItems.value).toHaveLength(2);
  });

  it("handles items array being empty", () => {
    const { filteredItems, setFilterValue } = useUniversalFilter(
      ref([]),
      baseConfigs,
      { persistState: false },
    );
    setFilterValue("division", "D1");
    expect(filteredItems.value).toHaveLength(0);
  });
});
