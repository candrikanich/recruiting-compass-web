import { describe, it, expect } from "vitest";
// @ts-expect-error — plain .mjs script, no types
import { d1Urls } from "../../../scripts/check-ncaa-calendar-cycle.mjs";

describe("check-ncaa-calendar-cycle d1Urls", () => {
  const urls = d1Urls("2027-28") as { code: string; url: string }[];
  const byCode = Object.fromEntries(urls.map((u) => [u.code, u.url]));

  it("builds all 13 calendar URLs for a season", () => {
    expect(urls).toHaveLength(13);
    for (const code of [
      "MBA",
      "WSB",
      "MBB",
      "WBB",
      "XCTF",
      "WVB",
      "MGO",
      "MLA",
      "WLA",
      "FBS",
      "FCS",
      "Other",
      "D2_ALL",
    ]) {
      expect(byCode[code], code).toBeTruthy();
    }
  });

  it("uses the plain-hyphen filename for standard D1 codes", () => {
    expect(byCode.MBA).toBe(
      "https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar/2027-28/2027-28D1Rec_MBARecruitingCalendar.pdf",
    );
  });

  it("uses the FBS/FCS infix-less football filenames", () => {
    expect(byCode.FBS).toContain("2027-28D1Rec_FBSRecruitingCalendar.pdf");
    expect(byCode.FCS).toContain("2027-28D1Rec_FCSRecruitingCalendar.pdf");
  });

  it("uses the EN-DASH year in the Other-sports filename", () => {
    expect(byCode.Other).toBe(
      "https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar/2027-28/2027–28D1Rec_OtherRecruitingCalendar.pdf",
    );
    // and NOT the ASCII-hyphen form (which 404s on NCAA's bucket)
    expect(byCode.Other).not.toContain("2027-28D1Rec_Other");
  });

  it("uses the D2 combined all-sports filename", () => {
    expect(byCode.D2_ALL).toContain(
      "2027-28D2Rec_RecruitingCalendar_AllSports.pdf",
    );
  });
});
