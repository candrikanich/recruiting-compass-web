import { describe, it, expect, vi, beforeEach } from "vitest";
import { hydrateAthleteFromPendingDetails } from "~/server/utils/hydrateAthleteProfile";

interface FakeState {
  playerPrefs: { data: Record<string, unknown> } | null;
  userRow: { date_of_birth: string | null } | null;
  playerUpsert: Record<string, unknown> | null;
  userUpdate: Record<string, unknown> | null;
  throwOnUserUpdate: boolean;
}

const state: FakeState = {
  playerPrefs: null,
  userRow: null,
  playerUpsert: null,
  userUpdate: null,
  throwOnUserUpdate: false,
};

const logger = { info: vi.fn(), warn: vi.fn() };

// Minimal chainable Supabase stub covering only the calls the util makes.
const supabase = {
  from(table: string) {
    if (table === "user_preferences") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: state.playerPrefs, error: null }),
            }),
          }),
        }),
        upsert: (payload: Record<string, unknown>) => {
          state.playerUpsert = payload;
          return Promise.resolve({ error: null });
        },
      };
    }
    if (table === "users") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: state.userRow, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          if (state.throwOnUserUpdate) throw new Error("age trigger rejected");
          state.userUpdate = payload;
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    }
    return {};
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeEach(() => {
  state.playerPrefs = null;
  state.userRow = null;
  state.playerUpsert = null;
  state.userUpdate = null;
  state.throwOnUserUpdate = false;
  logger.info.mockClear();
  logger.warn.mockClear();
});

const pending = {
  playerName: "Alex Johnson",
  playerDob: "2010-05-01",
  graduationYear: 2028,
  sport: "Soccer",
  position: "Midfielder",
};

describe("hydrateAthleteFromPendingDetails", () => {
  it("populates an empty athlete profile from staged parent data", async () => {
    await hydrateAthleteFromPendingDetails(
      supabase,
      "athlete-1",
      pending,
      logger,
    );
    expect(state.playerUpsert?.data).toMatchObject({
      graduation_year: 2028,
      primary_sport: "Soccer",
      primary_position: "Midfielder",
      positions: ["Midfielder"],
    });
    expect(state.userUpdate).toMatchObject({ date_of_birth: "2010-05-01" });
  });

  it("is player-authoritative: never overwrites values the player already set", async () => {
    state.playerPrefs = {
      data: { graduation_year: 2027, primary_sport: "Baseball" },
    };
    state.userRow = { date_of_birth: "2009-01-01" };

    await hydrateAthleteFromPendingDetails(
      supabase,
      "athlete-1",
      pending,
      logger,
    );

    // Existing player values preserved; only the empty position is filled.
    expect(state.playerUpsert?.data).toMatchObject({
      graduation_year: 2027,
      primary_sport: "Baseball",
      primary_position: "Midfielder",
    });
    // Player's own DOB wins → no user update.
    expect(state.userUpdate).toBeNull();
  });

  it("skips the preferences upsert entirely when nothing is empty", async () => {
    state.playerPrefs = {
      data: {
        graduation_year: 2027,
        primary_sport: "Baseball",
        primary_position: "Catcher",
        positions: ["Catcher"],
      },
    };
    await hydrateAthleteFromPendingDetails(
      supabase,
      "athlete-1",
      pending,
      logger,
    );
    expect(state.playerUpsert).toBeNull();
  });

  it("fails open: a throwing update is swallowed and logged, not rethrown", async () => {
    state.throwOnUserUpdate = true;
    await expect(
      hydrateAthleteFromPendingDetails(supabase, "athlete-1", pending, logger),
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("does no DOB update when staged details omit playerDob", async () => {
    await hydrateAthleteFromPendingDetails(
      supabase,
      "athlete-1",
      { ...pending, playerDob: undefined },
      logger,
    );
    expect(state.userUpdate).toBeNull();
  });
});
