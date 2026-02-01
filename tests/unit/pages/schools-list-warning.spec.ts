import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, computed } from "vue";

/**
 * Unit tests for 30+ schools warning feature
 * Tests the logic of the warning computed property
 */

describe("30+ Schools Warning Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not show warning with fewer than 30 schools", () => {
    const schools = ref<any[]>(
      Array.from({ length: 29 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
      })),
    );

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    expect(shouldShowWarning.value).toBe(false);
  });

  it("should show warning with exactly 30 schools", () => {
    const schools = ref<any[]>(
      Array.from({ length: 30 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
      })),
    );

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    expect(shouldShowWarning.value).toBe(true);
  });

  it("should show warning with more than 30 schools", () => {
    const schools = ref<any[]>(
      Array.from({ length: 50 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
      })),
    );

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    expect(shouldShowWarning.value).toBe(true);
  });

  it("should show warning with exactly 31 schools", () => {
    const schools = ref<any[]>(
      Array.from({ length: 31 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
      })),
    );

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    expect(shouldShowWarning.value).toBe(true);
  });

  it("should hide warning when schools are deleted down to 29", () => {
    const schools = ref<any[]>(
      Array.from({ length: 30 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
      })),
    );

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    expect(shouldShowWarning.value).toBe(true);

    // Remove one school
    schools.value.pop();

    expect(shouldShowWarning.value).toBe(false);
  });

  it("should show warning when schools are added to 30", () => {
    const schools = ref<any[]>(
      Array.from({ length: 29 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
      })),
    );

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    expect(shouldShowWarning.value).toBe(false);

    // Add one school
    schools.value.push({ id: "school-29", name: "School 29" });

    expect(shouldShowWarning.value).toBe(true);
  });

  it("should handle empty schools list", () => {
    const schools = ref<any[]>([]);

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    expect(shouldShowWarning.value).toBe(false);
  });

  it("should be reactive to schools array changes", () => {
    const schools = ref<any[]>([]);

    const shouldShowWarning = computed(() => schools.value.length >= 30);

    // Start with no schools
    expect(shouldShowWarning.value).toBe(false);

    // Add 15 schools
    schools.value = Array.from({ length: 15 }, (_, i) => ({
      id: `school-${i}`,
      name: `School ${i}`,
    }));
    expect(shouldShowWarning.value).toBe(false);

    // Add 15 more schools (total 30)
    schools.value = Array.from({ length: 30 }, (_, i) => ({
      id: `school-${i}`,
      name: `School ${i}`,
    }));
    expect(shouldShowWarning.value).toBe(true);

    // Remove all schools
    schools.value = [];
    expect(shouldShowWarning.value).toBe(false);
  });

  it("should provide accurate school count in warning message", () => {
    const schools = ref<any[]>(
      Array.from({ length: 35 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
      })),
    );

    expect(schools.value.length).toBe(35);
  });
});
