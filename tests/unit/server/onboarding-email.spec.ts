import { describe, it, expect } from "vitest";

describe("renderOnboardingNudgeEmail", () => {
  it("renders HTML with user name and incomplete items", async () => {
    const { renderOnboardingNudgeEmail } = await import(
      "~/server/utils/onboardingEmail"
    );
    const html = renderOnboardingNudgeEmail({
      userName: "Chris",
      completedCount: 2,
      totalCount: 8,
      topIncompleteItems: [
        {
          label: "Explore recommended schools",
          link: "https://app.example.com/schools",
        },
        {
          label: "Complete your academics",
          link: "https://app.example.com/settings/player-details?tab=academics",
        },
      ],
      dashboardUrl: "https://app.example.com/dashboard",
    });
    expect(html).toContain("Chris");
    expect(html).toContain("2 of 8");
    expect(html).toContain("Explore recommended schools");
    expect(html).toContain("Complete your academics");
    expect(html).toContain("https://app.example.com/dashboard");
  });
});
