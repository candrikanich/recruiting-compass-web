import { describe, it, expect } from "vitest";
import {
  generateRecruitingPacketHTML,
  generatePacketFilename,
  getRecruitingPacketStyles,
  type RecruitingPacketData,
  type AthletePacketData,
  type SchoolPacketData,
} from "~/utils/recruitingPacketExport";

describe("recruitingPacketExport", () => {
  describe("generatePacketFilename", () => {
    it("should generate valid filename with athlete name", () => {
      const filename = generatePacketFilename("John Smith");
      expect(filename).toBe("John_Smith_RecruitingPacket.pdf");
    });

    it("should handle names with special characters", () => {
      const filename = generatePacketFilename("María José O'Connor");
      expect(filename).toBe("Mara_Jos_OConnor_RecruitingPacket.pdf");
    });

    it("should handle multiple spaces in names", () => {
      const filename = generatePacketFilename("John   Michael   Smith");
      expect(filename).toBe("John_Michael_Smith_RecruitingPacket.pdf");
    });

    it("should trim whitespace", () => {
      const filename = generatePacketFilename("  John Smith  ");
      expect(filename).toBe("John_Smith_RecruitingPacket.pdf");
    });

    it("should not include date in filename", () => {
      const filename = generatePacketFilename("John");
      expect(filename).toBe("John_RecruitingPacket.pdf");
      expect(filename).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("getRecruitingPacketStyles", () => {
    it("should return CSS string", () => {
      const styles = getRecruitingPacketStyles();
      expect(typeof styles).toBe("string");
      expect(styles.length).toBeGreaterThan(100);
    });

    it("should include page styling", () => {
      const styles = getRecruitingPacketStyles();
      expect(styles).toContain(".page");
      expect(styles).toContain("page-break-after");
    });

    it("should include print optimizations", () => {
      const styles = getRecruitingPacketStyles();
      expect(styles).toContain("@media print");
      expect(styles).toContain(".no-print");
    });

    it("should include professional color scheme", () => {
      const styles = getRecruitingPacketStyles();
      expect(styles).toContain("#1e293b");
      expect(styles).toContain("#3b82f6");
    });

    it("should include table styling", () => {
      const styles = getRecruitingPacketStyles();
      expect(styles).toContain("table");
      expect(styles).toContain("thead");
      expect(styles).toContain("tbody");
    });

    it("should include badge styles", () => {
      const styles = getRecruitingPacketStyles();
      expect(styles).toContain(".badge");
      expect(styles).toContain(".badge-green");
      expect(styles).toContain(".badge-blue");
    });
  });

  describe("generateRecruitingPacketHTML", () => {
    const mockAthlete: AthletePacketData = {
      id: "test-id",
      email: "athlete@example.com",
      full_name: "John Smith",
      profile_photo_url: "https://example.com/photo.jpg",
      height: "6'2\"",
      weight: "190 lbs",
      position: "Pitcher",
      high_school: "Central High School",
      graduation_year: 2024,
      gpa: 3.8,
      sat_score: 1450,
      act_score: 33,
      video_links: [
        {
          platform: "hudl",
          url: "https://hudl.com/video",
          title: "Game Highlights",
        },
      ],
      social_media: [
        {
          platform: "instagram",
          handle: "johnsmith_pitcher",
        },
      ],
      core_courses: ["AP Calculus", "AP Chemistry", "English Honors"],
    };

    const mockSchools = {
      tier_a: [
        {
          id: "school-1",
          name: "University of Texas",
          location: "Austin, TX",
          division: "D1",
          conference: "Big 12",
          status: "offer_received" as const,
          fitScore: 92,
          coachCount: 3,
          interactionCount: 15,
        },
      ],
      tier_b: [
        {
          id: "school-2",
          name: "Rice University",
          location: "Houston, TX",
          division: "D1",
          conference: "Conference USA",
          status: "camp_invite" as const,
          fitScore: 85,
          coachCount: 2,
          interactionCount: 8,
        },
      ],
      tier_c: [
        {
          id: "school-3",
          name: "Texas State University",
          location: "San Marcos, TX",
          division: "D1",
          conference: "Sun Belt",
          status: "contacted" as const,
          fitScore: 72,
          coachCount: 1,
          interactionCount: 3,
        },
      ],
    };

    const mockSummary = {
      totalSchools: 3,
      totalInteractions: 26,
      recentContact: new Date("2024-01-15"),
      interactionBreakdown: {
        emails: 12,
        calls: 5,
        camps: 4,
        visits: 3,
        other: 2,
      },
    };

    const mockData: RecruitingPacketData = {
      athlete: mockAthlete,
      schools: mockSchools,
      activitySummary: mockSummary,
    };

    it("should generate valid HTML structure", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });

    it("should include CSS styles", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("<style>");
      expect(html).toContain(".page");
      expect(html).toContain(".cover-page");
    });

    it("should include athlete name", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("John Smith");
    });

    it("should include athlete position", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Pitcher");
    });

    it("should include high school and graduation year", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Central High School");
      expect(html).toContain("2024");
    });

    it("should include cover page with profile photo", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("cover-page");
      expect(html).toContain("https://example.com/photo.jpg");
    });

    it("should include athlete stats (height, weight, GPA)", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("6'2\"");
      expect(html).toContain("190 lbs");
      expect(html).toContain("3.8");
    });

    it("should include contact information section", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Contact Information");
      expect(html).toContain("athlete@example.com");
    });

    it("should include academic information", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Academic Information");
      expect(html).toContain("GPA");
      expect(html).toContain("SAT");
      expect(html).toContain("ACT");
      expect(html).toContain("1450");
      expect(html).toContain("33");
    });

    it("should include video links", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Video Links");
      expect(html).toContain("hudl");
      expect(html).toContain("https://hudl.com/video");
    });

    it("should include core courses", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Core Courses");
      expect(html).toContain("AP Calculus");
      expect(html).toContain("AP Chemistry");
    });

    it("should include schools section", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Schools of Interest");
      expect(html).toContain("Priority A");
      expect(html).toContain("Priority B");
      expect(html).toContain("Priority C");
    });

    it("should list all schools by tier", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("University of Texas");
      expect(html).toContain("Rice University");
      expect(html).toContain("Texas State University");
    });

    it("should include school details in table", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Austin, TX");
      expect(html).toContain("Big 12");
      expect(html).toContain("D1");
    });

    it("should include activity summary section", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Activity Summary");
      expect(html).toContain("Total Schools");
      expect(html).toContain("Total Interactions");
    });

    it("should include interaction breakdown", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Interaction Breakdown");
      expect(html).toContain("Emails");
      expect(html).toContain("Calls");
      expect(html).toContain("Camps");
      expect(html).toContain("Visits");
    });

    it("should include correct interaction counts", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain(">12<");
      expect(html).toContain(">5<");
      expect(html).toContain(">4<");
      expect(html).toContain(">3<");
    });

    it("should include generation date in footer", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("Generated on");
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      expect(html).toContain(today);
    });

    it("should include print button (no-print class)", () => {
      const html = generateRecruitingPacketHTML(mockData);
      expect(html).toContain("no-print");
      expect(html).toContain("window.print()");
      expect(html).toContain("Download as PDF");
    });
  });

  describe("generateRecruitingPacketHTML - Edge Cases", () => {
    it("should handle missing profile photo", () => {
      const athleteWithoutPhoto: AthletePacketData = {
        full_name: "John Smith",
        email: "test@example.com",
      };

      const data: RecruitingPacketData = {
        athlete: athleteWithoutPhoto,
        schools: { tier_a: [], tier_b: [], tier_c: [] },
        activitySummary: {
          totalSchools: 0,
          totalInteractions: 0,
          interactionBreakdown: {
            emails: 0,
            calls: 0,
            camps: 0,
            visits: 0,
            other: 0,
          },
        },
      };

      const html = generateRecruitingPacketHTML(data);
      expect(html).toContain("profile-photo");
      expect(html).not.toContain("undefined");
    });

    it("should handle missing video links", () => {
      const athleteWithoutVideos: AthletePacketData = {
        full_name: "John Smith",
        email: "test@example.com",
      };

      const data: RecruitingPacketData = {
        athlete: athleteWithoutVideos,
        schools: { tier_a: [], tier_b: [], tier_c: [] },
        activitySummary: {
          totalSchools: 0,
          totalInteractions: 0,
          interactionBreakdown: {
            emails: 0,
            calls: 0,
            camps: 0,
            visits: 0,
            other: 0,
          },
        },
      };

      const html = generateRecruitingPacketHTML(data);
      expect(html).not.toContain("<h2>Video Links</h2>");
    });

    it("should handle empty schools", () => {
      const data: RecruitingPacketData = {
        athlete: { full_name: "John", email: "test@example.com" },
        schools: { tier_a: [], tier_b: [], tier_c: [] },
        activitySummary: {
          totalSchools: 0,
          totalInteractions: 0,
          interactionBreakdown: {
            emails: 0,
            calls: 0,
            camps: 0,
            visits: 0,
            other: 0,
          },
        },
      };

      const html = generateRecruitingPacketHTML(data);
      expect(html).toContain("Schools of Interest");
      expect(html).toContain("0");
    });

    it("should handle minimal athlete data", () => {
      const minimalAthlete: AthletePacketData = {
        full_name: "John",
        email: "test@example.com",
      };

      const data: RecruitingPacketData = {
        athlete: minimalAthlete,
        schools: { tier_a: [], tier_b: [], tier_c: [] },
        activitySummary: {
          totalSchools: 0,
          totalInteractions: 0,
          interactionBreakdown: {
            emails: 0,
            calls: 0,
            camps: 0,
            visits: 0,
            other: 0,
          },
        },
      };

      const html = generateRecruitingPacketHTML(data);
      expect(html).toContain("John");
      expect(html).toContain("<!DOCTYPE html>");
    });
  });
});
