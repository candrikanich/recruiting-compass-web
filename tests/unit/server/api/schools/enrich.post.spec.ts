import { describe, it, expect, vi, beforeEach } from "vitest";

const TEST_UUID = "44444444-4444-4444-4444-444444444444";

const scorecardMatch = {
  id: 42,
  "school.name": "Test University",
  "school.state": "GA",
  "school.city": "Testville",
  "latest.student.size": 10000,
  "latest.admissions.admission_rate.overall": 0.5,
  "latest.admissions.sat_scores.25th_percentile.critical_reading": 500,
  "latest.admissions.sat_scores.75th_percentile.critical_reading": 600,
  "latest.admissions.sat_scores.25th_percentile.math": 500,
  "latest.admissions.sat_scores.75th_percentile.math": 600,
  "latest.admissions.act_scores.25th_percentile.cumulative": 22,
  "latest.admissions.act_scores.75th_percentile.cumulative": 28,
  "latest.cost.tuition.in_state": 10000,
  "latest.cost.tuition.out_of_state": 25000,
};

const scorecard = vi.hoisted(() => ({
  searchCollegeScorecard: vi.fn(),
  scorecardToAcademicInfo: vi.fn(),
}));

const metadataLookup = vi.hoisted(() => ({
  lookupSchoolMetadata: vi.fn(),
}));

// ── Supabase chain state ────────────────────────────────────────────────────
const mockFamilyMembersSingle = vi.fn();
const mockSchoolsSingle = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

const mockClientFrom = vi.fn((table: string) => {
  if (table === "family_members") {
    return {
      select: () => ({ eq: () => ({ single: mockFamilyMembersSingle }) }),
    };
  }
  if (table === "schools") {
    return {
      select: () => ({
        eq: () => ({ eq: () => ({ single: mockSchoolsSingle }) }),
      }),
      update: mockUpdate,
    };
  }
  throw new Error(`Unexpected table: ${table}`);
});
const mockClient = { from: mockClientFrom };

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => mockClient),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "user-id" }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/validation", () => ({
  requireUuidParam: vi.fn(() => TEST_UUID),
}));

vi.mock("~/server/utils/collegeScorecard", () => ({
  searchCollegeScorecard: scorecard.searchCollegeScorecard,
  scorecardToAcademicInfo: scorecard.scorecardToAcademicInfo,
}));

vi.mock("~/server/utils/schoolMetadataLookup", () => ({
  lookupSchoolMetadata: metadataLookup.lookupSchoolMetadata,
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(opts.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = opts.statusCode;
      return err;
    },
  };
});

import { readBody } from "h3";
import handler from "~/server/api/schools/[id]/enrich.post";

const mockEvent = {
  context: { params: { id: TEST_UUID } },
} as any;

describe("POST /api/schools/[id]/enrich (confirm step)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readBody).mockResolvedValue({ scorecardId: 42, confirmed: true });
    mockFamilyMembersSingle.mockResolvedValue({
      data: { family_unit_id: "family-1" },
      error: null,
    });
    scorecard.searchCollegeScorecard.mockResolvedValue({
      results: [scorecardMatch],
      total: 1,
    });
    scorecard.scorecardToAcademicInfo.mockReturnValue({
      studentSize: 10000,
      admissionRate: 0.5,
    });
    mockUpdateEq.mockResolvedValue({ error: null });
    metadataLookup.lookupSchoolMetadata.mockReturnValue({
      mascot: "Tigers",
      athleticsUrl: "https://testu.example/athletics",
      colors: ["#FF0000"],
      conferenceUrl: "https://secsports.com",
    });
  });

  it("null-fills mascot/colors/athletics_url when the school has none yet", async () => {
    mockSchoolsSingle.mockResolvedValue({
      data: {
        id: TEST_UUID,
        name: "Test University",
        academic_info: {},
        family_unit_id: "family-1",
        mascot: null,
        school_colors: null,
        athletics_url: null,
      },
      error: null,
    });

    const result = await handler(mockEvent);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        mascot: "Tigers",
        school_colors: ["#FF0000"],
        athletics_url: "https://testu.example/athletics",
      }),
    );

    expect(result.data).toMatchObject({
      mascot: "Tigers",
      colors: ["#FF0000"],
      athleticsUrl: "https://testu.example/athletics",
      conferenceUrl: "https://secsports.com",
    });
  });

  it("never overwrites existing mascot/colors, but null-fills athletics_url", async () => {
    mockSchoolsSingle.mockResolvedValue({
      data: {
        id: TEST_UUID,
        name: "Test University",
        academic_info: {},
        family_unit_id: "family-1",
        mascot: "User-Set Mascot",
        school_colors: ["#000000"],
        athletics_url: null,
      },
      error: null,
    });

    const result = await handler(mockEvent);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        mascot: "User-Set Mascot",
        school_colors: ["#000000"],
        athletics_url: "https://testu.example/athletics",
      }),
    );

    expect(result.data).toMatchObject({
      mascot: "User-Set Mascot",
      colors: ["#000000"],
      athleticsUrl: "https://testu.example/athletics",
    });
  });
});
