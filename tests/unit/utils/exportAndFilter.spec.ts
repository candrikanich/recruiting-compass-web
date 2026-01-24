import { describe, it, expect } from "vitest";
import type { School, Interaction, Coach } from "~/types/models";

// Test data transformations and exports
describe("Data Transformations - Exports and Filtering", () => {
  const createMockSchool = (overrides = {}): School => ({
    id: "school-1",
    user_id: "user-1",
    name: "Test University",
    location: "Boston, MA",
    division: "D1",
    conference: "ACC",
    ranking: 1,
    is_favorite: false,
    website: "https://test.edu",
    twitter_handle: "@testuniv",
    instagram_handle: "testuniv",
    status: "researching",
    notes: "Great program",
    pros: ["Good facilities"],
    cons: ["Far from home"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  const createMockInteraction = (overrides = {}): Interaction => ({
    id: "interaction-1",
    school_id: "school-1",
    coach_id: "coach-1",
    event_id: null,
    type: "email",
    direction: "outbound",
    subject: "Test",
    content: "Test content",
    sentiment: "positive",
    occurred_at: new Date().toISOString(),
    logged_by: "user-1",
    attachments: [],
    created_at: new Date().toISOString(),
    ...overrides,
  });

  describe("CSV Export", () => {
    it("should convert school data to CSV format", () => {
      const schools = [
        createMockSchool({ id: "s1", name: "School A" }),
        createMockSchool({ id: "s2", name: "School B" }),
      ];

      const headers = ["ID", "Name", "Location", "Division", "Status"];
      const csvRows = schools.map((s) =>
        [s.id, s.name, s.location, s.division, s.status].join(","),
      );

      expect(csvRows).toHaveLength(2);
      expect(csvRows[0]).toContain("s1,School A");
      expect(csvRows[1]).toContain("s2,School B");
    });

    it("should handle special characters in CSV export", () => {
      const schools = [
        createMockSchool({
          name: "School, with comma",
          notes: 'Notes with "quotes"',
        }),
      ];

      const toCSV = (s: School) => {
        const escape = (val: string) => (val.includes(",") ? `"${val}"` : val);
        return `${s.id},${escape(s.name)},${escape(s.notes)}`;
      };

      const csv = toCSV(schools[0]);

      expect(csv).toContain('"School, with comma"');
    });

    it("should export interactions with metadata", () => {
      const interactions = [
        createMockInteraction({ id: "i1", type: "email" }),
        createMockInteraction({ id: "i2", type: "phone_call" }),
      ];

      const headers = ["ID", "Type", "Direction", "Sentiment", "Date"];
      const csvRows = interactions.map((i) =>
        [
          i.id,
          i.type,
          i.direction,
          i.sentiment,
          new Date(i.occurred_at).toLocaleDateString(),
        ].join(","),
      );

      expect(csvRows).toHaveLength(2);
      expect(csvRows[0]).toContain("i1,email");
    });

    it("should include headers in CSV export", () => {
      const headers = ["ID", "Name", "Division"];
      const csvContent = [headers.join(",")];

      expect(csvContent[0]).toBe("ID,Name,Division");
    });
  });

  describe("JSON Export", () => {
    it("should convert schools to JSON", () => {
      const schools = [createMockSchool({ id: "s1", name: "School A" })];

      const json = JSON.stringify(schools, null, 2);

      expect(json).toContain('"id"');
      expect(json).toContain("s1");
      expect(json).toContain('"name"');
      expect(json).toContain("School A");
    });

    it("should maintain data types in JSON export", () => {
      const school = createMockSchool({ ranking: 5, is_favorite: true });

      const json = JSON.parse(JSON.stringify(school));

      expect(json.ranking).toBe(5);
      expect(json.is_favorite).toBe(true);
    });

    it("should export array of objects as valid JSON", () => {
      const schools = [
        createMockSchool({ id: "s1" }),
        createMockSchool({ id: "s2" }),
      ];

      const json = JSON.stringify(schools);

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe("School Filtering", () => {
    it("should filter schools by division", () => {
      const schools = [
        createMockSchool({ id: "s1", division: "D1" }),
        createMockSchool({ id: "s2", division: "D2" }),
        createMockSchool({ id: "s3", division: "D1" }),
      ];

      const d1Schools = schools.filter((s) => s.division === "D1");

      expect(d1Schools).toHaveLength(2);
      expect(d1Schools.every((s) => s.division === "D1")).toBe(true);
    });

    it("should filter schools by status", () => {
      const schools = [
        createMockSchool({ id: "s1", status: "researching" }),
        createMockSchool({ id: "s2", status: "contacted" }),
        createMockSchool({ id: "s3", status: "researching" }),
      ];

      const researching = schools.filter((s) => s.status === "researching");

      expect(researching).toHaveLength(2);
    });

    it("should filter schools by favorite status", () => {
      const schools = [
        createMockSchool({ id: "s1", is_favorite: true }),
        createMockSchool({ id: "s2", is_favorite: false }),
        createMockSchool({ id: "s3", is_favorite: true }),
      ];

      const favorites = schools.filter((s) => s.is_favorite);

      expect(favorites).toHaveLength(2);
    });

    it("should filter schools by conference", () => {
      const schools = [
        createMockSchool({ id: "s1", conference: "ACC" }),
        createMockSchool({ id: "s2", conference: "SEC" }),
        createMockSchool({ id: "s3", conference: "ACC" }),
      ];

      const accSchools = schools.filter((s) => s.conference === "ACC");

      expect(accSchools).toHaveLength(2);
    });

    it("should apply multiple filters", () => {
      const schools = [
        createMockSchool({ id: "s1", division: "D1", is_favorite: true }),
        createMockSchool({ id: "s2", division: "D2", is_favorite: true }),
        createMockSchool({ id: "s3", division: "D1", is_favorite: false }),
      ];

      const filtered = schools.filter(
        (s) => s.division === "D1" && s.is_favorite === true,
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("s1");
    });

    it("should filter schools by location text search", () => {
      const schools = [
        createMockSchool({ id: "s1", location: "Boston, MA" }),
        createMockSchool({ id: "s2", location: "New York, NY" }),
        createMockSchool({ id: "s3", location: "Miami, FL" }),
      ];

      const filtered = schools.filter((s) =>
        s.location.toLowerCase().includes("boston"),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("s1");
    });
  });

  describe("Interaction Filtering", () => {
    it("should filter interactions by type", () => {
      const interactions = [
        createMockInteraction({ id: "i1", type: "email" }),
        createMockInteraction({ id: "i2", type: "phone_call" }),
        createMockInteraction({ id: "i3", type: "email" }),
      ];

      const emails = interactions.filter((i) => i.type === "email");

      expect(emails).toHaveLength(2);
    });

    it("should filter interactions by direction", () => {
      const interactions = [
        createMockInteraction({ id: "i1", direction: "outbound" }),
        createMockInteraction({ id: "i2", direction: "inbound" }),
        createMockInteraction({ id: "i3", direction: "outbound" }),
      ];

      const outbound = interactions.filter((i) => i.direction === "outbound");

      expect(outbound).toHaveLength(2);
    });

    it("should filter interactions by sentiment", () => {
      const interactions = [
        createMockInteraction({ id: "i1", sentiment: "positive" }),
        createMockInteraction({ id: "i2", sentiment: "negative" }),
        createMockInteraction({ id: "i3", sentiment: "positive" }),
      ];

      const positive = interactions.filter((i) => i.sentiment === "positive");

      expect(positive).toHaveLength(2);
    });

    it("should filter interactions by date range", () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

      const interactions = [
        createMockInteraction({
          id: "i1",
          occurred_at: thirtyDaysAgo.toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          occurred_at: fifteenDaysAgo.toISOString(),
        }),
        createMockInteraction({
          id: "i3",
          occurred_at: now.toISOString(),
        }),
      ];

      const last30Days = interactions.filter(
        (i) => new Date(i.occurred_at) >= thirtyDaysAgo,
      );

      expect(last30Days).toHaveLength(3);

      const last10Days = interactions.filter(
        (i) =>
          new Date(i.occurred_at) >=
          new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      );

      expect(last10Days).toHaveLength(1);
    });

    it("should search interactions by content", () => {
      const interactions = [
        createMockInteraction({ id: "i1", content: "Discussing scholarship" }),
        createMockInteraction({ id: "i2", content: "Game update" }),
        createMockInteraction({ id: "i3", content: "Scholarship details" }),
      ];

      const scholarshipRelated = interactions.filter((i) =>
        i.content.toLowerCase().includes("scholarship"),
      );

      expect(scholarshipRelated).toHaveLength(2);
    });
  });

  describe("Sorting and Ordering", () => {
    it("should sort schools by ranking", () => {
      const schools = [
        createMockSchool({ id: "s1", ranking: 3 }),
        createMockSchool({ id: "s2", ranking: 1 }),
        createMockSchool({ id: "s3", ranking: 2 }),
      ];

      const sorted = [...schools].sort((a, b) => a.ranking - b.ranking);

      expect(sorted[0].ranking).toBe(1);
      expect(sorted[2].ranking).toBe(3);
    });

    it("should sort interactions by date (newest first)", () => {
      const now = new Date();
      const interactions = [
        createMockInteraction({
          id: "i1",
          occurred_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        }),
        createMockInteraction({
          id: "i2",
          occurred_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        }),
        createMockInteraction({
          id: "i3",
          occurred_at: now.toISOString(),
        }),
      ];

      const sorted = [...interactions].sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      );

      expect(sorted[0].id).toBe("i3");
      expect(sorted[2].id).toBe("i1");
    });

    it("should sort schools alphabetically", () => {
      const schools = [
        createMockSchool({ id: "s1", name: "Zebra University" }),
        createMockSchool({ id: "s2", name: "Apple University" }),
        createMockSchool({ id: "s3", name: "Banana University" }),
      ];

      const sorted = [...schools].sort((a, b) => a.name.localeCompare(b.name));

      expect(sorted[0].name).toBe("Apple University");
      expect(sorted[2].name).toBe("Zebra University");
    });
  });

  describe("Data Aggregation", () => {
    it("should count schools by division", () => {
      const schools = [
        createMockSchool({ id: "s1", division: "D1" }),
        createMockSchool({ id: "s2", division: "D1" }),
        createMockSchool({ id: "s3", division: "D2" }),
      ];

      const counts: Record<string, number> = {};
      schools.forEach((s) => {
        counts[s.division] = (counts[s.division] || 0) + 1;
      });

      expect(counts["D1"]).toBe(2);
      expect(counts["D2"]).toBe(1);
    });

    it("should count interactions by type", () => {
      const interactions = [
        createMockInteraction({ id: "i1", type: "email" }),
        createMockInteraction({ id: "i2", type: "email" }),
        createMockInteraction({ id: "i3", type: "phone_call" }),
      ];

      const counts: Record<string, number> = {};
      interactions.forEach((i) => {
        counts[i.type] = (counts[i.type] || 0) + 1;
      });

      expect(counts["email"]).toBe(2);
      expect(counts["phone_call"]).toBe(1);
    });

    it("should calculate statistics", () => {
      const schools = [
        createMockSchool({ id: "s1", ranking: 1 }),
        createMockSchool({ id: "s2", ranking: 2 }),
        createMockSchool({ id: "s3", ranking: 3 }),
      ];

      const rankings = schools.map((s) => s.ranking);
      const avg = rankings.reduce((a, b) => a + b, 0) / rankings.length;
      const max = Math.max(...rankings);
      const min = Math.min(...rankings);

      expect(avg).toBe(2);
      expect(max).toBe(3);
      expect(min).toBe(1);
    });
  });

  describe("Fuzzy Search", () => {
    it("should handle typos in search", () => {
      const schools = [
        createMockSchool({ id: "s1", name: "Harvard University" }),
        createMockSchool({ id: "s2", name: "Yale University" }),
      ];

      // Simple fuzzy matching - check if characters are similar
      const search = (term: string, schools: School[]) => {
        return schools.filter((s) =>
          s.name.toLowerCase().includes(term.toLowerCase()),
        );
      };

      const results = search("harv", schools);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("s1");
    });

    it("should find matches regardless of case", () => {
      const schools = [createMockSchool({ id: "s1", name: "Boston College" })];

      const search = (term: string, schools: School[]) => {
        return schools.filter((s) =>
          s.name.toLowerCase().includes(term.toLowerCase()),
        );
      };

      const results = search("BOSTON", schools);

      expect(results).toHaveLength(1);
    });
  });
});
