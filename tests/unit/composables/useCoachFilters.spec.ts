import { describe, it, expect } from "vitest";
import { useCoachFilters } from "~/composables/useCoachFilters";
import type { Coach } from "~/types";

describe("composables/useCoachFilters", () => {
  const createMockCoach = (overrides = {}): Coach => ({
    id: "coach-1",
    school_id: "school-1",
    user_id: "user-1",
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john@test.edu",
    phone: "555-1234",
    twitter_handle: "@coach",
    instagram_handle: "coach",
    notes: null,
    responsiveness_score: 85,
    last_contact_date: "2024-01-15",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const { filterBySearch, filterByRole, sortCoaches, applyFiltersAndSort } =
    useCoachFilters();

  describe("filterBySearch", () => {
    it("should return all coaches when query is empty", () => {
      const coaches = [createMockCoach(), createMockCoach({ id: "coach-2" })];
      const result = filterBySearch(coaches, "");

      expect(result).toEqual(coaches);
    });

    it("should filter by first name", () => {
      const coaches = [
        createMockCoach({
          id: "coach-1",
          first_name: "John",
          email: "john@test.edu",
        }),
        createMockCoach({
          id: "coach-2",
          first_name: "Jane",
          email: "jane@test.edu",
        }),
      ];
      const result = filterBySearch(coaches, "john");

      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe("John");
    });

    it("should filter by last name", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", last_name: "Smith" }),
        createMockCoach({ id: "coach-2", last_name: "Doe" }),
      ];
      const result = filterBySearch(coaches, "smith");

      expect(result).toHaveLength(1);
      expect(result[0].last_name).toBe("Smith");
    });

    it("should filter by email", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", email: "john@test.edu" }),
        createMockCoach({ id: "coach-2", email: "jane@test.edu" }),
      ];
      const result = filterBySearch(coaches, "john@test");

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("john@test.edu");
    });

    it("should filter by phone", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", phone: "555-1234" }),
        createMockCoach({ id: "coach-2", phone: "555-5678" }),
      ];
      const result = filterBySearch(coaches, "1234");

      expect(result).toHaveLength(1);
      expect(result[0].phone).toBe("555-1234");
    });

    it("should be case insensitive", () => {
      const coaches = [createMockCoach({ id: "coach-1", first_name: "John" })];
      const result = filterBySearch(coaches, "JOHN");

      expect(result).toHaveLength(1);
    });

    it("should handle null email", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", email: null }),
        createMockCoach({ id: "coach-2", email: "jane@test.edu" }),
      ];
      const result = filterBySearch(coaches, "jane");

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("jane@test.edu");
    });

    it("should handle null phone", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", phone: null }),
        createMockCoach({ id: "coach-2", phone: "555-5678" }),
      ];
      const result = filterBySearch(coaches, "555");

      expect(result).toHaveLength(1);
      expect(result[0].phone).toBe("555-5678");
    });
  });

  describe("filterByRole", () => {
    it("should return all coaches when role is empty", () => {
      const coaches = [
        createMockCoach({ role: "head" }),
        createMockCoach({ id: "coach-2", role: "assistant" }),
      ];
      const result = filterByRole(coaches, "");

      expect(result).toEqual(coaches);
    });

    it("should filter by head coach role", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", role: "head" }),
        createMockCoach({ id: "coach-2", role: "assistant" }),
        createMockCoach({ id: "coach-3", role: "recruiting" }),
      ];
      const result = filterByRole(coaches, "head");

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("head");
    });

    it("should filter by assistant role", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", role: "head" }),
        createMockCoach({ id: "coach-2", role: "assistant" }),
        createMockCoach({ id: "coach-3", role: "recruiting" }),
      ];
      const result = filterByRole(coaches, "assistant");

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("assistant");
    });

    it("should filter by recruiting role", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", role: "head" }),
        createMockCoach({ id: "coach-2", role: "assistant" }),
        createMockCoach({ id: "coach-3", role: "recruiting" }),
      ];
      const result = filterByRole(coaches, "recruiting");

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("recruiting");
    });
  });

  describe("sortCoaches", () => {
    it("should not mutate original array", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", first_name: "Charlie" }),
        createMockCoach({ id: "coach-2", first_name: "Alice" }),
      ];
      const original = [...coaches];

      sortCoaches(coaches, "name");

      expect(coaches).toEqual(original);
    });

    it("should sort by name (A-Z)", () => {
      const coaches = [
        createMockCoach({
          id: "coach-1",
          first_name: "Charlie",
          last_name: "Brown",
        }),
        createMockCoach({
          id: "coach-2",
          first_name: "Alice",
          last_name: "Anderson",
        }),
        createMockCoach({
          id: "coach-3",
          first_name: "Bob",
          last_name: "Johnson",
        }),
      ];
      const result = sortCoaches(coaches, "name");

      expect(result[0].first_name).toBe("Alice");
      expect(result[1].first_name).toBe("Bob");
      expect(result[2].first_name).toBe("Charlie");
    });

    it("should sort by last contact date (recent first)", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", last_contact_date: "2024-01-10" }),
        createMockCoach({ id: "coach-2", last_contact_date: "2024-01-20" }),
        createMockCoach({ id: "coach-3", last_contact_date: "2024-01-15" }),
      ];
      const result = sortCoaches(coaches, "lastContact");

      expect(result[0].id).toBe("coach-2"); // Most recent
      expect(result[1].id).toBe("coach-3");
      expect(result[2].id).toBe("coach-1"); // Oldest
    });

    it("should handle null last_contact_date in sorting", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", last_contact_date: "2024-01-15" }),
        createMockCoach({ id: "coach-2", last_contact_date: null }),
        createMockCoach({ id: "coach-3", last_contact_date: "2024-01-10" }),
      ];
      const result = sortCoaches(coaches, "lastContact");

      expect(result[0].id).toBe("coach-1"); // Has date
      expect(result[1].id).toBe("coach-3"); // Has date
      expect(result[2].id).toBe("coach-2"); // Null date (treated as 0)
    });

    it("should sort by responsiveness (highest first)", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", responsiveness_score: 60 }),
        createMockCoach({ id: "coach-2", responsiveness_score: 90 }),
        createMockCoach({ id: "coach-3", responsiveness_score: 40 }),
      ];
      const result = sortCoaches(coaches, "responsiveness");

      expect(result[0].responsiveness_score).toBe(90);
      expect(result[1].responsiveness_score).toBe(60);
      expect(result[2].responsiveness_score).toBe(40);
    });

    it("should handle null responsiveness_score", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", responsiveness_score: 60 }),
        createMockCoach({ id: "coach-2", responsiveness_score: null }),
        createMockCoach({ id: "coach-3", responsiveness_score: 90 }),
      ];
      const result = sortCoaches(coaches, "responsiveness");

      expect(result[0].id).toBe("coach-3"); // Highest score
      expect(result[1].id).toBe("coach-1"); // Middle score
      expect(result[2].id).toBe("coach-2"); // Null (treated as 0)
    });
  });

  describe("applyFiltersAndSort", () => {
    it("should apply all filters and sorting together", () => {
      const coaches = [
        createMockCoach({
          id: "coach-1",
          first_name: "John",
          email: "john@test.edu",
          role: "head",
          responsiveness_score: 80,
        }),
        createMockCoach({
          id: "coach-2",
          first_name: "Jane",
          email: "jane@test.edu",
          role: "assistant",
          responsiveness_score: 90,
        }),
        createMockCoach({
          id: "coach-3",
          first_name: "Bob",
          email: "bob@test.edu",
          role: "head",
          responsiveness_score: 70,
        }),
      ];

      const result = applyFiltersAndSort(
        coaches,
        "john",
        "head",
        "responsiveness",
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("coach-1");
    });

    it("should work with no filters", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", first_name: "Charlie" }),
        createMockCoach({ id: "coach-2", first_name: "Alice" }),
        createMockCoach({ id: "coach-3", first_name: "Bob" }),
      ];

      const result = applyFiltersAndSort(coaches, "", "", "name");

      expect(result).toHaveLength(3);
      expect(result[0].first_name).toBe("Alice");
      expect(result[1].first_name).toBe("Bob");
      expect(result[2].first_name).toBe("Charlie");
    });

    it("should handle empty results gracefully", () => {
      const coaches = [
        createMockCoach({ id: "coach-1", first_name: "John" }),
        createMockCoach({ id: "coach-2", first_name: "Jane" }),
      ];

      const result = applyFiltersAndSort(coaches, "Bob", "", "name");

      expect(result).toHaveLength(0);
    });
  });
});
